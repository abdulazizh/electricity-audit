import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as xlsx from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusCode = searchParams.get('statusCode');
    const enterName = searchParams.get('enterName');

    const where: Record<string, unknown> = {};
    if (statusCode) where.statusCode = parseInt(statusCode);
    if (enterName) where.enterName = enterName;

    const records = await prisma.auditRecord.findMany({
      where,
      orderBy: { statusCode: 'asc' }
    });

    if (records.length === 0) {
      return NextResponse.json({ success: false, error: 'لا توجد بيانات للتصدير' }, { status: 400 });
    }

    const data = records.map((r, idx) => ({
      'ت': idx + 1,
      'رقم الحساب': r.accountNo,
      'اسم المشترك': r.subscriberName || '',
      'القراءة الحالية': r.currentRead || '',
      'تاريخ الحالية': r.currentDate || '',
      'القراءة السابقة': r.prevRead || '',
      'تاريخ السابقة': r.prevDate || '',
      'الفرق': r.diff || '',
      'الأيام': r.days || '',
      'معدل يومي': r.dailyRate ? r.dailyRate.toFixed(2) : '',
      'رقم العداد': r.meterNo || '',
      'القطاع': r.sector || '',
      'نوع المشترك': r.custType || '',
      'الموظف': r.enterName || '',
      'الحالة': r.statusDesc,
      'رمز الحالة': r.statusCode
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'نتائج التدقيق');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="audit_results_${Date.now()}.xlsx"`
      }
    });

  } catch (error) {
    console.error('خطأ في التصدير:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء التصدير' }, { status: 500 });
  }
}
