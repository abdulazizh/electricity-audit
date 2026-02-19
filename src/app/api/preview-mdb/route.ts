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

    const tables: { name: string; rowCount: number; columns: string[]; detectedType: string | null }[] = [];

    for (const tableName of tableNames) {
      try {
        const table = mdbReader.getTable(tableName);
        const data = table.getData() as Record<string, unknown>[];

        if (data.length > 0) {
          const columns = Object.keys(data[0]);
          const detectedType = detectTableType(tableName);

          tables.push({
            name: tableName,
            rowCount: data.length,
            columns: columns.slice(0, 20), // أول 20 عمود فقط
            detectedType
          });
        }
      } catch (e) {
        console.error(`خطأ في قراءة جدول ${tableName}:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      tables
    });

  } catch (error) {
    console.error('خطأ في معاينة الملف:', error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ أثناء قراءة الملف: ' + (error instanceof Error ? error.message : 'خطأ غير معروف')
    }, { status: 500 });
  }
}

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
