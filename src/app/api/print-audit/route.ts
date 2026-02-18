import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// ألوان الحالات
const STATUS_COLORS: Record<number, string> = {
  0: '#10b981',
  1: '#6b7280',
  2: '#ef4444',
  6: '#dc2626',
  7: '#f97316',
  8: '#8b5cf6',
  11: '#eab308',
  12: '#9ca3af',
  14: '#3b82f6',
};

const STATUS_BG_COLORS: Record<number, string> = {
  0: '#d1fae5',
  1: '#f3f4f6',
  2: '#fee2e2',
  6: '#fecaca',
  7: '#fed7aa',
  8: '#ede9fe',
  11: '#fef08a',
  12: '#f3f4f6',
  14: '#bfdbfe',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusCode = searchParams.get('statusCode');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    
    if (statusCode === 'needsReview') {
      where.needsReview = true;
    } else if (statusCode) {
      where.statusCode = parseInt(statusCode);
    }
    
    if (search) {
      where.accountNo = { contains: search };
    }

    const records = await prisma.auditRecord.findMany({
      where,
      orderBy: { statusCode: 'asc' }
    });

    if (records.length === 0) {
      return new NextResponse('لا توجد بيانات للطباعة', { status: 400 });
    }

    const stats = {
      total: records.length,
      accepted: records.filter(r => r.statusCode === 0).length,
      high: records.filter(r => r.statusCode === 7).length,
      highRejected: records.filter(r => r.statusCode === 6).length,
      cycle: records.filter(r => r.statusCode === 8).length,
      other: records.filter(r => ![0, 6, 7, 8].includes(r.statusCode)).length,
    };

    const today = new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير تدقيق قراءات عدادات الكهرباء</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: white;
      color: #1e293b;
      direction: rtl;
      line-height: 1.5;
    }
    
    .container {
      max-width: 100%;
      margin: 0;
      padding: 15px;
    }
    
    /* Header - في الوسط */
    .header {
      padding: 15px 0;
      margin-bottom: 15px;
      border-bottom: 2px solid #e2e8f0;
      text-align: center;
    }
    
    .logo {
      font-size: 28px;
      margin-bottom: 8px;
    }
    
    .header h1 {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
    }
    
    .header .subtitle {
      font-size: 13px;
      color: #64748b;
    }
    
    .date-box {
      font-size: 13px;
      color: #64748b;
      margin-top: 8px;
    }
    
    /* Stats - في الوسط */
    .stats-container {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-bottom: 20px;
      padding: 15px 0;
      border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap;
    }
    
    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .stat-item .value {
      font-size: 15px;
      font-weight: 700;
    }
    
    .stat-item .label {
      font-size: 12px;
      color: #64748b;
    }
    
    .stat-item.accepted .value { color: #10b981; }
    .stat-item.high .value { color: #f97316; }
    .stat-item.high-rejected .value { color: #ef4444; }
    .stat-item.cycle .value { color: #8b5cf6; }
    .stat-item.other .value { color: #64748b; }
    .stat-item.total .value { color: #3b82f6; }
    
    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    
    thead {
      background: #f8fafc;
    }
    
    thead th {
      padding: 12px 6px;
      font-weight: 600;
      text-align: center;
      white-space: nowrap;
      border-bottom: 2px solid #e2e8f0;
      font-size: 11px;
    }
    
    /* ألوان جميلة لحقول الهيدر */
    th.col-account { color: #2563eb; background: #eff6ff; }
    th.col-prev-read { color: #7c3aed; background: #f5f3ff; }
    th.col-prev-date { color: #7c3aed; background: #f5f3ff; }
    th.col-curr-read { color: #ea580c; background: #fff7ed; }
    th.col-curr-date { color: #ea580c; background: #fff7ed; }
    th.col-consum { color: #059669; background: #ecfdf5; }
    th.col-days { color: #0891b2; background: #ecfeff; }
    th.col-rate { color: #0284c7; background: #f0f9ff; }
    th.col-rate1 { color: #0284c7; background: #f0f9ff; }
    th.col-rate2 { color: #0284c7; background: #f0f9ff; }
    th.col-rate3 { color: #0284c7; background: #f0f9ff; }
    th.col-employee { color: #be185d; background: #fdf2f8; }
    th.col-status { color: #dc2626; background: #fef2f2; }
    
    tbody tr {
      border-bottom: 1px solid #f1f5f9;
    }
    
    tbody tr:nth-child(even) {
      background: #fafbfc;
    }
    
    td {
      padding: 8px 6px;
      text-align: center;
      white-space: nowrap;
    }
    
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-weight: 500;
      font-size: 10px;
    }
    
    .number {
      font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
    }
    
    .account-no {
      font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
      font-weight: 600;
      color: #2563eb;
    }
    
    .diff-negative {
      color: #dc2626;
      font-weight: 600;
    }
    
    /* Footer */
    .footer {
      margin-top: 15px;
      text-align: center;
      color: #94a3b8;
      font-size: 11px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    }
    
    /* Print Styles */
    @media print {
      body {
        background: white;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .container {
        padding: 0;
      }
      
      thead {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      th.col-account,
      th.col-prev-read,
      th.col-prev-date,
      th.col-curr-read,
      th.col-curr-date,
      th.col-consum,
      th.col-days,
      th.col-rate,
      th.col-rate1,
      th.col-rate2,
      th.col-rate3,
      th.col-employee,
      th.col-status {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .status-badge {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      @page {
        size: A3 landscape;
        margin: 8mm;
      }
      
      thead {
        display: table-header-group;
      }
      
      tbody tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header - في الوسط -->
    <div class="header">
      <div class="logo">⚡</div>
      <h1>تقرير تدقيق قراءات عدادات الكهرباء</h1>
      <div class="subtitle">نظام التدقيق والمتابعة</div>
      <div class="date-box">${today}</div>
    </div>
    
    <!-- Stats - في الوسط -->
    <div class="stats-container">
      <div class="stat-item total">
        <span class="label">إجمالي:</span>
        <span class="value">${stats.total.toLocaleString('ar-SA')}</span>
      </div>
      <div class="stat-item accepted">
        <span class="label">مقبول:</span>
        <span class="value">${stats.accepted.toLocaleString('ar-SA')}</span>
      </div>
      <div class="stat-item high">
        <span class="label">عالي:</span>
        <span class="value">${stats.high.toLocaleString('ar-SA')}</span>
      </div>
      <div class="stat-item high-rejected">
        <span class="label">عالي مرفوض:</span>
        <span class="value">${stats.highRejected.toLocaleString('ar-SA')}</span>
      </div>
      <div class="stat-item cycle">
        <span class="label">دورة:</span>
        <span class="value">${stats.cycle.toLocaleString('ar-SA')}</span>
      </div>
      <div class="stat-item other">
        <span class="label">أخرى:</span>
        <span class="value">${stats.other.toLocaleString('ar-SA')}</span>
      </div>
    </div>
    
    <!-- Table -->
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th class="col-account">رقم الحساب</th>
          <th class="col-prev-read">القراءة السابقة</th>
          <th class="col-prev-date">تاريخ السابقة</th>
          <th class="col-curr-read">القراءة الحالية</th>
          <th class="col-curr-date">تاريخ الحالية</th>
          <th class="col-consum">الاستهلاك</th>
          <th class="col-days">المدة</th>
          <th class="col-rate">المعدل</th>
          <th class="col-rate1">المعدل 1</th>
          <th class="col-rate2">المعدل 2</th>
          <th class="col-rate3">المعدل 3</th>
          <th class="col-employee">الموظف</th>
          <th class="col-status">الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${records.map((r, idx) => `
        <tr>
          <td class="number">${idx + 1}</td>
          <td class="account-no">${r.accountNo}</td>
          <td class="number">${r.prevRead?.toLocaleString() || '-'}</td>
          <td>${r.prevDate || '-'}</td>
          <td class="number">${r.currentRead?.toLocaleString() || '-'}</td>
          <td>${r.currentDate || '-'}</td>
          <td class="${r.diff && r.diff < 0 ? 'diff-negative number' : 'number'}">${r.diff?.toLocaleString() || '-'}</td>
          <td class="number">${r.days || '-'}</td>
          <td class="number">${r.dailyRate ? Math.round(r.dailyRate) : '-'}</td>
          <td class="number">${r.rate1 ? Math.round(r.rate1) : '-'}</td>
          <td class="number">${r.rate2 ? Math.round(r.rate2) : '-'}</td>
          <td class="number">${r.rate3 ? Math.round(r.rate3) : '-'}</td>
          <td>${r.enterName || '-'}</td>
          <td>
            <span class="status-badge" style="background-color: ${STATUS_BG_COLORS[r.statusCode] || '#f3f4f6'}; color: ${STATUS_COLORS[r.statusCode] || '#374151'};">
              ${r.statusDesc}
            </span>
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- Footer -->
    <div class="footer">
      تم إنشاء هذا التقرير من نظام تدقيق قراءات عدادات الكهرباء
    </div>
  </div>
  
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('خطأ في الطباعة:', error);
    return new NextResponse('حدث خطأ أثناء إنشاء التقرير', { status: 500 });
  }
}
