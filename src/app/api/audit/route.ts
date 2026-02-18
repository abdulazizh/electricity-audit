import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// حالات التدقيق
const AUDIT_STATUS: Record<number, { desc: string; isAccepted: boolean; needsReview: boolean }> = {
  0: { desc: 'مقبول', isAccepted: true, needsReview: false },
  1: { desc: 'مجهول', isAccepted: false, needsReview: true },
  2: { desc: 'مرفوض', isAccepted: false, needsReview: true },
  3: { desc: 'مكرر', isAccepted: false, needsReview: true },
  4: { desc: 'خطأ في تاريخ الاشتراك', isAccepted: false, needsReview: true },
  5: { desc: 'مغلق', isAccepted: false, needsReview: true },
  6: { desc: 'عالي مرفوض', isAccepted: false, needsReview: true },
  7: { desc: 'عالي', isAccepted: false, needsReview: true },
  8: { desc: 'دورة', isAccepted: false, needsReview: true },
  9: { desc: 'لا يمكن نصب مقياس مع تقدير', isAccepted: false, needsReview: true },
  11: { desc: 'تساوي القراءات وتاريخها', isAccepted: false, needsReview: true },
  12: { desc: 'لا يوجد تاريخ لاحقة', isAccepted: false, needsReview: true },
  13: { desc: 'تاريخ اللاحقة أكبر من الإصدار', isAccepted: false, needsReview: true },
  14: { desc: 'تاريخ اللاحقة أقل من السابقة', isAccepted: false, needsReview: true },
  15: { desc: 'المقياس عاطل', isAccepted: false, needsReview: true },
  16: { desc: 'لا يوجد مقياس حقيقي', isAccepted: false, needsReview: true },
  17: { desc: 'الحساب تقدير', isAccepted: false, needsReview: true },
};

// تحويل تاريخ Excel إلى تاريخ مقروء
function formatExcelDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    // إذا كان نص، تحقق إن كان تاريخ ISO
    if (value.includes('-') || value.includes('/')) return value;
    // وإلا حاول تحويله كرقم
    const num = parseInt(value);
    if (!isNaN(num)) return excelSerialToDate(num);
    return value;
  }
  if (typeof value === 'number') {
    return excelSerialToDate(value);
  }
  return null;
}

function excelSerialToDate(serial: number): string | null {
  if (!serial || serial < 1) return null;
  try {
    // Excel serial date: days since January 1, 1900
    // Excel has a bug treating 1900 as leap year, so we adjust
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function calculateDays(date1: string | null, date2: string | null): number | null {
  if (!date1 || !date2) return null;
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    // نحسب الفرق بدون Math.abs لإرجاع قيمة سالبة إذا كان التاريخ الثاني أقل
    const diffTime = d2.getTime() - d1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

// حساب معدلات الاستهلاك الثلاثة (استهلاك / فترة)
function calculateConsumptionRates(master: {
  consum1: number | null;
  period1: number | null;
  consum2: number | null;
  period2: number | null;
  consum3: number | null;
  period3: number | null;
} | null | undefined): { rate1: number | null; rate2: number | null; rate3: number | null } {
  if (!master) return { rate1: null, rate2: null, rate3: null };
  
  // المعدل 1 = استهلاك 1 / فترة 1 (المعدل اليومي)
  const rate1 = (master.consum1 && master.period1 && master.period1 > 0) 
    ? master.consum1 / master.period1 
    : null;
  
  // المعدل 2 = استهلاك 2 / فترة 2
  const rate2 = (master.consum2 && master.period2 && master.period2 > 0) 
    ? master.consum2 / master.period2 
    : null;
  
  // المعدل 3 = استهلاك 3 / فترة 3
  const rate3 = (master.consum3 && master.period3 && master.period3 > 0) 
    ? master.consum3 / master.period3 
    : null;
  
  return { rate1, rate2, rate3 };
}

function determineStatus(
  currentRead: number | null,
  currentDate: string | null,
  prevRead: number | null,
  prevDate: string | null,
  diff: number | null,
  days: number | null,
  dailyRate: number | null
): { code: number; desc: string; isAccepted: boolean; needsReview: boolean; adjustedDiff: number | null; adjustedDailyRate: number | null } {
  
  let adjustedDiff = diff;
  let adjustedDailyRate = dailyRate;
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. التحقق من وجود البيانات الأساسية
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (!currentDate) return { code: 12, ...AUDIT_STATUS[12], adjustedDiff, adjustedDailyRate };
  if (currentRead === null || currentRead === undefined) return { code: 1, ...AUDIT_STATUS[1], adjustedDiff, adjustedDailyRate };
  if (prevRead === null || prevRead === undefined) return { code: 0, ...AUDIT_STATUS[0], adjustedDiff, adjustedDailyRate };
  if (!prevDate) return { code: 12, ...AUDIT_STATUS[12], adjustedDiff, adjustedDailyRate };
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. التحقق من التواريخ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const daysCalc = calculateDays(prevDate, currentDate);
  // إذا كان الأيام سالب، يعني تاريخ الحالية أقل من السابقة
  if (daysCalc !== null && daysCalc < 0) {
    return { code: 14, ...AUDIT_STATUS[14], adjustedDiff, adjustedDailyRate };
  }
  // تساوي القراءات وتاريخها
  if (currentRead === prevRead && daysCalc === 0) {
    return { code: 11, ...AUDIT_STATUS[11], adjustedDiff, adjustedDailyRate };
  }
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. التحقق من الدورة في العداد
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  let isCycle = false;
  if (diff !== null && diff < 0) {
    // الدورة: إضافة 99999 للفرق
    adjustedDiff = diff + 99999;
    isCycle = true;
    // إعادة حساب المعدل اليومي بالفرق المعدل
    if (days !== null && days > 0) {
      adjustedDailyRate = adjustedDiff / days;
    }
  }
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. التحقق من "عالي مرفوض" (المعدل اليومي > 300)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (adjustedDailyRate !== null && adjustedDailyRate > 300) {
    return { code: 6, ...AUDIT_STATUS[6], adjustedDiff, adjustedDailyRate };
  }
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. التحقق من "عالي" (المعدل اليومي > 150)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (adjustedDailyRate !== null && adjustedDailyRate > 150) {
    return { code: 7, ...AUDIT_STATUS[7], adjustedDiff, adjustedDailyRate };
  }
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. إذا كانت دورة بدون عالي/عالي مرفوض
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (isCycle) {
    return { code: 8, ...AUDIT_STATUS[8], adjustedDiff, adjustedDailyRate };
  }
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. لا يوجد أي مشكلة - مقبول
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return { code: 0, ...AUDIT_STATUS[0], adjustedDiff, adjustedDailyRate };
}

export async function POST() {
  try {
    await prisma.auditRecord.deleteMany({});

    const inputs = await prisma.input.findMany();
    const masters = await prisma.master.findMany();
    const outputs = await prisma.output.findMany();
    const custTypes = await prisma.custType.findMany();

    const masterMap = new Map(masters.map(m => [m.accountNo, m]));
    const outputMap = new Map(outputs.map(o => [o.accountNo, o]));
    const custTypeMap = new Map(custTypes.map(c => [c.code, c.desc]));

    let auditCount = 0;
    const auditRecords: Array<{
      accountNo: string;
      currentRead: number | null;
      currentDate: string | null;
      prevRead: number | null;
      prevDate: string | null;
      diff: number | null;
      days: number | null;
      dailyRate: number | null;
      rate1: number | null;
      rate2: number | null;
      rate3: number | null;
      subscriberName: string | null;
      meterNo: string | null;
      sector: number | null;
      region: number | null;
      custCode: number | null;
      custType: string | null;
      enterName: string | null;
      statusCode: number;
      statusDesc: string;
      isAccepted: boolean;
      needsReview: boolean;
    }> = [];

    for (const input of inputs) {
      const master = masterMap.get(input.accountNo);

      // القراءة الحالية من ملف القراءات (input) - القراءة الجديدة المدخلة
      const currentRead = input.read;
      const currentDate = formatExcelDate(input.readDate);

      // القراءة السابقة من الماستر - آخر قراءة مسجلة في النظام
      // prevRead في الماستر هو القراءة الأخيرة المسجلة
      const prevRead = master?.prevRead ?? null;
      const prevDate = formatExcelDate(master?.prevDate);

      // الفرق بين الحالية والسابقة (الاستهلاك)
      let diff = (currentRead !== null && prevRead !== null) ? currentRead - prevRead : null;
      const days = calculateDays(prevDate, currentDate);
      // المعدل اليومي الأولي (قد يكون سالباً في حالة الدورة)
      const dailyRate = (diff !== null && days !== null && days > 0) ? diff / days : null;
      
      // معدلات الاستهلاك الثلاثة السابقة
      const { rate1, rate2, rate3 } = calculateConsumptionRates(master);
      
      // صنف المشترك
      const custCode = input.custCode ?? master?.custCode ?? null;

      const status = determineStatus(currentRead, currentDate, prevRead, prevDate, diff, days, dailyRate);
      
      // استخدام القيم المعدلة من التدقيق
      const adjustedDiff = status.adjustedDiff;
      const adjustedDailyRate = status.adjustedDailyRate;

      auditRecords.push({
        accountNo: input.accountNo,
        currentRead,
        currentDate,
        prevRead,
        prevDate,
        diff: adjustedDiff,
        days,
        dailyRate: adjustedDailyRate,
        rate1,
        rate2,
        rate3,
        subscriberName: null, // تم حذف اسم المشترك
        meterNo: master?.meter?.toString() || null,
        sector: master?.sector ?? (input.sector as number) ?? null,
        region: master?.region ?? null,
        custCode: custCode,
        custType: custCode ? custTypeMap.get(custCode) || null : null,
        enterName: input.enterName,
        statusCode: status.code,
        statusDesc: status.desc,
        isAccepted: status.isAccepted,
        needsReview: status.needsReview,
      });

      if (auditRecords.length >= 100) {
        await prisma.auditRecord.createMany({ data: auditRecords });
        auditCount += auditRecords.length;
        auditRecords.length = 0;
      }
    }

    if (auditRecords.length > 0) {
      await prisma.auditRecord.createMany({ data: auditRecords });
      auditCount += auditRecords.length;
    }

    const stats = {
      total: auditCount,
      accepted: await prisma.auditRecord.count({ where: { statusCode: 0 } }),
      needsReview: await prisma.auditRecord.count({ where: { needsReview: true } }),
      high: await prisma.auditRecord.count({ where: { statusCode: 7 } }),
      highRejected: await prisma.auditRecord.count({ where: { statusCode: 6 } }),
      cycle: await prisma.auditRecord.count({ where: { statusCode: 8 } }),
    };

    return NextResponse.json({
      success: true,
      message: `تم تدقيق ${auditCount.toLocaleString('ar-SA')} قراءة`,
      stats
    });

  } catch (error) {
    console.error('خطأ في التدقيق:', error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ أثناء التدقيق: ' + (error instanceof Error ? error.message : 'خطأ غير معروف')
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const statusCode = searchParams.get('statusCode');
    const enterName = searchParams.get('enterName');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'statusCode';

    const where: Record<string, unknown> = {};
    
    // فلتر الحالة
    if (statusCode === 'needsReview') {
      where.needsReview = true;
    } else if (statusCode && statusCode !== 'all') {
      const code = parseInt(statusCode);
      if (!isNaN(code)) {
        where.statusCode = code;
      }
    }
    
    if (enterName) where.enterName = enterName;
    if (search) {
      where.OR = [
        { accountNo: { contains: search } }
      ];
    }

    // تحديد ترتيب الفرز
    let orderBy: Record<string, unknown> = { statusCode: 'asc' };
    if (sort === 'accountNo') orderBy = { accountNo: 'asc' };
    else if (sort === 'accountNo-desc') orderBy = { accountNo: 'desc' };
    else if (sort === 'prevRead') orderBy = { prevRead: 'asc' };
    else if (sort === 'prevRead-desc') orderBy = { prevRead: 'desc' };
    else if (sort === 'currentRead') orderBy = { currentRead: 'asc' };
    else if (sort === 'currentRead-desc') orderBy = { currentRead: 'desc' };
    else if (sort === 'dailyRate') orderBy = { dailyRate: 'desc' };
    else if (sort === 'dailyRate-desc') orderBy = { dailyRate: 'asc' };
    else if (sort === 'diff') orderBy = { diff: 'desc' };
    else if (sort === 'diff-desc') orderBy = { diff: 'asc' };
    else if (sort === 'days') orderBy = { days: 'desc' };
    else if (sort === 'days-desc') orderBy = { days: 'asc' };
    else if (sort === 'enterName') orderBy = { enterName: 'asc' };
    else if (sort === 'enterName-desc') orderBy = { enterName: 'desc' };
    else if (sort === 'statusCode-desc') orderBy = { statusCode: 'desc' };
    else orderBy = { statusCode: 'asc' };

    const total = await prisma.auditRecord.count({ where });
    const records = await prisma.auditRecord.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    });

    const employees = await prisma.auditRecord.groupBy({
      by: ['enterName'],
      where: { enterName: { not: null } },
      _count: true
    });

    return NextResponse.json({
      success: true,
      records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      filters: {
        employees: employees.filter(e => e.enterName).map(e => ({ name: e.enterName, count: e._count })),
        sectors: []
      }
    });

  } catch (error) {
    console.error('خطأ في جلب البيانات:', error);
    return NextResponse.json({ success: false, error: 'خطأ في جلب البيانات' }, { status: 500 });
  }
}
