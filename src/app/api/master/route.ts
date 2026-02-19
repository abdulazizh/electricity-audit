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

    // جلب أنواع المشتركين
    const custTypes = await prisma.custType.findMany();
    const custTypeMap = new Map(custTypes.map(ct => [ct.code, ct.desc]));

    // جلب البيانات
    const [data, total] = await Promise.all([
      prisma.master.findMany({
        where,
        skip,
        take: limit,
        orderBy: { accountNo: 'asc' }
      }),
      prisma.master.count({ where })
    ]);

    // إضافة وصف الصنف للبيانات
    const dataWithCustDesc = data.map(r => ({
      ...r,
      custDesc: r.cust ? custTypeMap.get(Math.round(r.cust)) || null : null
    }));

    // إحصائيات
    const stats = await prisma.master.aggregate({
      _count: { id: true },
      _avg: { avgConsum: true, lastRead: true },
      _sum: { 
        payment: true, 
        outs: true, 
        outsBf: true, 
        outsBef17: true 
      }
    });

    // توزيع حسب القطاع
    const bySector = await prisma.master.groupBy({
      by: ['sector'],
      _count: { id: true },
      orderBy: { sector: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: dataWithCustDesc,
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
        totalPayment: stats._sum.payment || 0,
        totalOuts: stats._sum.outs || 0,
        totalOutsBf: stats._sum.outsBf || 0,
        totalOutsBef17: stats._sum.outsBef17 || 0,
        totalDebts: (stats._sum.outs || 0) + (stats._sum.outsBf || 0) + (stats._sum.outsBef17 || 0)
      },
      bySector: bySector.filter(s => s.sector !== null).map(s => ({
        sector: s.sector,
        count: s._count.id
      }))
    });

  } catch (error) {
    console.error('خطأ في جلب بيانات Master:', error);
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ أثناء جلب البيانات: ' + (error instanceof Error ? error.message : '')
    }, { status: 500 });
  }
}
