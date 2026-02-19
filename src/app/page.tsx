'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Upload,
  Database,
  Search,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  ClipboardCheck,
  Zap,
  ChevronLeft,
  ChevronRight,
  Trash2,
  FileArchive,
  BarChart3,
  Users,
  Eye,
  FileText,
  Receipt,
  Printer,
  RefreshCw
} from 'lucide-react'

interface Stats {
  master: number
  input: number
  output: number
  cobill: number
  custType: number
  codeRem: number
  auditRecords: number
}

interface MasterRecord {
  id: string
  // معلومات الحساب
  accountNo: string
  oldAccount: number | null
  oldAccountAgg: number | null
  accountNoBef: string | null
  accountOldCom: string | null
  // الموقع
  region: number | null
  sect: number | null
  state: number | null
  serial: number | null
  name: string | null
  phase: number | null
  houseNo: string | null
  address: string | null
  street: number | null
  streetNo: number | null
  houseNo2: string | null
  address2: string | null
  // معلومات المقياس
  meter: number | null
  meterDate: string | null
  facter: number | null
  oldExch: string | null
  fee: number | null
  // معلومات الاشتراك
  outs: number | null
  cust: number | null
  custNew: number | null
  instalNo: number | null
  // القراءات
  lastRead: number | null
  lastDate: string | null
  prevRead: number | null
  prevDate: string | null
  billDate: string | null
  def: number | null
  // المدفوعات
  payment: number | null
  payDate: string | null
  // معلومات إضافية
  out1517: number | null
  badMtr: number | null
  note: string | null
  prevOuts: number | null
  // الاستهلاك الشهري
  consum1: number | null
  period1: number | null
  consum2: number | null
  period2: number | null
  consum3: number | null
  period3: number | null
  // الديون
  outsBf: number | null
  outsBef17: number | null
  // حقول إضافية
  avgConsum: number | null
  sector: number | null
  // وصف الصنف
  custDesc: string | null
}

interface CobillRecord {
  id: string
  accountNo: string
  name: string | null
  meterNo: number | null
  lastRead: number | null
  lastDate: string | null
  prevRead: number | null
  prevDate: string | null
  avgConsum: number | null
  sector: number | null
}

interface OutputRecord {
  id: string
  accountNo: string
  name: string | null
  read: number | null
  readDate: string | null
  prevRead: number | null
  prevDate: string | null
  type: number | null
  enterName: string | null
  sector: number | null
  amount: number | null
  amountBef: number | null
  amountAll: number | null
  outs: number | null
  closeRead: number | null
  closeDate: string | null
}

interface InputRecord {
  id: string
  accountNo: string
  type: number | null
  read: number | null
  readDate: string | null
  enterName: string | null
  sector: number | null
}

interface AuditRecord {
  id: string
  accountNo: string
  currentRead: number | null
  currentDate: string | null
  prevRead: number | null
  prevDate: string | null
  diff: number | null
  days: number | null
  dailyRate: number | null
  rate1: number | null
  rate2: number | null
  rate3: number | null
  subscriberName: string | null
  enterName: string | null
  statusCode: number
  statusDesc: string
  isAccepted: boolean
}

const statusColors: Record<number, string> = {
  0: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  1: 'bg-slate-100 text-slate-600 border border-slate-200',
  2: 'bg-red-50 text-red-700 border border-red-200',
  6: 'bg-red-100 text-red-800 border border-red-300',
  7: 'bg-amber-50 text-amber-700 border border-amber-200',
  8: 'bg-violet-50 text-violet-700 border border-violet-200',
  11: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  12: 'bg-gray-100 text-gray-600 border border-gray-200',
  14: 'bg-blue-50 text-blue-700 border border-blue-200',
}

// MDB Preview types
interface MDBTable {
  name: string
  rowCount: number
  columns: string[]
  detectedType: string | null
}

interface MDBPreview {
  fileName: string
  fileSize: number
  tables: MDBTable[]
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('import')

  // MDB Preview state
  const [mdbPreview, setMdbPreview] = useState<MDBPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Refs
  const investDbInputRef = useRef<HTMLInputElement>(null)
  const inputFileRef = useRef<HTMLInputElement>(null)
  const masterInputRef = useRef<HTMLInputElement>(null)
  const cobillInputRef = useRef<HTMLInputElement>(null)
  const outputInputRef = useRef<HTMLInputElement>(null)
  const custtypeInputRef = useRef<HTMLInputElement>(null)
  const codremInputRef = useRef<HTMLInputElement>(null)
  const mdbPreviewInputRef = useRef<HTMLInputElement>(null)

  // Master state
  const [masterData, setMasterData] = useState<MasterRecord[]>([])
  const [masterPagination, setMasterPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [masterSearch, setMasterSearch] = useState('')
  const [masterStats, setMasterStats] = useState<{total: number; avgConsum: string; avgLastRead: string; totalPayment: number; totalOuts: number; totalOutsBf: number; totalOutsBef17: number; totalDebts: number} | null>(null)
  const [masterBySector, setMasterBySector] = useState<{sector: number | null; count: number}[]>([])

  // Cobill state
  const [cobillData, setCobillData] = useState<CobillRecord[]>([])
  const [cobillPagination, setCobillPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [cobillSearch, setCobillSearch] = useState('')
  const [cobillStats, setCobillStats] = useState<{total: number; avgConsum: string; avgLastRead: string} | null>(null)

  // Output state
  const [outputData, setOutputData] = useState<OutputRecord[]>([])
  const [outputPagination, setOutputPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [outputSearch, setOutputSearch] = useState('')
  const [outputStats, setOutputStats] = useState<{total: number; avgConsum: string} | null>(null)
  const [outputByEmployee, setOutputByEmployee] = useState<{name: string; count: number}[]>([])
  const [outputByType, setOutputByType] = useState<{type: number; count: number}[]>([])
  const [outputEmployeeFilter, setOutputEmployeeFilter] = useState('all')
  const [outputTypeFilter, setOutputTypeFilter] = useState('all')
  const [outputSort, setOutputSort] = useState('accountNo')

  // Input state
  const [inputData, setInputData] = useState<InputRecord[]>([])
  const [inputPagination, setInputPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [inputSearch, setInputSearch] = useState('')
  const [inputEmployeeFilter, setInputEmployeeFilter] = useState('all')
  const [inputStats, setInputStats] = useState<{total: number; withReadings: number; uniqueEmployees: number} | null>(null)
  const [byEmployee, setByEmployee] = useState<{name: string; count: number}[]>([])

  // Audit state
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([])
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [auditStats, setAuditStats] = useState<{total: number; accepted: number; needsReview: number; high: number; highRejected: number; cycle: number} | null>(null)
  const [auditFilter, setAuditFilter] = useState('all')
  const [auditSearch, setAuditSearch] = useState('')
  const [auditSort, setAuditSort] = useState('statusCode')

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/import')
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (e) {
      console.error('Error:', e)
    }
  }, [])

  // Upload file
  const handleUpload = useCallback(async (file: File, tableType: string) => {
    if (!file) return

    setUploading(true)
    setUploadingType(tableType)
    setError(null)
    setSuccess(null)

    console.log('رفع ملف:', file.name, 'الحجم:', file.size, 'النوع:', tableType)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tableType', tableType)

      const res = await fetch('/api/import', { method: 'POST', body: formData })

      console.log('Response status:', res.status)

      if (!res.ok) {
        const text = await res.text()
        console.error('Error response:', text)
        setError(`خطأ ${res.status}: ${text}`)
        return
      }

      const data = await res.json()

      if (data.success) {
        setSuccess(data.message)
        loadStats()
      } else {
        setError(data.error || 'حدث خطأ')
      }
    } catch (e) {
      console.error('Upload error:', e)
      setError('حدث خطأ في الاتصال: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setUploading(false)
      setUploadingType(null)
    }
  }, [loadStats])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, tableType: string) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file, tableType)
      e.target.value = ''
    }
  }, [handleUpload])

  const triggerFileInput = useCallback((ref: React.RefObject<HTMLInputElement | null>) => {
    ref.current?.click()
  }, [])

  // Preview MDB file
  const handleMDBPreview = useCallback(async (file: File) => {
    setPreviewing(true)
    setError(null)
    setMdbPreview(null)
    setSelectedFile(file)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/preview-mdb', { method: 'POST', body: formData })
      const data = await res.json()

      if (data.success) {
        setMdbPreview(data)
      } else {
        setError(data.error || 'حدث خطأ في قراءة الملف')
      }
    } catch (e) {
      setError('حدث خطأ في الاتصال')
    } finally {
      setPreviewing(false)
    }
  }, [])

  // Import from previewed MDB
  const handleMDBImport = useCallback(async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadingType('all')
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('tableType', 'all')

      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const data = await res.json()

      if (data.success) {
        setSuccess(data.message)
        setMdbPreview(null)
        setSelectedFile(null)
        loadStats()
      } else {
        setError(data.error || 'حدث خطأ')
      }
    } catch (e) {
      setError('حدث خطأ في الاتصال')
    } finally {
      setUploading(false)
      setUploadingType(null)
    }
  }, [selectedFile, loadStats])

  const handleMDBFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleMDBPreview(file)
      e.target.value = ''
    }
  }, [handleMDBPreview])

  // Load master data
  const loadMasterData = useCallback(async (page: number = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        search: masterSearch
      })

      const res = await fetch(`/api/master?${params}`)
      const data = await res.json()

      if (data.success) {
        setMasterData(data.data)
        setMasterPagination(data.pagination)
        setMasterStats(data.stats)
        setMasterBySector(data.bySector)
      }
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }, [masterSearch])

  // Load cobill data
  const loadCobillData = useCallback(async (page: number = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        search: cobillSearch
      })

      const res = await fetch(`/api/cobill?${params}`)
      const data = await res.json()

      if (data.success) {
        setCobillData(data.data)
        setCobillPagination(data.pagination)
        setCobillStats(data.stats)
      }
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }, [cobillSearch])

  // Load output data
  const loadOutputData = useCallback(async (page: number = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        search: outputSearch,
        enterName: outputEmployeeFilter === 'all' ? '' : outputEmployeeFilter,
        type: outputTypeFilter === 'all' ? '' : outputTypeFilter,
        sort: outputSort
      })

      const res = await fetch(`/api/output?${params}`)
      const data = await res.json()

      if (data.success) {
        setOutputData(data.data)
        setOutputPagination(data.pagination)
        setOutputStats(data.stats)
        setOutputByEmployee(data.byEmployee)
        setOutputByType(data.byType)
      }
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }, [outputSearch, outputEmployeeFilter, outputTypeFilter, outputSort])

  // Load input data
  const loadInputData = useCallback(async (page: number = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        search: inputSearch,
        enterName: inputEmployeeFilter === 'all' ? '' : inputEmployeeFilter
      })

      const res = await fetch(`/api/inputs?${params}`)
      const data = await res.json()

      if (data.success) {
        setInputData(data.data)
        setInputPagination(data.pagination)
        setInputStats(data.stats)
        setByEmployee(data.byEmployee)
      }
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }, [inputSearch, inputEmployeeFilter])

  // Run audit
  const runAudit = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/audit', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        setSuccess(data.message)
        setAuditStats(data.stats)
        loadStats()
        setActiveTab('audit')
      } else {
        setError(data.error || 'حدث خطأ')
      }
    } catch (e) {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }, [loadStats])

  // Load audit data
  const loadAuditData = useCallback(async (page: number = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '99999', // جلب جميع السجلات
        statusCode: auditFilter,
        search: auditSearch,
        sort: auditSort
      })

      const res = await fetch(`/api/audit?${params}`)
      const data = await res.json()

      if (data.success) {
        setAuditRecords(data.records)
        setAuditPagination(data.pagination)
        // تحديث الإحصائيات من البيانات
        if (data.records.length > 0) {
          setAuditStats({
            total: data.records.length,
            accepted: data.records.filter((r: AuditRecord) => r.statusCode === 0).length,
            needsReview: data.records.filter((r: AuditRecord) => r.needsReview).length,
            high: data.records.filter((r: AuditRecord) => r.statusCode === 7).length,
            highRejected: data.records.filter((r: AuditRecord) => r.statusCode === 6).length,
            cycle: data.records.filter((r: AuditRecord) => r.statusCode === 8).length,
          })
        }
      }
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }, [auditFilter, auditSearch, auditSort])

  // Clear data
  const clearData = useCallback(async () => {
    if (!confirm('هل أنت متأكد من حذف جميع البيانات؟')) return
    
    try {
      await fetch('/api/clear', { method: 'POST' })
      setSuccess('تم حذف جميع البيانات')
      loadStats()
      setInputData([])
      setMasterData([])
      setCobillData([])
      setOutputData([])
      setAuditRecords([])
      setAuditStats(null)
    } catch (e) {
      setError('حدث خطأ')
    }
  }, [loadStats])

  // Export
  const handleExport = useCallback(() => {
    const params = new URLSearchParams({ statusCode: auditFilter === 'all' ? '' : auditFilter })
    window.open(`/api/export-audit?${params}`, '_blank')
  }, [auditFilter])

  // Delete inputs
  const deleteInputs = useCallback(async () => {
    if (!confirm('هل أنت متأكد من حذف جميع القراءات؟ سيتم حذف سجلات التدقيق أيضاً.')) return
    
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/delete-inputs', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        setSuccess(data.message)
        setInputData([])
        setAuditRecords([])
        setAuditStats(null)
        loadStats()
      } else {
        setError(data.error || 'حدث خطأ')
      }
    } catch (e) {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }, [loadStats])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Load data when tabs change
  useEffect(() => {
    if (activeTab === 'master' && stats?.master) {
      loadMasterData(1)
    }
  }, [activeTab, stats?.master, loadMasterData])

  useEffect(() => {
    if (activeTab === 'cobill' && stats?.cobill) {
      loadCobillData(1)
    }
  }, [activeTab, stats?.cobill, loadCobillData])

  useEffect(() => {
    if (activeTab === 'output' && stats?.output) {
      loadOutputData(1)
    }
  }, [activeTab, stats?.output, loadOutputData])

  // Reload output when sort changes
  useEffect(() => {
    if (activeTab === 'output' && stats?.output) {
      const timer = setTimeout(() => {
        loadOutputData(1)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [outputSort])

  useEffect(() => {
    if (activeTab === 'inputs' && stats?.input) {
      loadInputData(1)
    }
  }, [activeTab, stats?.input, loadInputData])

  useEffect(() => {
    if (activeTab === 'audit' && stats?.auditRecords) {
      loadAuditData(1)
    }
  }, [activeTab, stats?.auditRecords, loadAuditData])

  // Reload audit when search or sort changes
  useEffect(() => {
    if (activeTab === 'audit' && stats?.auditRecords) {
      const timer = setTimeout(() => {
        loadAuditData(1)
      }, 300) // debounce 300ms
      return () => clearTimeout(timer)
    }
  }, [auditSearch, auditSort])

  const hasMasterData = stats?.master && stats.master > 0
  const hasCobillData = stats?.cobill && stats.cobill > 0
  const hasOutputData = stats?.output && stats.output > 0
  const hasInputData = stats?.input && stats.input > 0
  const canRunAudit = hasInputData && hasMasterData

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <input ref={investDbInputRef} type="file" className="hidden" accept=".mdb,.accdb,.xlsx,.xls" onChange={(e) => handleFileChange(e, 'all')} />
      <input ref={inputFileRef} type="file" className="hidden" accept=".mdb,.accdb,.xlsx,.xls,.csv" onChange={(e) => handleFileChange(e, 'input')} />
      <input ref={masterInputRef} type="file" className="hidden" accept=".mdb,.accdb,.xlsx,.xls,.csv" onChange={(e) => handleFileChange(e, 'master')} />
      <input ref={cobillInputRef} type="file" className="hidden" accept=".mdb,.accdb,.xlsx,.xls,.csv" onChange={(e) => handleFileChange(e, 'cobill')} />
      <input ref={outputInputRef} type="file" className="hidden" accept=".mdb,.accdb,.xlsx,.xls,.csv" onChange={(e) => handleFileChange(e, 'output')} />
      <input ref={custtypeInputRef} type="file" className="hidden" accept=".mdb,.accdb,.xlsx,.xls,.csv" onChange={(e) => handleFileChange(e, 'custtype')} />
      <input ref={codremInputRef} type="file" className="hidden" accept=".mdb,.accdb,.xlsx,.xls,.csv" onChange={(e) => handleFileChange(e, 'codrem')} />
      <input ref={mdbPreviewInputRef} type="file" className="hidden" accept=".mdb,.accdb" onChange={handleMDBFileChange} />

      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">نظام تدقيق قراءات الكهرباء</h1>
                <p className="text-sm text-slate-500">تدقيق ومتابعة قراءات العدادات</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {stats && (
                <>
                  <Badge variant="outline" className="gap-1 bg-blue-50">
                    <Database className="h-3 w-3" />
                    {stats.master?.toLocaleString('en-US') || 0} مشترك
                  </Badge>
                  <Badge variant="outline" className="gap-1 bg-amber-50">
                    <FileSpreadsheet className="h-3 w-3" />
                    {stats.input?.toLocaleString('en-US') || 0} قراءة
                  </Badge>
                  {stats.auditRecords > 0 && (
                    <Badge className="bg-green-600 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      تم التدقيق
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border shadow-sm flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="import" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Upload className="h-4 w-4" />
              استيراد
            </TabsTrigger>
            <TabsTrigger value="master" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white" disabled={!hasMasterData}>
              <Database className="h-4 w-4" />
              المشتركين ({stats?.master?.toLocaleString('en-US') || 0})
            </TabsTrigger>
            <TabsTrigger value="cobill" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white" disabled={!hasCobillData}>
              <Receipt className="h-4 w-4" />
              الفواتير ({stats?.cobill?.toLocaleString('en-US') || 0})
            </TabsTrigger>
            <TabsTrigger value="output" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white" disabled={!hasOutputData}>
              <FileText className="h-4 w-4" />
              الخرج ({stats?.output?.toLocaleString('en-US') || 0})
            </TabsTrigger>
            <TabsTrigger value="inputs" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white" disabled={!hasInputData}>
              <Eye className="h-4 w-4" />
              القراءات ({stats?.input?.toLocaleString('en-US') || 0})
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white" disabled={!hasInputData && !hasMasterData}>
              <BarChart3 className="h-4 w-4" />
              إحصائيات
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white" disabled={!stats?.auditRecords}>
              <ClipboardCheck className="h-4 w-4" />
              التدقيق
            </TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="py-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{stats?.master?.toLocaleString('en-US') || 0}</p>
                  <p className="text-xs text-blue-600">المشتركين</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="py-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{stats?.input?.toLocaleString('en-US') || 0}</p>
                  <p className="text-xs text-amber-600">القراءات</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="py-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{stats?.cobill?.toLocaleString('en-US') || 0}</p>
                  <p className="text-xs text-green-600">الفواتير</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="py-3 text-center">
                  <p className="text-2xl font-bold text-purple-700">{stats?.output?.toLocaleString('en-US') || 0}</p>
                  <p className="text-xs text-purple-600">الخرج</p>
                </CardContent>
              </Card>
              <Card className="bg-pink-50 border-pink-200">
                <CardContent className="py-3 text-center">
                  <p className="text-2xl font-bold text-pink-700">{stats?.custType?.toLocaleString('en-US') || 0}</p>
                  <p className="text-xs text-pink-600">أنواع المشتركين</p>
                </CardContent>
              </Card>
              <Card className="bg-indigo-50 border-indigo-200">
                <CardContent className="py-3 text-center">
                  <p className="text-2xl font-bold text-indigo-700">{stats?.codeRem?.toLocaleString('en-US') || 0}</p>
                  <p className="text-xs text-indigo-600">رموز الأسباب</p>
                </CardContent>
              </Card>
            </div>

            {/* Upload Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Individual Tables */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                    رفع ملفات منفصلة
                  </CardTitle>
                  <CardDescription>اختر نوع الجدول وارفع الملف المناسب</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Master */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-700">المشتركين</span>
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={uploading} onClick={() => triggerFileInput(masterInputRef)}>
                        {uploadingType === 'master' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Input */}
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-amber-600" />
                        <span className="font-medium text-amber-700">القراءات</span>
                      </div>
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700" disabled={uploading} onClick={() => triggerFileInput(inputFileRef)}>
                        {uploadingType === 'input' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Cobill */}
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-700">الفواتير</span>
                      </div>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={uploading} onClick={() => triggerFileInput(cobillInputRef)}>
                        {uploadingType === 'cobill' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Output */}
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-purple-700">الخرج</span>
                      </div>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700" disabled={uploading} onClick={() => triggerFileInput(outputInputRef)}>
                        {uploadingType === 'output' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* CustType */}
                    <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg border border-pink-200">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-pink-600" />
                        <span className="font-medium text-pink-700">أنواع المشتركين</span>
                      </div>
                      <Button size="sm" className="bg-pink-600 hover:bg-pink-700" disabled={uploading} onClick={() => triggerFileInput(custtypeInputRef)}>
                        {uploadingType === 'custtype' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* CodeRem */}
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                      <div className="flex items-center gap-2">
                        <FileArchive className="h-5 w-5 text-indigo-600" />
                        <span className="font-medium text-indigo-700">رموز الأسباب</span>
                      </div>
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" disabled={uploading} onClick={() => triggerFileInput(codremInputRef)}>
                        {uploadingType === 'codrem' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upload All from MDB */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileArchive className="h-5 w-5 text-blue-600" />
                    رفع قواعد البيانات
                  </CardTitle>
                  <CardDescription>ارفع ملفين: invest_db.mdb (البيانات الأساسية) و inputz_db.mdb (القراءات)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* invest_db.mdb */}
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Database className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <Label className="font-medium text-blue-700">invest_db.mdb</Label>
                      <p className="text-xs text-blue-600">master, cobill, output, custtype, codrem</p>
                      <p className="text-xs text-slate-500">البيانات الأساسية (بدون القراءات)</p>
                    </div>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={uploading}
                      onClick={() => triggerFileInput(investDbInputRef)}
                    >
                      {uploadingType === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span className="ms-2">رفع</span>
                    </Button>
                  </div>

                  {/* inputz_db.mdb */}
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-2 border-amber-200">
                    <div className="p-3 bg-amber-100 rounded-xl">
                      <FileSpreadsheet className="h-8 w-8 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <Label className="font-medium text-amber-700">inputz_db.mdb</Label>
                      <p className="text-xs text-amber-600">جدول input فقط</p>
                      <p className="text-xs text-slate-500">قراءات العدادات الجديدة</p>
                    </div>
                    <Button
                      className="bg-amber-600 hover:bg-amber-700"
                      disabled={uploading}
                      onClick={() => triggerFileInput(inputFileRef)}
                    >
                      {uploadingType === 'input' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span className="ms-2">رفع</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Audit Section */}
            <Card className="shadow-sm mt-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    {!canRunAudit ? (
                      <p className="text-slate-500">⚠️ يجب رفع ملف المشتركين والقراءات أولاً</p>
                    ) : stats?.auditRecords ? (
                      <p className="text-green-600 font-medium">✅ تم التدقيق - {stats.auditRecords.toLocaleString('en-US')} قراءة</p>
                    ) : (
                      <p className="text-blue-600">جاهز للتدقيق</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={clearData}>
                      <Trash2 className="h-4 w-4 me-1" />
                      مسح
                    </Button>
                    {canRunAudit && !stats?.auditRecords && (
                      <Button className="bg-green-600 hover:bg-green-700" onClick={runAudit} disabled={loading}>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin ms-2" /> : <ClipboardCheck className="h-5 w-5 ms-2" />}
                        بدء التدقيق
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Master Tab */}
          <TabsContent value="master">
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="بحث برقم الحساب أو الاسم..." value={masterSearch} onChange={(e) => setMasterSearch(e.target.value)} className="ps-10" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {masterStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="py-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">{masterStats.total.toLocaleString('en-US')}</p>
                      <p className="text-sm text-blue-600">إجمالي المشتركين</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="py-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{masterStats.avgConsum}</p>
                      <p className="text-sm text-green-600">متوسط الاستهلاك</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="py-3 text-center">
                      <p className="text-2xl font-bold text-amber-700">{masterStats.avgLastRead}</p>
                      <p className="text-sm text-amber-600">متوسط القراءة</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="py-3 text-center">
                      <p className="text-2xl font-bold text-purple-700">{masterBySector.length}</p>
                      <p className="text-sm text-purple-600">عدد القطاعات</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Card className="shadow-sm">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <div className="h-[70vh] overflow-auto border rounded-lg">
                      <table className="w-full border-collapse text-xs">
                        <thead className="sticky top-0 z-20 bg-slate-200 shadow-sm">
                          <tr className="border-b-2 border-slate-400">
                            <th className="font-bold whitespace-nowrap text-slate-500 bg-slate-200 text-center p-2">#</th>
                            <th className="font-bold whitespace-nowrap text-blue-600 bg-blue-50 text-center p-2">رقم الحساب</th>
                            <th className="font-bold whitespace-nowrap text-emerald-600 bg-emerald-50 text-center p-2">الاسم</th>
                            <th className="font-bold whitespace-nowrap text-amber-600 bg-amber-50 text-center p-2">العنوان</th>
                            <th className="font-bold whitespace-nowrap text-pink-600 bg-pink-50 text-center p-2">رقم المقياس</th>
                            <th className="font-bold whitespace-nowrap text-indigo-600 bg-indigo-50 text-center p-2">الصنف</th>
                            <th className="font-bold whitespace-nowrap text-violet-700 bg-violet-100 text-center p-2 border-2 border-violet-300">القراءة السابقة</th>
                            <th className="font-bold whitespace-nowrap text-orange-700 bg-orange-100 text-center p-2 border-2 border-orange-300">القراءة اللاحقة</th>
                            <th className="font-bold whitespace-nowrap text-emerald-700 bg-emerald-100 text-center p-2 border-2 border-emerald-300">الفرق</th>
                            <th className="font-bold whitespace-nowrap text-red-600 bg-red-50 text-center p-2">الديون</th>
                            <th className="font-bold whitespace-nowrap text-green-600 bg-green-50 text-center p-2">التسديد</th>
                            <th className="font-bold whitespace-nowrap text-slate-500 bg-slate-100 text-center p-2">ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {masterData.map((r, idx) => (
                            <tr key={r.id} className="hover:bg-slate-50 border-b border-slate-100">
                              <td className="text-center p-2 text-slate-400">{(masterPagination.page - 1) * 50 + idx + 1}</td>
                              <td className="text-center p-2 font-mono font-medium text-slate-700">{r.accountNo}</td>
                              <td className="text-center p-2 text-slate-600 truncate max-w-[120px]">{r.name || '-'}</td>
                              <td className="text-center p-2 text-slate-600 truncate max-w-[100px]">{r.address || '-'}</td>
                              <td className="text-center p-2 text-slate-600">{r.meter?.toLocaleString('en-US') || '-'}</td>
                              <td className="text-center p-2 text-indigo-700 font-medium">{r.custDesc || r.cust || '-'}</td>
                              <td className="text-center p-2 text-violet-700 font-bold bg-violet-50">{r.prevRead?.toLocaleString('en-US') || '-'}</td>
                              <td className="text-center p-2 text-orange-700 font-bold bg-orange-50">{r.lastRead?.toLocaleString('en-US') || '-'}</td>
                              <td className="text-center p-2 text-emerald-700 font-bold bg-emerald-50">{r.def?.toLocaleString('en-US') || '-'}</td>
                              <td className="text-center p-2 text-red-600">{r.outs?.toLocaleString('en-US') || '-'}</td>
                              <td className="text-center p-2 text-green-600">{r.payment?.toLocaleString('en-US') || '-'}</td>
                              <td className="text-center p-2 text-slate-500 truncate max-w-[80px]">{r.note || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {masterPagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    عرض {((masterPagination.page - 1) * 50 + 1).toLocaleString('en-US')} - {Math.min(masterPagination.page * 50, masterPagination.total).toLocaleString('en-US')} من {masterPagination.total.toLocaleString('en-US')}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => loadMasterData(masterPagination.page - 1)} disabled={masterPagination.page === 1}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span>{masterPagination.page} / {masterPagination.totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => loadMasterData(masterPagination.page + 1)} disabled={masterPagination.page === masterPagination.totalPages}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Cobill Tab */}
          <TabsContent value="cobill">
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-sm">
                      <div className="relative">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="بحث..." value={cobillSearch} onChange={(e) => setCobillSearch(e.target.value)} className="ps-10" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {cobillStats && (
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="py-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{cobillStats.total.toLocaleString('en-US')}</p>
                      <p className="text-sm text-green-600">إجمالي الفواتير</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="py-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">{cobillStats.avgConsum}</p>
                      <p className="text-sm text-blue-600">متوسط الاستهلاك</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="py-3 text-center">
                      <p className="text-2xl font-bold text-amber-700">{cobillStats.avgLastRead}</p>
                      <p className="text-sm text-amber-600">متوسط القراءة</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Card className="shadow-sm">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <div className="flex flex-col h-[60vh]">
                      {/* العناوين الثابتة */}
                      <div className="flex-shrink-0 bg-slate-200 border-b-2 border-slate-400 shadow-md">
                        <div className="grid grid-cols-8 gap-0 text-center text-sm font-bold">
                          <div className="p-3 text-slate-500 bg-slate-200">#</div>
                          <div className="p-3 text-blue-600 bg-blue-50">رقم الحساب</div>
                          <div className="p-3 text-emerald-600 bg-emerald-50">الاسم</div>
                          <div className="p-3 text-pink-600 bg-pink-50">رقم العداد</div>
                          <div className="p-3 text-purple-600 bg-purple-50">القراءة السابقة</div>
                          <div className="p-3 text-orange-600 bg-orange-50">القراءة الأخيرة</div>
                          <div className="p-3 text-cyan-600 bg-cyan-50">متوسط</div>
                          <div className="p-3 text-indigo-600 bg-indigo-50">القطاع</div>
                        </div>
                      </div>
                      {/* البيانات */}
                      <div className="flex-1 overflow-y-auto">
                        {cobillData.map((r, idx) => (
                          <div key={r.id} className="grid grid-cols-8 gap-0 text-center text-sm border-b border-slate-100 hover:bg-slate-50">
                            <div className="p-2 text-slate-400">{(cobillPagination.page - 1) * 50 + idx + 1}</div>
                            <div className="p-2 font-mono font-medium text-slate-700">{r.accountNo}</div>
                            <div className="p-2 text-slate-600 truncate max-w-[120px]">{r.name || '-'}</div>
                            <div className="p-2 text-slate-600">{r.meterNo?.toLocaleString('en-US') || '-'}</div>
                            <div className="p-2 text-purple-600">{r.prevRead?.toLocaleString('en-US') || '-'}</div>
                            <div className="p-2 text-orange-600">{r.lastRead?.toLocaleString('en-US') || '-'}</div>
                            <div className="p-2 text-cyan-600 font-medium">{r.avgConsum?.toLocaleString('en-US') || '-'}</div>
                            <div className="p-2 text-slate-600">{r.sector || '-'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {cobillPagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    عرض {((cobillPagination.page - 1) * 50 + 1).toLocaleString('en-US')} - {Math.min(cobillPagination.page * 50, cobillPagination.total).toLocaleString('en-US')} من {cobillPagination.total.toLocaleString('en-US')}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => loadCobillData(cobillPagination.page - 1)} disabled={cobillPagination.page === 1}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span>{cobillPagination.page} / {cobillPagination.totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => loadCobillData(cobillPagination.page + 1)} disabled={cobillPagination.page === cobillPagination.totalPages}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Output Tab */}
          <TabsContent value="output">
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 max-w-sm">
                      <div className="relative">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="بحث..." value={outputSearch} onChange={(e) => setOutputSearch(e.target.value)} className="ps-10" />
                      </div>
                    </div>
                    {outputByType.length > 0 && (
                      <Select value={outputTypeFilter} onValueChange={setOutputTypeFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="جميع الأنواع" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">جميع الأنواع</SelectItem>
                          {outputByType.map(t => (
                            <SelectItem key={t.type} value={t.type.toString()}>نوع {t.type} ({t.count})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {outputByEmployee.length > 0 && (
                      <Select value={outputEmployeeFilter} onValueChange={setOutputEmployeeFilter}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="جميع الموظفين" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">جميع الموظفين</SelectItem>
                          {outputByEmployee.map(e => (
                            <SelectItem key={e.name} value={e.name}>{e.name} ({e.count})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardContent>
              </Card>

              {outputStats && (
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="py-3 text-center">
                      <p className="text-2xl font-bold text-purple-700">{outputStats.total.toLocaleString('en-US')}</p>
                      <p className="text-sm text-purple-600">إجمالي السجلات</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="py-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">{outputStats.avgConsum}</p>
                      <p className="text-sm text-blue-600">متوسط الاستهلاك</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Card className="shadow-sm">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <div className="h-[70vh] overflow-auto border rounded-lg">
                      <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-20 bg-slate-200 shadow-sm">
                          <tr className="border-b-2 border-slate-400">
                            <th className="font-bold whitespace-nowrap text-slate-500 bg-slate-200 text-center p-2">#</th>
                            <th className="font-bold whitespace-nowrap text-blue-600 bg-blue-50 text-center p-2">رقم الحساب</th>
                            <th className="font-bold whitespace-nowrap text-emerald-600 bg-emerald-50 text-center p-2">الاسم</th>
                            <th className="font-bold whitespace-nowrap text-orange-700 bg-orange-100 text-center p-2">القراءة</th>
                            <th className="font-bold whitespace-nowrap text-violet-700 bg-violet-100 text-center p-2">السابقة</th>
                            <th className="font-bold whitespace-nowrap text-cyan-600 bg-cyan-50 text-center p-2">النوع</th>
                            <th className="font-bold whitespace-nowrap text-green-700 bg-green-100 text-center p-2 border-2 border-green-300">المبلغ</th>
                            <th className="font-bold whitespace-nowrap text-red-600 bg-red-50 text-center p-2">الديون</th>
                            <th className="font-bold whitespace-nowrap text-pink-600 bg-pink-50 text-center p-2">الموظف</th>
                            <th className="font-bold whitespace-nowrap text-indigo-600 bg-indigo-50 text-center p-2">القطاع</th>
                          </tr>
                        </thead>
                        <tbody>
                          {outputData.map((r, idx) => (
                            <tr key={r.id} className="hover:bg-slate-50 border-b border-slate-100">
                              <td className="text-center p-2 text-slate-400">{(outputPagination.page - 1) * 50 + idx + 1}</td>
                              <td className="text-center p-2 font-mono font-medium text-slate-700">{r.accountNo}</td>
                              <td className="text-center p-2 text-slate-600 truncate max-w-[120px]">{r.name || '-'}</td>
                              <td className="text-center p-2 text-orange-700 font-bold bg-orange-50">{r.read?.toLocaleString('en-US') || '-'}</td>
                              <td className="text-center p-2 text-violet-700 font-bold bg-violet-50">{r.prevRead?.toLocaleString('en-US') || '-'}</td>
                              <td className="text-center p-2">
                                <Badge className={r.type === 5 ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-slate-100 text-slate-600'}>
                                  {r.type || '-'}
                                </Badge>
                              </td>
                              <td className="text-center p-2 text-green-700 font-bold bg-green-50">{r.amount?.toLocaleString('en-US') || '-'}</td>
                              <td className="text-center p-2 text-red-600">{r.outs?.toLocaleString('en-US') || '-'}</td>
                              <td className="text-center p-2 text-slate-600">{r.enterName || '-'}</td>
                              <td className="text-center p-2 text-slate-600">{r.sector || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {outputPagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    عرض {((outputPagination.page - 1) * 50 + 1).toLocaleString('en-US')} - {Math.min(outputPagination.page * 50, outputPagination.total).toLocaleString('en-US')} من {outputPagination.total.toLocaleString('en-US')}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => loadOutputData(outputPagination.page - 1)} disabled={outputPagination.page === 1}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span>{outputPagination.page} / {outputPagination.totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => loadOutputData(outputPagination.page + 1)} disabled={outputPagination.page === outputPagination.totalPages}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Inputs Tab */}
          <TabsContent value="inputs">
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 max-w-sm">
                      <div className="relative">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="بحث برقم الحساب..." value={inputSearch} onChange={(e) => setInputSearch(e.target.value)} className="ps-10" />
                      </div>
                    </div>
                    {byEmployee.length > 0 && (
                      <Select value={inputEmployeeFilter} onValueChange={setInputEmployeeFilter}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="جميع الموظفين" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">جميع الموظفين</SelectItem>
                          {byEmployee.map(e => (
                            <SelectItem key={e.name} value={e.name}>{e.name} ({e.count})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button variant="destructive" size="sm" onClick={deleteInputs} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      <span className="me-1">حذف القراءات</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {inputStats && (
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="py-3 text-center">
                      <p className="text-2xl font-bold text-amber-700">{inputStats.total.toLocaleString('en-US')}</p>
                      <p className="text-sm text-amber-600">إجمالي القراءات</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="py-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{inputStats.withReadings.toLocaleString('en-US')}</p>
                      <p className="text-sm text-green-600">قراءات مسجلة</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="py-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">{inputStats.uniqueEmployees}</p>
                      <p className="text-sm text-blue-600">موظفين</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Card className="shadow-sm">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <div className="flex flex-col h-[60vh]">
                      {/* العناوين الثابتة */}
                      <div className="flex-shrink-0 bg-slate-200 border-b-2 border-slate-400 shadow-md">
                        <div className="grid grid-cols-6 gap-0 text-center text-sm font-bold">
                          <div className="p-3 text-slate-500 bg-slate-200">#</div>
                          <div className="p-3 text-blue-600 bg-blue-50">رقم الحساب</div>
                          <div className="p-3 text-orange-600 bg-orange-50">القراءة</div>
                          <div className="p-3 text-orange-500 bg-orange-50">تاريخ القراءة</div>
                          <div className="p-3 text-pink-600 bg-pink-50">الموظف</div>
                          <div className="p-3 text-indigo-600 bg-indigo-50">القطاع</div>
                        </div>
                      </div>
                      {/* البيانات */}
                      <div className="flex-1 overflow-y-auto">
                        {inputData.map((r, idx) => (
                          <div key={r.id} className="grid grid-cols-6 gap-0 text-center text-sm border-b border-slate-100 hover:bg-slate-50">
                            <div className="p-2 text-slate-400">{(inputPagination.page - 1) * 50 + idx + 1}</div>
                            <div className="p-2 font-mono font-medium text-slate-700">{r.accountNo}</div>
                            <div className="p-2 text-orange-600">{r.read?.toLocaleString('en-US') || '-'}</div>
                            <div className="p-2 text-slate-500">{r.readDate || '-'}</div>
                            <div className="p-2 text-slate-600">{r.enterName || '-'}</div>
                            <div className="p-2 text-slate-600">{r.sector || '-'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {inputPagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    عرض {((inputPagination.page - 1) * 50 + 1).toLocaleString('en-US')} - {Math.min(inputPagination.page * 50, inputPagination.total).toLocaleString('en-US')} من {inputPagination.total.toLocaleString('en-US')}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => loadInputData(inputPagination.page - 1)} disabled={inputPagination.page === 1}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span>{inputPagination.page} / {inputPagination.totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => loadInputData(inputPagination.page + 1)} disabled={inputPagination.page === inputPagination.totalPages}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <div className="space-y-4">
              {/* العنوان */}
              <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">لوحة الإحصائيات الشاملة</h2>
                      <p className="text-blue-100 mt-1">نظرة عامة على جميع البيانات والمؤشرات</p>
                    </div>
                    <BarChart3 className="h-12 w-12 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              {/* الإحصائيات الرئيسية */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-3">
                      <Database className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stats?.master?.toLocaleString('en-US') || 0}</p>
                    <p className="text-sm text-slate-500">مشترك</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <div className="p-3 bg-amber-100 rounded-full w-fit mx-auto mb-3">
                      <FileSpreadsheet className="h-6 w-6 text-amber-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stats?.input?.toLocaleString('en-US') || 0}</p>
                    <p className="text-sm text-slate-500">قراءة مدخلة</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-3">
                      <Receipt className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stats?.cobill?.toLocaleString('en-US') || 0}</p>
                    <p className="text-sm text-slate-500">فاتورة</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-3">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stats?.output?.toLocaleString('en-US') || 0}</p>
                    <p className="text-sm text-slate-500">سجل خرج</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <div className="p-3 bg-indigo-100 rounded-full w-fit mx-auto mb-3">
                      <Users className="h-6 w-6 text-indigo-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{byEmployee.length}</p>
                    <p className="text-sm text-slate-500">موظف</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <div className="p-3 bg-emerald-100 rounded-full w-fit mx-auto mb-3">
                      <ClipboardCheck className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stats?.auditRecords?.toLocaleString('en-US') || 0}</p>
                    <p className="text-sm text-slate-500">مدقق</p>
                  </CardContent>
                </Card>
              </div>

              {/* مؤشرات القراءة */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-green-600 mb-1">نسبة التغطية (القراءات/المشتركين)</p>
                    <p className="text-4xl font-bold text-green-700">
                      {stats?.master ? Math.round(((stats.input || 0) / stats.master) * 100) : 0}%
                    </p>
                    <p className="text-xs text-green-500 mt-1">نسبة القراءات المدخلة</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-blue-600 mb-1">متوسط الاستهلاك</p>
                    <p className="text-4xl font-bold text-blue-700">{masterStats?.avgConsum || 0}</p>
                    <p className="text-xs text-blue-500 mt-1">كيلوواط/شهر</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-amber-600 mb-1">متوسط القراءة</p>
                    <p className="text-4xl font-bold text-amber-700">{masterStats?.avgLastRead || 0}</p>
                    <p className="text-xs text-amber-500 mt-1">كيلوواط</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-purple-600 mb-1">عدد القطاعات</p>
                    <p className="text-4xl font-bold text-purple-700">{masterBySector.length}</p>
                    <p className="text-xs text-purple-500 mt-1">قطاع</p>
                  </CardContent>
                </Card>
              </div>

              {/* الإحصائيات المالية */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-emerald-500" />
                    الإحصائيات المالية
                  </CardTitle>
                  <CardDescription>مجموع المبالغ المدفوعة والديون</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-2xl font-bold text-emerald-600">{masterStats?.totalPayment?.toLocaleString('en-US') || 0}</p>
                      <p className="text-xs text-emerald-600">إجمالي المدفوعات</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-2xl font-bold text-red-600">{masterStats?.totalDebts?.toLocaleString('en-US') || 0}</p>
                      <p className="text-xs text-red-600">إجمالي الديون</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-2xl font-bold text-orange-600">{masterStats?.totalOuts?.toLocaleString('en-US') || 0}</p>
                      <p className="text-xs text-orange-600">الديون الحالية</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-2xl font-bold text-amber-600">{masterStats?.totalOutsBf?.toLocaleString('en-US') || 0}</p>
                      <p className="text-xs text-amber-600">ديون سابقة</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-2xl font-bold text-yellow-600">{masterStats?.totalOutsBef17?.toLocaleString('en-US') || 0}</p>
                      <p className="text-xs text-yellow-600">ديون قبل 2017</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* إحصائيات التدقيق */}
              {auditStats && (
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5 text-emerald-500" />
                      إحصائيات التدقيق
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      <div className="text-center p-4 bg-slate-50 rounded-lg">
                        <p className="text-3xl font-bold text-slate-700">{auditStats.total?.toLocaleString('en-US') || 0}</p>
                        <p className="text-xs text-slate-500">إجمالي</p>
                      </div>
                      <div className="text-center p-4 bg-emerald-50 rounded-lg">
                        <p className="text-3xl font-bold text-emerald-600">{auditStats.accepted?.toLocaleString('en-US') || 0}</p>
                        <p className="text-xs text-emerald-600">مقبول</p>
                        <p className="text-xs text-emerald-500">{auditStats.total ? Math.round((auditStats.accepted / auditStats.total) * 100) : 0}%</p>
                      </div>
                      <div className="text-center p-4 bg-amber-50 rounded-lg">
                        <p className="text-3xl font-bold text-amber-600">{auditStats.high?.toLocaleString('en-US') || 0}</p>
                        <p className="text-xs text-amber-600">عالي</p>
                        <p className="text-xs text-amber-500">{auditStats.total ? Math.round((auditStats.high / auditStats.total) * 100) : 0}%</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-3xl font-bold text-red-600">{auditStats.highRejected?.toLocaleString('en-US') || 0}</p>
                        <p className="text-xs text-red-600">عالي مرفوض</p>
                        <p className="text-xs text-red-500">{auditStats.total ? Math.round((auditStats.highRejected / auditStats.total) * 100) : 0}%</p>
                      </div>
                      <div className="text-center p-4 bg-violet-50 rounded-lg">
                        <p className="text-3xl font-bold text-violet-600">{auditStats.cycle?.toLocaleString('en-US') || 0}</p>
                        <p className="text-xs text-violet-600">دورة</p>
                        <p className="text-xs text-violet-500">{auditStats.total ? Math.round((auditStats.cycle / auditStats.total) * 100) : 0}%</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-3xl font-bold text-blue-600">{auditStats.needsReview?.toLocaleString('en-US') || 0}</p>
                        <p className="text-xs text-blue-600">مراجعة</p>
                        <p className="text-xs text-blue-500">{auditStats.total ? Math.round((auditStats.needsReview / auditStats.total) * 100) : 0}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* توزيع حسب القطاع */}
              {masterBySector.length > 0 && (
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-sm">توزيع المشتركين حسب القطاع</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {masterBySector.map(s => (
                        <Badge key={s.sector as number} variant="outline" className="text-sm px-3 py-1">
                          قطاع {s.sector}: {s.count.toLocaleString('en-US')}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* أداء الموظفين */}
              {byEmployee.length > 0 && (
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-500" />
                      أداء الموظفين
                    </CardTitle>
                    <CardDescription>توزيع القراءات حسب الموظف</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {byEmployee.slice(0, 10).map((e, idx) => {
                        const percentage = (e.count / (stats?.input || 1)) * 100;
                        return (
                          <div key={e.name} className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                              idx === 1 ? 'bg-slate-200 text-slate-700' :
                              idx === 2 ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <p className="font-medium text-slate-700">{e.name}</p>
                                <Badge variant="secondary">{e.count.toLocaleString('en-US')}</Badge>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full">
                                <div 
                                  className={`h-2 rounded-full ${
                                    idx === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                    idx === 1 ? 'bg-gradient-to-r from-slate-300 to-slate-400' :
                                    idx === 2 ? 'bg-gradient-to-r from-amber-300 to-amber-400' :
                                    'bg-gradient-to-r from-blue-400 to-blue-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit">
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="بحث برقم الحساب..."
                          value={auditSearch}
                          onChange={(e) => setAuditSearch(e.target.value)}
                          className="ps-10"
                        />
                      </div>
                    </div>
                    <Select value={auditFilter} onValueChange={setAuditFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="جميع الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="needsReview">يحتاج مراجعة</SelectItem>
                        <SelectItem value="0">مقبول</SelectItem>
                        <SelectItem value="2">مرفوض</SelectItem>
                        <SelectItem value="6">عالي مرفوض</SelectItem>
                        <SelectItem value="7">عالي</SelectItem>
                        <SelectItem value="8">دورة</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                      <Download className="h-4 w-4 me-1" />
                      تصدير
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      const params = new URLSearchParams();
                      if (auditFilter !== 'all') params.append('statusCode', auditFilter);
                      if (auditSearch) params.append('search', auditSearch);
                      window.open(`/api/print-audit?${params.toString()}`, '_blank');
                    }}>
                      <Printer className="h-4 w-4 me-1" />
                      طباعة
                    </Button>
                    <Button variant="outline" size="sm" onClick={runAudit} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      <span className="me-1">إعادة التدقيق</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* بطاقات الإحصائيات */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Card className="border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setAuditFilter('all')}>
                  <CardContent className="py-3 text-center">
                    <p className="text-2xl font-bold text-slate-700">{auditStats?.total?.toLocaleString('en-US') || 0}</p>
                    <p className="text-xs text-slate-500">إجمالي</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-200 bg-emerald-50/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setAuditFilter('0')}>
                  <CardContent className="py-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{auditStats?.accepted?.toLocaleString('en-US') || 0}</p>
                    <p className="text-xs text-emerald-600">مقبول</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setAuditFilter('7')}>
                  <CardContent className="py-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{auditStats?.high?.toLocaleString('en-US') || 0}</p>
                    <p className="text-xs text-amber-600">عالي</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setAuditFilter('6')}>
                  <CardContent className="py-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{auditStats?.highRejected?.toLocaleString('en-US') || 0}</p>
                    <p className="text-xs text-red-600">عالي مرفوض</p>
                  </CardContent>
                </Card>
                <Card className="border-violet-200 bg-violet-50/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setAuditFilter('8')}>
                  <CardContent className="py-3 text-center">
                    <p className="text-2xl font-bold text-violet-600">{auditStats?.cycle?.toLocaleString('en-US') || 0}</p>
                    <p className="text-xs text-violet-600">دورة</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-slate-50/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setAuditFilter('needsReview')}>
                  <CardContent className="py-3 text-center">
                    <p className="text-2xl font-bold text-slate-600">{auditStats?.needsReview?.toLocaleString('en-US') || 0}</p>
                    <p className="text-xs text-slate-600">مراجعة</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <div className="h-[70vh] overflow-auto border rounded-lg">
                      <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-20 bg-slate-200 shadow-sm">
                          <tr className="border-b-2 border-slate-400">
                            <th className="font-bold whitespace-nowrap text-slate-500 bg-slate-200 text-center p-3">#</th>
                            <th 
                              className="font-bold whitespace-nowrap text-blue-600 bg-blue-50 text-center p-3 cursor-pointer hover:bg-blue-200"
                              onClick={() => setAuditSort(auditSort === 'accountNo' ? 'accountNo-desc' : 'accountNo')}
                            >
                              رقم الحساب {auditSort === 'accountNo' ? '▲' : auditSort === 'accountNo-desc' ? '▼' : ''}
                            </th>
                            <th 
                              className="font-bold whitespace-nowrap text-violet-700 bg-violet-100 text-center p-3 cursor-pointer hover:bg-violet-200"
                              onClick={() => setAuditSort(auditSort === 'prevRead' ? 'prevRead-desc' : 'prevRead')}
                            >
                              القراءة السابقة {auditSort === 'prevRead' ? '▲' : auditSort === 'prevRead-desc' ? '▼' : ''}
                            </th>
                            <th className="font-bold whitespace-nowrap text-violet-600 bg-violet-50 text-center p-3">تاريخ السابقة</th>
                            <th 
                              className="font-bold whitespace-nowrap text-orange-700 bg-orange-100 text-center p-3 cursor-pointer hover:bg-orange-200"
                              onClick={() => setAuditSort(auditSort === 'currentRead' ? 'currentRead-desc' : 'currentRead')}
                            >
                              القراءة الحالية {auditSort === 'currentRead' ? '▲' : auditSort === 'currentRead-desc' ? '▼' : ''}
                            </th>
                            <th className="font-bold whitespace-nowrap text-orange-600 bg-orange-50 text-center p-3">تاريخ الحالية</th>
                            <th 
                              className="font-bold whitespace-nowrap text-emerald-600 bg-emerald-50 text-center p-3 cursor-pointer hover:bg-emerald-200"
                              onClick={() => setAuditSort(auditSort === 'diff' ? 'diff-desc' : 'diff')}
                            >
                              الاستهلاك {auditSort === 'diff' ? '▲' : auditSort === 'diff-desc' ? '▼' : ''}
                            </th>
                            <th 
                              className="font-bold whitespace-nowrap text-cyan-600 bg-cyan-50 text-center p-3 cursor-pointer hover:bg-cyan-200"
                              onClick={() => setAuditSort(auditSort === 'days' ? 'days-desc' : 'days')}
                            >
                              المدة {auditSort === 'days' ? '▲' : auditSort === 'days-desc' ? '▼' : ''}
                            </th>
                            <th 
                              className="font-bold whitespace-nowrap text-sky-700 bg-sky-100 text-center p-3 cursor-pointer hover:bg-sky-200"
                              onClick={() => setAuditSort(auditSort === 'dailyRate' ? 'dailyRate-desc' : 'dailyRate')}
                            >
                              المعدل {auditSort === 'dailyRate' ? '▲' : auditSort === 'dailyRate-desc' ? '▼' : ''}
                            </th>
                            <th className="font-bold whitespace-nowrap text-sky-600 bg-sky-50 text-center p-3">المعدل 1</th>
                            <th className="font-bold whitespace-nowrap text-sky-600 bg-sky-50 text-center p-3">المعدل 2</th>
                            <th className="font-bold whitespace-nowrap text-sky-600 bg-sky-50 text-center p-3">المعدل 3</th>
                            <th 
                              className="font-bold whitespace-nowrap text-pink-600 bg-pink-50 text-center p-3 cursor-pointer hover:bg-pink-200"
                              onClick={() => setAuditSort(auditSort === 'enterName' ? 'enterName-desc' : 'enterName')}
                            >
                              الموظف {auditSort === 'enterName' ? '▲' : auditSort === 'enterName-desc' ? '▼' : ''}
                            </th>
                            <th 
                              className="font-bold whitespace-nowrap text-red-600 bg-red-50 text-center p-3 cursor-pointer hover:bg-red-200"
                              onClick={() => setAuditSort(auditSort === 'statusCode' ? 'statusCode-desc' : 'statusCode')}
                            >
                              الحالة {auditSort === 'statusCode' ? '▲' : auditSort === 'statusCode-desc' ? '▼' : ''}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditRecords.map((r, idx) => (
                            <tr key={r.id} className="hover:bg-slate-50 border-b border-slate-100">
                              <td className="text-center p-2 text-slate-400">{(auditPagination.page - 1) * 50 + idx + 1}</td>
                              <td className="text-center p-2 font-mono font-medium text-slate-700">{r.accountNo}</td>
                              <td className="text-center p-2 text-violet-700 font-bold bg-violet-50">{r.prevRead?.toLocaleString('en-US') || '-'}</td>
                              <td className="text-center p-2 text-violet-600 bg-violet-50/50">{r.prevDate || '-'}</td>
                              <td className="text-center p-2 text-orange-700 font-bold bg-orange-50">{r.currentRead?.toLocaleString('en-US') || '-'}</td>
                              <td className="text-center p-2 text-orange-600 bg-orange-50/50">{r.currentDate || '-'}</td>
                              <td className={`text-center p-2 ${r.diff && r.diff < 0 ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                                {r.diff?.toLocaleString('en-US') || '-'}
                              </td>
                              <td className="text-center p-2 text-slate-600">{r.days || '-'}</td>
                              <td className="text-center p-2 text-sky-700 font-bold bg-sky-50">{r.dailyRate ? Math.round(r.dailyRate) : '-'}</td>
                              <td className="text-center p-2 text-sky-600 bg-sky-50/50">{r.rate1 ? Math.round(r.rate1) : '-'}</td>
                              <td className="text-center p-2 text-sky-600 bg-sky-50/50">{r.rate2 ? Math.round(r.rate2) : '-'}</td>
                              <td className="text-center p-2 text-sky-600 bg-sky-50/50">{r.rate3 ? Math.round(r.rate3) : '-'}</td>
                              <td className="text-center p-2 text-slate-600">{r.enterName || '-'}</td>
                              <td className="text-center p-2">
                                <Badge className={statusColors[r.statusCode] || 'bg-gray-100'}>
                                  {r.statusDesc}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
