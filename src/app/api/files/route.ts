import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// جلب قائمة الملفات
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (fileId) {
      // جلب ملف محدد مع هيكل جداوله
      const file = await prisma.importedFile.findUnique({
        where: { id: fileId },
        include: {
          data: {
            select: { tableName: true, rowIndex: true },
            distinct: ['tableName']
          }
        }
      });

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'الملف غير موجود' },
          { status: 404 }
        );
      }

      // جلب هيكل الجداول
      const schemas = await prisma.tableSchema.findMany({
        where: { fileId }
      });

      return NextResponse.json({
        success: true,
        file: {
          id: file.id,
          fileName: file.fileName,
          fileSize: file.fileSize,
          fileType: file.fileType,
          tables: file.tables,
          schemas: schemas.map(s => ({
            tableName: s.tableName,
            columns: s.columns,
            rowCount: s.rowCount
          })),
          createdAt: file.createdAt
        }
      });
    }

    // جلب جميع الملفات
    const files = await prisma.importedFile.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      files: files.map(f => ({
        id: f.id,
        fileName: f.fileName,
        fileSize: f.fileSize,
        fileType: f.fileType,
        tables: f.tables,
        createdAt: f.createdAt
      }))
    });

  } catch (error) {
    console.error('خطأ في جلب الملفات:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء جلب الملفات' },
      { status: 500 }
    );
  }
}

// حذف ملف
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'معرف الملف مطلوب' },
        { status: 400 }
      );
    }

    // حذف البيانات المرتبطة
    await prisma.importedData.deleteMany({
      where: { fileId }
    });

    await prisma.tableSchema.deleteMany({
      where: { fileId }
    });

    // حذف الملف
    await prisma.importedFile.delete({
      where: { id: fileId }
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف الملف بنجاح'
    });

  } catch (error) {
    console.error('خطأ في حذف الملف:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء حذف الملف' },
      { status: 500 }
    );
  }
}
