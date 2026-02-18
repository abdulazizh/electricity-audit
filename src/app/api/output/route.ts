import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sector = searchParams.get('sector') || '';
    const enterName = searchParams.get('enterName') || '';
    const type = searchParams.get('type') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // بناء شرط البحث
    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { accountNo: { contains: search } },
        { name: { contains: search } },
        { address: { contains: search } }
      ];
    }
    
    if (sector) {
      where.sector = parseInt(sector);
    }
    
    if (enterName) {
      where.enterName = enterName;
    }
    
    if (type) {
      where.type = parseInt(type);
    }

    // جلب البيانات
    const [data, total] = await Promise.all([
      prisma.output.findMany({
        where,
        skip,
        take: limit,
        orderBy: { accountNo: 'asc' }
      }),
      prisma.output.count({ where })
    ]);

    // إحصائيات
    const stats = await prisma.output.aggregate({
      _count: { id: true },
      _avg: { avgConsum: true, read: true, prevRead: true }
    });

    // توزيع حسب القطاع
    const bySector = await prisma.output.groupBy({
      by: ['sector'],
      _count: { id: true },
      orderBy: { sector: 'asc' }
    });

    // توزيع حسب الموظف
    const byEmployee = await prisma.output.groupBy({
      by: ['enterName'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    });

    // توزيع حسب النوع
    const byType = await prisma.output.groupBy({
      by: ['type'],
      _count: { id: true },
      orderBy: { type: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        total: stats._count.id,
        avgConsum: stats._avg.avgConsum?.toFixed(1) || 0,
        avgRead: stats._avg.read?.toFixed(0) || 0,
        avgPrevRead: stats._avg.prevRead?.toFixed(0) || 0
      },
      bySector: bySector.filter(s => s.sector !== null).map(s => ({
        sector: s.sector,
        count: s._count.id
      })),
      byEmployee: byEmployee.filter(e => e.enterName !== null && e.enterName !== '').map(e => ({
        name: e.enterName,
        count: e._count.id
      })),
      byType: byType.filter(t => t.type !== null).map(t => ({
        type: t.type,
        count: t._count.id
      }))
    });

  } catch (error) {
    console.error('خطأ في جلب بيانات Output:', error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ أثناء جلب البيانات: ' + (error instanceof Error ? error.message : '')
    }, { status: 500 });
  }
}
