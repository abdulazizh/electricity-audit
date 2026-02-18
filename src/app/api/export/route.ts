import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const tableName = searchParams.get('tableName');
    const format = searchParams.get('format') || 'excel'; // excel أو csv

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'معرف الملف مطلوب' },
        { status: 400 }
      );
    }

    // جلب معلومات الملف
    const file = await prisma.importedFile.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'الملف غير موجود' },
        { status: 404 }
      );
    }

    // بناء شرط البحث
    const where: { fileId: string; tableName?: string } = { fileId };
    if (tableName) {
      where.tableName = tableName;
    }

    // جلب جميع البيانات
    const data = await prisma.importedData.findMany({
      where,
      orderBy: { rowIndex: 'asc' }
    });

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'لا توجد بيانات للتصدير' },
        { status: 400 }
      );
    }

    // تحويل البيانات إلى صفوف
    const rows = data.map(item => item.rowData as Record<string, unknown>);

    // إنشاء workbook جديد
    const workbook = xlsx.utils.book_new();
    
    if (tableName) {
      // تصدير جدول واحد
      const worksheet = xlsx.utils.json_to_sheet(rows);
      xlsx.utils.book_append_sheet(workbook, worksheet, tableName);
    } else {
      // تصدير جميع الجداول
      const tables = file.tables as { name: string }[];
      for (const table of tables) {
        const tableData = data.filter(d => d.tableName === table.name);
        const tableRows = tableData.map(item => item.rowData as Record<string, unknown>);
        if (tableRows.length > 0) {
          const worksheet = xlsx.utils.json_to_sheet(tableRows);
          xlsx.utils.book_append_sheet(workbook, worksheet, table.name);
        }
      }
    }

    // إنشاء الملف
    let buffer: Buffer;
    let mimeType: string;
    let extension: string;

    if (format === 'csv') {
      // تصدير كـ CSV
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const csvContent = xlsx.utils.sheet_to_csv(firstSheet);
      buffer = Buffer.from('\ufeff' + csvContent, 'utf8'); // BOM للدعم العربي
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else {
      // تصدير كـ Excel
      buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      extension = 'xlsx';
    }

    // إرجاع الملف
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${file.fileName.replace(/\.[^/.]+$/, '')}_export.${extension}"`
      }
    });

  } catch (error) {
    console.error('خطأ في تصدير البيانات:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تصدير البيانات' },
      { status: 500 }
    );
  }
}
