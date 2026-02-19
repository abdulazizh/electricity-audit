import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const enterName = searchParams.get('enterName') || '';

    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { accountNo: { contains: search } }
      ];
    }
    
    if (enterName) {
      where.enterName = enterName;
    }

    const total = await prisma.input.count({ where });
    
    const data = await prisma.input.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const byEmployee = await prisma.input.groupBy({
      by: ['enterName'],
      where: { enterName: { not: null } },
      _count: true
    });

    const stats = {
      total: await prisma.input.count(),
      withReadings: await prisma.input.count({ where: { read: { not: null } } }),
      uniqueEmployees: byEmployee.length
    };

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats,
      byEmployee: byEmployee.filter(e => e.enterName).map(e => ({
        name: e.enterName,
        count: e._count
      }))
    });

  } catch (error) {
    console.error('خطأ:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'خطأ: ' + (error instanceof Error ? error.message : '') 
    }, { status: 500 });
  }
}
