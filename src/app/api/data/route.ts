import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const tableName = searchParams.get('tableName');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || '';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'معرف الملف مطلوب' },
        { status: 400 }
      );
    }

    // بناء شرط البحث
    const where: { fileId: string; tableName?: string } = { fileId };
    if (tableName) {
      where.tableName = tableName;
    }

    // جلب البيانات مع التصفح
    const skip = (page - 1) * limit;
    
    let data = await prisma.importedData.findMany({
      where,
      orderBy: { rowIndex: 'asc' },
      skip,
      take: limit
    });

    // البحث في البيانات
    if (search) {
      data = data.filter(item => {
        const rowData = item.rowData as Record<string, unknown>;
        return Object.values(rowData).some(val => 
          String(val).toLowerCase().includes(search.toLowerCase())
        );
      });
    }

    // الترتيب
    if (sortBy) {
      data.sort((a, b) => {
        const aData = a.rowData as Record<string, unknown>;
        const bData = b.rowData as Record<string, unknown>;
        const aVal = aData[sortBy];
        const bVal = bData[sortBy];
        
        if (sortOrder === 'asc') {
          return String(aVal).localeCompare(String(bVal));
        } else {
          return String(bVal).localeCompare(String(aVal));
        }
      });
    }

    // إجمالي عدد الصفوف
    const total = await prisma.importedData.count({ where });

    return NextResponse.json({
      success: true,
      data: data.map(item => ({
        id: item.id,
        tableName: item.tableName,
        rowIndex: item.rowIndex,
        rowData: item.rowData
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('خطأ في جلب البيانات:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء جلب البيانات' },
      { status: 500 }
    );
  }
}
