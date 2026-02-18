import { NextRequest, NextResponse } from 'next/server';
import MDBReader from 'mdb-reader';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'لم يتم رفع أي ملف' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.mdb') && !fileName.endsWith('.accdb')) {
      return NextResponse.json({ success: false, error: 'الملف يجب أن يكون من نوع .mdb أو .accdb' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const mdbReader = new MDBReader(buffer);
    const tableNames = mdbReader.getTableNames();

    const tables: { name: string; rowCount: number; columns: string[] }[] = [];

    for (const tableName of tableNames) {
      try {
        const table = mdbReader.getTable(tableName);
        const data = table.getData() as Record<string, unknown>[];
        const columns = data.length > 0 ? Object.keys(data[0]) : [];

        tables.push({
          name: tableName,
          rowCount: data.length,
          columns: columns.slice(0, 10)
        });
      } catch (e) {
        tables.push({
          name: tableName,
          rowCount: 0,
          columns: []
        });
      }
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      totalTables: tables.length,
      tables
    });

  } catch (error) {
    console.error('خطأ في قراءة الملف:', error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ أثناء قراءة الملف: ' + (error instanceof Error ? error.message : 'خطأ غير معروف')
    }, { status: 500 });
  }
}
