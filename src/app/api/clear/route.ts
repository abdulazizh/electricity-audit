import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST() {
  try {
    await prisma.auditRecord.deleteMany({});
    await prisma.input.deleteMany({});
    await prisma.output.deleteMany({});
    await prisma.cobill.deleteMany({});
    await prisma.master.deleteMany({});
    await prisma.custType.deleteMany({});
    await prisma.codeRem.deleteMany({});
    await prisma.importedFile.deleteMany({});

    return NextResponse.json({ success: true, message: 'تم حذف جميع البيانات بنجاح' });
  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ أثناء الحذف' }, { status: 500 });
  }
}
