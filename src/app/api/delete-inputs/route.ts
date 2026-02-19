import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST() {
  try {
    // حذف جميع القراءات المدخلة
    const result = await prisma.input.deleteMany({});
    
    // أيضاً حذف سجلات التدقيق المرتبطة
    await prisma.auditRecord.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `تم حذف ${result.count.toLocaleString('ar-SA')} قراءة`,
      deletedCount: result.count
    });

  } catch (error) {
    console.error('خطأ في حذف القراءات:', error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ أثناء حذف القراءات: ' + (error instanceof Error ? error.message : 'خطأ غير معروف')
    }, { status: 500 });
  }
}
