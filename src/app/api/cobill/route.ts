import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sector = searchParams.get('sector') || '';
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

    // جلب البيانات
    const [data, total] = await Promise.all([
      prisma.cobill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { accountNo: 'asc' }
      }),
      prisma.cobill.count({ where })
    ]);

    // إحصائيات
    const stats = await prisma.cobill.aggregate({
      _count: { id: true },
      _avg: { avgConsum: true, lastRead: true, prevRead: true }
    });

    // توزيع حسب القطاع
    const bySector = await prisma.cobill.groupBy({
      by: ['sector'],
      _count: { id: true },
      orderBy: { sector: 'asc' }
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
        avgLastRead: stats._avg.lastRead?.toFixed(0) || 0,
        avgPrevRead: stats._avg.prevRead?.toFixed(0) || 0
      },
      bySector: bySector.filter(s => s.sector !== null).map(s => ({
        sector: s.sector,
        count: s._count.id
      }))
    });

  } catch (error) {
    console.error('خطأ في جلب بيانات Cobill:', error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ أثناء جلب البيانات: ' + (error instanceof Error ? error.message : '')
    }, { status: 500 });
  }
}
