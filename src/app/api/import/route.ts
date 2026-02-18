import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as xlsx from 'xlsx';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import MDBReader from 'mdb-reader';

// زيادة حجم الجسم المسموح به للرفع
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// دالة تنسيق التاريخ
function formatDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return String(value);
}

// دالة تنسيق الأرقام
function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : Math.round(num);
}

function toFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tableType = formData.get('tableType') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'لم يتم رفع أي ملف' }, { status: 400 });
    }

    if (!tableType) {
      return NextResponse.json({ success: false, error: 'نوع الجدول مطلوب' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // حفظ الملف
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, `${Date.now()}_${file.name}`);
    await writeFile(filePath, buffer);

    let recordCount = 0;
    const fileName = file.name.toLowerCase();

    // إذا كان ملف Access
    if (fileName.endsWith('.mdb') || fileName.endsWith('.accdb')) {
      recordCount = await importAccessFile(buffer, tableType);
    } else {
      // قراءة ملف Excel/CSV
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      if (jsonData.length === 0) {
        return NextResponse.json({ success: false, error: 'الملف فارغ' }, { status: 400 });
      }

      recordCount = await importTable(jsonData, tableType);
    }

    // تسجيل الملف المستورد
    await prisma.importedFile.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        fileType: fileName.endsWith('.mdb') || fileName.endsWith('.accdb') ? 'access' : 'excel',
        tableType,
        recordCount
      }
    });

    return NextResponse.json({
      success: true,
      message: `تم استيراد ${recordCount.toLocaleString('ar-SA')} سجل من "${file.name}"`,
      recordCount
    });

  } catch (error) {
    console.error('خطأ في الاستيراد:', error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ أثناء الاستيراد: ' + (error instanceof Error ? error.message : 'خطأ غير معروف')
    }, { status: 500 });
  }
}

// استيراد ملف Access
async function importAccessFile(buffer: Buffer, tableType: string): Promise<number> {
  const mdbReader = new MDBReader(buffer);
  let totalRecords = 0;
  const importLog: string[] = [];

  // إذا كان tableType هو 'all' نستورد جميع الجداول (invest_db.mdb)
  if (tableType === 'all') {
    const tables = mdbReader.getTableNames();
    console.log('الجداول المكتشفة:', tables);

    for (const tableName of tables) {
      try {
        const table = mdbReader.getTable(tableName);
        const data = table.getData() as Record<string, unknown>[];

        console.log(`جدول ${tableName}: ${data.length} سجل`);

        if (data.length > 0) {
          const detectedType = detectTableType(tableName);
          console.log(`النوع المكتشف لـ ${tableName}: ${detectedType}`);

          if (detectedType) {
            const count = await importTable(data, detectedType);
            totalRecords += count;
            importLog.push(`${tableName} (${detectedType}): ${count} سجل`);
            console.log(`تم استيراد ${count} سجل من جدول ${tableName}`);
          }
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error(`خطأ في استيراد جدول ${tableName}:`, errorMsg);
        importLog.push(`${tableName}: خطأ - ${errorMsg}`);
      }
    }

    console.log('ملخص الاستيراد:', importLog.join(' | '));
  } else {
    // استيراد جدول محدد (inputz_db.mdb - جدول input فقط)
    const tableNames = mdbReader.getTableNames();
    console.log('الجداول في الملف:', tableNames);

    // البحث عن جدول input
    const targetTable = tableNames.find(t => t.toLowerCase() === 'input' || t.toLowerCase() === tableType.toLowerCase());

    if (targetTable) {
      const table = mdbReader.getTable(targetTable);
      const data = table.getData() as Record<string, unknown>[];
      console.log(`جدول ${targetTable}: ${data.length} سجل`);
      totalRecords = await importTable(data, 'input');
    } else {
      console.log(`لم يتم العثور على جدول input. الجداول المتاحة: ${tableNames.join(', ')}`);
    }
  }

  return totalRecords;
}

// تحديد نوع الجدول من اسمه
function detectTableType(tableName: string): string | null {
  const name = tableName.toLowerCase();
  if (name.includes('master')) return 'master';
  if (name.includes('input')) return 'input';
  if (name.includes('output')) return 'output';
  if (name.includes('cobill')) return 'cobill';
  if (name.includes('custtype')) return 'custtype';
  if (name.includes('codrem')) return 'codrem';
  return null;
}

// استيراد جدول
async function importTable(data: Record<string, unknown>[], tableType: string): Promise<number> {
  switch (tableType) {
    case 'master':
      return await importMaster(data);
    case 'input':
      return await importInput(data);
    case 'output':
      return await importOutput(data);
    case 'cobill':
      return await importCobill(data);
    case 'custtype':
      return await importCustType(data);
    case 'codrem':
      return await importCodeRem(data);
    default:
      return 0;
  }
}

// استيراد جدول Master
async function importMaster(data: Record<string, unknown>[]): Promise<number> {
  let count = 0;
  const errors: string[] = [];

  for (const row of data) {
    try {
      const accountNo = String(row['m_accountno'] || '');
      if (!accountNo) continue;

      // استخدام upsert لتحديث السجل إذا كان موجوداً
      await prisma.master.upsert({
        where: { accountNo },
        update: {
          // معلومات الحساب
          oldAccount: toFloat(row['m_oldacount']),
          oldAccountAgg: toFloat(row['m_oldacountagg']),
          accountNoBef: String(row['m_accountnobef'] || ''),
          accountOldCom: String(row['m_account_oldcom'] || ''),

          // الموقع
          region: toInt(row['m_region']),
          sect: toInt(row['m_sect']),
          state: toInt(row['m_state']),
          serial: toFloat(row['m_serial']),
          name: String(row['m_name'] || ''),
          phase: toInt(row['M_PHASE'] || row['m_phase']),
          houseNo: String(row['m_houseno'] || ''),
          address: String(row['m_address'] || ''),
          street: toFloat(row['m_street']),
          streetNo: toFloat(row['m_street_no']),
          houseNo2: String(row['m_house_no2'] || ''),
          address2: String(row['m_address2'] || ''),

          // معلومات المقياس
          meter: toFloat(row['m_meter']),
          meterDate: formatDate(row['m_meterdt']),
          facter: toInt(row['m_facter']),
          oldExch: formatDate(row['M_OLDEXCH']),
          fee: toFloat(row['M_FEE']),

          // معلومات الاشتراك
          outs: toFloat(row['m_outs']),
          cust: toFloat(row['m_cust']),
          custNew: toInt(row['m_custnew']),
          instalNo: toInt(row['m_instalno']),

          // القراءات
          lastRead: toFloat(row['m_lastread']),
          lastDate: formatDate(row['m_lastdt']),
          prevRead: toFloat(row['m_prevread']),
          prevDate: formatDate(row['m_prevdt']),
          billDate: formatDate(row['m_billdte']),
          def: toFloat(row['m_def']),

          // المدفوعات
          payment: toFloat(row['m_payment']),
          payDate: formatDate(row['m_paydt']),

          // معلومات إضافية
          out1517: toFloat(row['m_out1517']),
          badMtr: toFloat(row['m_badmtr']),
          note: String(row['m_note'] || ''),
          prevOuts: toFloat(row['m_prevouts']),

          // الاستهلاك الشهري
          consum1: toInt(row['M_CONSUM1']),
          period1: toInt(row['M_PERIOD1']),
          consum2: toInt(row['M_CONSUM2']),
          period2: toInt(row['M_PERIOD2']),
          consum3: toInt(row['M_CONSUM3']),
          period3: toInt(row['M_PERIOD3']),
          consum4: toInt(row['M_CONSUM4']),
          period4: toInt(row['M_PERIOD4']),
          consum5: toInt(row['M_CONSUM5']),
          period5: toInt(row['M_PERIOD5']),
          consum6: toInt(row['M_CONSUM6']),
          period6: toInt(row['M_PERIOD6']),
          consum7: toInt(row['M_CONSUM7']),
          period7: toInt(row['M_PERIOD7']),
          consum8: toInt(row['M_CONSUM8']),
          period8: toInt(row['M_PERIOD8']),
          consum9: toInt(row['M_CONSUM9']),
          period9: toInt(row['M_PERIOD9']),
          consum10: toInt(row['M_CONSUM10']),
          period10: toInt(row['M_PERIOD10']),
          consum11: toInt(row['M_CONSUM11']),
          period11: toInt(row['M_PERIOD11']),
          consum12: toInt(row['M_CONSUM12']),
          period12: toInt(row['M_PERIOD12']),

          // الديون
          outsBf: toFloat(row['m_outs_bf']),
          outsBef17: toFloat(row['m_outs_bef17']),

          // حقول إضافية
          avgConsum: toInt(row['m_avgconsum']),
          sector: toInt(row['m_sector']),
          overType: toFloat(row['m_overtype']),
          overTypeN: toInt(row['m_overtypen']),
        },
        create: {
          // معلومات الحساب
          accountNo,
          oldAccount: toFloat(row['m_oldacount']),
          oldAccountAgg: toFloat(row['m_oldacountagg']),
          accountNoBef: String(row['m_accountnobef'] || ''),
          accountOldCom: String(row['m_account_oldcom'] || ''),

          // الموقع
          region: toInt(row['m_region']),
          sect: toInt(row['m_sect']),
          state: toInt(row['m_state']),
          serial: toFloat(row['m_serial']),
          name: String(row['m_name'] || ''),
          phase: toInt(row['M_PHASE'] || row['m_phase']),
          houseNo: String(row['m_houseno'] || ''),
          address: String(row['m_address'] || ''),
          street: toFloat(row['m_street']),
          streetNo: toFloat(row['m_street_no']),
          houseNo2: String(row['m_house_no2'] || ''),
          address2: String(row['m_address2'] || ''),

          // معلومات المقياس
          meter: toFloat(row['m_meter']),
          meterDate: formatDate(row['m_meterdt']),
          facter: toInt(row['m_facter']),
          oldExch: formatDate(row['M_OLDEXCH']),
          fee: toFloat(row['M_FEE']),

          // معلومات الاشتراك
          outs: toFloat(row['m_outs']),
          cust: toFloat(row['m_cust']),
          custNew: toInt(row['m_custnew']),
          instalNo: toInt(row['m_instalno']),

          // القراءات
          lastRead: toFloat(row['m_lastread']),
          lastDate: formatDate(row['m_lastdt']),
          prevRead: toFloat(row['m_prevread']),
          prevDate: formatDate(row['m_prevdt']),
          billDate: formatDate(row['m_billdte']),
          def: toFloat(row['m_def']),

          // المدفوعات
          payment: toFloat(row['m_payment']),
          payDate: formatDate(row['m_paydt']),

          // معلومات إضافية
          out1517: toFloat(row['m_out1517']),
          badMtr: toFloat(row['m_badmtr']),
          note: String(row['m_note'] || ''),
          prevOuts: toFloat(row['m_prevouts']),

          // الاستهلاك الشهري
          consum1: toInt(row['M_CONSUM1']),
          period1: toInt(row['M_PERIOD1']),
          consum2: toInt(row['M_CONSUM2']),
          period2: toInt(row['M_PERIOD2']),
          consum3: toInt(row['M_CONSUM3']),
          period3: toInt(row['M_PERIOD3']),
          consum4: toInt(row['M_CONSUM4']),
          period4: toInt(row['M_PERIOD4']),
          consum5: toInt(row['M_CONSUM5']),
          period5: toInt(row['M_PERIOD5']),
          consum6: toInt(row['M_CONSUM6']),
          period6: toInt(row['M_PERIOD6']),
          consum7: toInt(row['M_CONSUM7']),
          period7: toInt(row['M_PERIOD7']),
          consum8: toInt(row['M_CONSUM8']),
          period8: toInt(row['M_PERIOD8']),
          consum9: toInt(row['M_CONSUM9']),
          period9: toInt(row['M_PERIOD9']),
          consum10: toInt(row['M_CONSUM10']),
          period10: toInt(row['M_PERIOD10']),
          consum11: toInt(row['M_CONSUM11']),
          period11: toInt(row['M_PERIOD11']),
          consum12: toInt(row['M_CONSUM12']),
          period12: toInt(row['M_PERIOD12']),

          // الديون
          outsBf: toFloat(row['m_outs_bf']),
          outsBef17: toFloat(row['m_outs_bef17']),

          // حقول إضافية
          avgConsum: toInt(row['m_avgconsum']),
          sector: toInt(row['m_sector']),
          overType: toFloat(row['m_overtype']),
          overTypeN: toInt(row['m_overtypen']),
        }
      });
      count++;
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      errors.push(errorMsg);
      if (errors.length <= 3) {
        console.error('خطأ في استيراد master:', errorMsg);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`إجمالي أخطاء master: ${errors.length}`);
  }

  return count;
}

// استيراد جدول Input
async function importInput(data: Record<string, unknown>[]): Promise<number> {
  let count = 0;
  for (const row of data) {
    try {
      await prisma.input.create({
        data: {
          accountNo: String(row['i_accountno'] || ''),
          type: toInt(row['I_type']),
          read: toInt(row['I_read']),
          readDate: formatDate(row['I_read_dt']),
          enterDate: formatDate(row['i_enterdte']),
          enterName: String(row['i_entername'] || ''),
          meter: toFloat(row['i_meter']),
          meterOld: toInt(row['i_meter_old']),
          amount: toInt(row['i_amount']),
          custCode: toInt(row['i_custcode']),
          sector: toFloat(row['i_sector']),
          endTime: String(row['i_end_time'] || ''),
        }
      });
      count++;
    } catch (e) {
      // تجاهل الأخطاء
    }
  }
  return count;
}

// استيراد جدول Output
async function importOutput(data: Record<string, unknown>[]): Promise<number> {
  let count = 0;
  for (const row of data) {
    try {
      await prisma.output.create({
        data: {
          accountNo: String(row['O_accountno'] || ''),
          name: String(row['O_name'] || ''),
          read: toInt(row['O_read']),
          readDate: formatDate(row['O_read_dt']),
          prevRead: toInt(row['O_prevread']),
          prevDate: formatDate(row['O_prevdt']),
          closeRead: toInt(row['O_close_read']),
          codeRemr: toInt(row['O_coderemr']),
          region: toInt(row['o_region']),
          sect: toInt(row['o_sect']),
          type: toInt(row['O_type']),
          serial: toInt(row['O_serial']),
          streetNo: toInt(row['O_streetno']),
          streetName: toInt(row['O_streetname']),
          houseNo: toInt(row['O_houseno']),
          address: String(row['O_address'] || ''),
          meter: toInt(row['O_meter']),
          oldMeter: toFloat(row['O_oldmeter']),
          facter: toInt(row['O_facter']),
          phase: toFloat(row['o_phase']),
          custCode: toInt(row['o_custcode']),
          cust: toInt(row['O_cust']),
          amount: toInt(row['o_amount']),
          amountBef: toInt(row['o_amount_bef']),
          amountAll: toInt(row['o_amount_all']),
          avgConsum: toFloat(row['O_avgconsum']),
          avgDt: formatDate(row['O_avgdt']),
          instalNo: toInt(row['O_instalno']),
          enterName: String(row['O_entername'] || ''),
          enterDate: formatDate(row['O_enterdte']),
          outs: toInt(row['o_outs']),
          sector: toInt(row['o_sector']),
          dailyCon: toInt(row['o_dailycon']),
          priod: toInt(row['o_priod']),
          billDate: formatDate(row['O_billdte']),
          meterType: String(row['o_mtype'] || ''),
        }
      });
      count++;
    } catch (e) {
      // تجاهل الأخطاء
    }
  }
  return count;
}

// استيراد جدول Cobill
async function importCobill(data: Record<string, unknown>[]): Promise<number> {
  let count = 0;
  for (const row of data) {
    try {
      await prisma.cobill.create({
        data: {
          accountNo: String(row['B_accountno'] || ''),
          name: String(row['B_name'] || ''),
          serialNo: toInt(row['B_serialno']),
          meterNo: toInt(row['B_meterno']),
          lastRead: toInt(row['B_lastread']),
          lastDate: formatDate(row['B_lastdt']),
          prevRead: toInt(row['B_prevread']),
          prevDate: formatDate(row['B_prevdt']),
          prevOuts: toInt(row['B_prevouts']),
          outs: toInt(row['B_outs']),
          billDate: formatDate(row['b_billdte']),
          avgConsum: toInt(row['B_avgconsum']),
          avgDt: formatDate(row['b_avgdt']),
          facter: toInt(row['b_facter']),
          cust: toInt(row['B_cust']),
          instalNo: toInt(row['b_instalno']),
          sector: toInt(row['b_sector']),
          region: toInt(row['b_region']),
          streetNo: toInt(row['b_streetno']),
          houseNo: String(row['b_houseno'] || ''),
          streetName: toInt(row['b_streetname']),
          address: String(row['B_address'] || ''),
          cons1: toInt(row['B_cons1']),
          conp1: toInt(row['B_conp1']),
          cons2: toInt(row['B_cons2']),
          conp2: toInt(row['B_conp2']),
          cons3: toInt(row['B_cons3']),
          conp3: toInt(row['B_conp3']),
          priod: toInt(row['B_priod']),
          meterType: String(row['b_type'] || ''),
        }
      });
      count++;
    } catch (e) {
      // تجاهل الأخطاء
    }
  }
  return count;
}

// استيراد جدول CustType
async function importCustType(data: Record<string, unknown>[]): Promise<number> {
  let count = 0;
  for (const row of data) {
    try {
      await prisma.custType.create({
        data: {
          code: toInt(row['c_custcode']) || 0,
          desc: String(row['c_custdesc'] || ''),
        }
      });
      count++;
    } catch (e) {
      // تجاهل الأخطاء
    }
  }
  return count;
}

// استيراد جدول CodeRem
async function importCodeRem(data: Record<string, unknown>[]): Promise<number> {
  let count = 0;
  for (const row of data) {
    try {
      await prisma.codeRem.create({
        data: {
          code: toInt(row['code']) || 0,
          desc: String(row['desc'] || ''),
        }
      });
      count++;
    } catch (e) {
      // تجاهل الأخطاء
    }
  }
  return count;
}

// جلب إحصائيات
export async function GET() {
  try {
    const stats = {
      master: await prisma.master.count(),
      input: await prisma.input.count(),
      output: await prisma.output.count(),
      cobill: await prisma.cobill.count(),
      custType: await prisma.custType.count(),
      codeRem: await prisma.codeRem.count(),
      auditRecords: await prisma.auditRecord.count(),
    };

    const files = await prisma.importedFile.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json({ success: true, stats, files });
  } catch (error) {
    console.error('خطأ في GET:', error);
    return NextResponse.json({ success: false, error: 'خطأ في جلب الإحصائيات: ' + (error instanceof Error ? error.message : '') }, { status: 500 });
  }
}
