import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

function formatDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return String(value);
}

function toInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : Math.round(num);
}

function toFloat(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

async function importMaster(filePath) {
  console.log('استيراد جدول المشتركين...');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  let count = 0;
  const batchSize = 500;
  let batch = [];
  
  for (const row of data) {
    const accountNo = String(row['m_accountno'] || '');
    if (!accountNo) continue;
    
    batch.push({
      accountNo,
      oldAccount: toFloat(row['m_oldacount']),
      oldAccountAgg: toFloat(row['m_oldacountagg']),
      accountNoBef: String(row['m_accountnobef'] || ''),
      accountOldCom: String(row['m_account_oldcom'] || ''),
      region: toInt(row['m_region']),
      sect: toInt(row['m_sect']),
      state: toInt(row['m_state']),
      serial: toFloat(row['m_serial']),
      name: String(row['m_name'] || ''),
      phase: toInt(row['M_PHASE'] || row['m_phase']),
      houseNo: String(row['m_houseno'] || ''),
      address: String(row['m_address'] || ''),
      street: toFloat(row['m_street']),
      streetNo: toFloat(row['m_street_no']),
      houseNo2: String(row['m_house_no2'] || ''),
      address2: String(row['m_address2'] || ''),
      meter: toFloat(row['m_meter']),
      meterDate: formatDate(row['m_meterdt']),
      facter: toInt(row['m_facter']),
      oldExch: formatDate(row['M_OLDEXCH']),
      fee: toFloat(row['M_FEE']),
      outs: toFloat(row['m_outs']),
      cust: toFloat(row['m_cust']),
      custNew: toInt(row['m_custnew']),
      instalNo: toInt(row['m_instalno']),
      lastRead: toFloat(row['m_lastread']),
      lastDate: formatDate(row['m_lastdt']),
      prevRead: toFloat(row['m_prevread']),
      prevDate: formatDate(row['m_prevdt']),
      billDate: formatDate(row['m_billdte']),
      def: toFloat(row['m_def']),
      payment: toFloat(row['m_payment']),
      payDate: formatDate(row['m_paydt']),
      out1517: toFloat(row['m_out1517']),
      badMtr: toFloat(row['m_badmtr']),
      note: String(row['m_note'] || ''),
      prevOuts: toFloat(row['m_prevouts']),
      consum1: toInt(row['M_CONSUM1']),
      period1: toInt(row['M_PERIOD1']),
      consum2: toInt(row['M_CONSUM2']),
      period2: toInt(row['M_PERIOD2']),
      consum3: toInt(row['M_CONSUM3']),
      period3: toInt(row['M_PERIOD3']),
      outsBf: toFloat(row['m_outs_bf']),
      outsBef17: toFloat(row['m_outs_bef17']),
      avgConsum: toInt(row['m_avgconsum']),
      sector: toInt(row['m_sector']),
    });
    
    if (batch.length >= batchSize) {
      await prisma.master.createMany({ data: batch });
      count += batch.length;
      console.log(`  تم استيراد ${count} سجل...`);
      batch = [];
    }
  }
  
  if (batch.length > 0) {
    await prisma.master.createMany({ data: batch });
    count += batch.length;
  }
  
  console.log(`✓ تم استيراد ${count} سجل من المشتركين`);
  return count;
}

async function importInput(filePath) {
  console.log('استيراد جدول القراءات...');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  let count = 0;
  const batchSize = 500;
  let batch = [];
  
  for (const row of data) {
    batch.push({
      accountNo: String(row['i_accountno'] || ''),
      type: toInt(row['I_type']),
      read: toInt(row['I_read']),
      readDate: formatDate(row['I_read_dt']),
      enterDate: formatDate(row['i_enterdte']),
      enterName: String(row['i_entername'] || ''),
      meter: toFloat(row['i_meter']),
      meterOld: toInt(row['i_meter_old']),
      amount: toInt(row['i_amount']),
      custCode: toInt(row['i_custcode']),
      sector: toFloat(row['i_sector']),
      endTime: String(row['i_end_time'] || ''),
    });
    
    if (batch.length >= batchSize) {
      await prisma.input.createMany({ data: batch });
      count += batch.length;
      console.log(`  تم استيراد ${count} سجل...`);
      batch = [];
    }
  }
  
  if (batch.length > 0) {
    await prisma.input.createMany({ data: batch });
    count += batch.length;
  }
  
  console.log(`✓ تم استيراد ${count} سجل من القراءات`);
  return count;
}

async function importCobill(filePath) {
  console.log('استيراد جدول الفواتير...');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  let count = 0;
  const batchSize = 500;
  let batch = [];
  
  for (const row of data) {
    batch.push({
      accountNo: String(row['B_accountno'] || ''),
      name: String(row['B_name'] || ''),
      serialNo: toInt(row['B_serialno']),
      meterNo: toInt(row['B_meterno']),
      lastRead: toInt(row['B_lastread']),
      lastDate: formatDate(row['B_lastdt']),
      prevRead: toInt(row['B_prevread']),
      prevDate: formatDate(row['B_prevdt']),
      prevOuts: toInt(row['B_prevouts']),
      outs: toInt(row['B_outs']),
      billDate: formatDate(row['b_billdte']),
      avgConsum: toInt(row['B_avgconsum']),
      avgDt: formatDate(row['b_avgdt']),
      facter: toInt(row['b_facter']),
      cust: toInt(row['B_cust']),
      instalNo: toInt(row['b_instalno']),
      sector: toInt(row['b_sector']),
      region: toInt(row['b_region']),
      streetNo: toInt(row['b_streetno']),
      houseNo: String(row['b_houseno'] || ''),
      streetName: toInt(row['b_streetname']),
      address: String(row['B_address'] || ''),
      cons1: toInt(row['B_cons1']),
      conp1: toInt(row['B_conp1']),
      cons2: toInt(row['B_cons2']),
      conp2: toInt(row['B_conp2']),
      cons3: toInt(row['B_cons3']),
      conp3: toInt(row['B_conp3']),
      priod: toInt(row['B_priod']),
      meterType: String(row['b_type'] || ''),
    });
    
    if (batch.length >= batchSize) {
      await prisma.cobill.createMany({ data: batch });
      count += batch.length;
      console.log(`  تم استيراد ${count} سجل...`);
      batch = [];
    }
  }
  
  if (batch.length > 0) {
    await prisma.cobill.createMany({ data: batch });
    count += batch.length;
  }
  
  console.log(`✓ تم استيراد ${count} سجل من الفواتير`);
  return count;
}

async function importOutput(filePath) {
  console.log('استيراد جدول الخرج...');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  let count = 0;
  const batchSize = 500;
  let batch = [];
  
  for (const row of data) {
    batch.push({
      accountNo: String(row['O_accountno'] || ''),
      name: String(row['O_name'] || ''),
      read: toInt(row['O_read']),
      readDate: formatDate(row['O_read_dt']),
      prevRead: toInt(row['O_prevread']),
      prevDate: formatDate(row['O_prevdt']),
      closeRead: toInt(row['O_close_read']),
      codeRemr: toInt(row['O_coderemr']),
      region: toInt(row['o_region']),
      sect: toInt(row['o_sect']),
      type: toInt(row['O_type']),
      serial: toInt(row['O_serial']),
      streetNo: toInt(row['O_streetno']),
      streetName: toInt(row['O_streetname']),
      houseNo: toInt(row['O_houseno']),
      address: String(row['O_address'] || ''),
      meter: toInt(row['O_meter']),
      oldMeter: toFloat(row['O_oldmeter']),
      facter: toInt(row['O_facter']),
      phase: toFloat(row['o_phase']),
      custCode: toInt(row['o_custcode']),
      cust: toInt(row['O_cust']),
      amount: toInt(row['o_amount']),
      amountBef: toInt(row['o_amount_bef']),
      amountAll: toInt(row['o_amount_all']),
      avgConsum: toFloat(row['O_avgconsum']),
      avgDt: formatDate(row['O_avgdt']),
      instalNo: toInt(row['O_instalno']),
      enterName: String(row['O_entername'] || ''),
      enterDate: formatDate(row['O_enterdte']),
      outs: toInt(row['o_outs']),
      sector: toInt(row['o_sector']),
      dailyCon: toInt(row['o_dailycon']),
      priod: toInt(row['o_priod']),
      billDate: formatDate(row['O_billdte']),
      meterType: String(row['o_mtype'] || ''),
    });
    
    if (batch.length >= batchSize) {
      await prisma.output.createMany({ data: batch });
      count += batch.length;
      console.log(`  تم استيراد ${count} سجل...`);
      batch = [];
    }
  }
  
  if (batch.length > 0) {
    await prisma.output.createMany({ data: batch });
    count += batch.length;
  }
  
  console.log(`✓ تم استيراد ${count} سجل من الخرج`);
  return count;
}

async function importCustType(filePath) {
  console.log('استيراد جدول أنواع المشتركين...');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  let count = 0;
  for (const row of data) {
    try {
      await prisma.custType.create({
        data: {
          code: toInt(row['c_custcode']) || 0,
          desc: String(row['c_custdesc'] || ''),
        }
      });
      count++;
    } catch (e) {
      // تجاهل التكرار
    }
  }
  
  console.log(`✓ تم استيراد ${count} سجل من أنواع المشتركين`);
  return count;
}

async function importCodeRem(filePath) {
  console.log('استيراد جدول رموز الأسباب...');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  let count = 0;
  for (const row of data) {
    try {
      await prisma.codeRem.create({
        data: {
          code: toInt(row['code']) || 0,
          desc: String(row['desc'] || ''),
        }
      });
      count++;
    } catch (e) {
      // تجاهل التكرار
    }
  }
  
  console.log(`✓ تم استيراد ${count} سجل من رموز الأسباب`);
  return count;
}

async function main() {
  console.log('=== بدء استيراد البيانات ===\n');
  
  try {
    // استيراد الملفات
    await importMaster('/home/z/my-project/upload/master.xlsx');
    await importInput('/home/z/my-project/upload/input.xlsx');
    await importCobill('/home/z/my-project/upload/cobill5.xlsx');
    await importOutput('/home/z/my-project/upload/output.xlsx');
    await importCustType('/home/z/my-project/upload/custtypeind.xlsx');
    await importCodeRem('/home/z/my-project/upload/codrem.xlsx');
    
    // عرض الإحصائيات
    console.log('\n=== إحصائيات قاعدة البيانات ===');
    console.log(`المشتركين: ${(await prisma.master.count()).toLocaleString()}`);
    console.log(`القراءات: ${(await prisma.input.count()).toLocaleString()}`);
    console.log(`الفواتير: ${(await prisma.cobill.count()).toLocaleString()}`);
    console.log(`الخرج: ${(await prisma.output.count()).toLocaleString()}`);
    console.log(`أنواع المشتركين: ${(await prisma.custType.count()).toLocaleString()}`);
    console.log(`رموز الأسباب: ${(await prisma.codeRem.count()).toLocaleString()}`);
    
    console.log('\n✅ تم استيراد جميع البيانات بنجاح!');
  } catch (error) {
    console.error('خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
