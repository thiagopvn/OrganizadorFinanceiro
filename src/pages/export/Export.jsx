import { useState, useMemo } from 'react'
import { Button, Card } from '../../components/ui'
import { PageHeader } from '../../components/layout'
import useStore from '../../lib/store'
import { formatCurrency, CATEGORIES } from '../../lib/utils'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { format, subMonths, startOfMonth, endOfMonth, subQuarters } from 'date-fns'
import {
  FileText,
  Table,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Check,
  Calendar,
  Lock,
  BadgeCheck,
} from 'lucide-react'

const FORMATS = [
  {
    id: 'pdf',
    icon: FileText,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50 dark:bg-red-900/20',
    title: 'Documento PDF (.pdf)',
    description: 'Extrato oficial para declara\u00e7\u00e3o fiscal',
  },
  {
    id: 'csv',
    icon: Table,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    title: 'Planilha CSV (.csv)',
    description: 'Para Excel ou Google Sheets',
  },
  {
    id: 'ofx',
    icon: FileSpreadsheet,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    title: 'Financeiro OFX (.ofx)',
    description: 'Compat\u00edvel com Quicken e similares',
  },
]

const PERIODS = [
  { id: 'month', label: 'Este M\u00eas' },
  { id: 'quarter', label: '\u00daltimo Trimestre' },
  { id: 'custom', label: 'Personalizado' },
]

export default function Export() {
  const navigate = useNavigate()
  const { transactions } = useStore()
  const [selectedFormat, setSelectedFormat] = useState('csv')
  const [selectedPeriod, setSelectedPeriod] = useState('quarter')
  const [exporting, setExporting] = useState(false)

  const filteredTransactions = useMemo(() => {
    const now = new Date()
    let start, end
    if (selectedPeriod === 'month') {
      start = startOfMonth(now)
      end = endOfMonth(now)
    } else if (selectedPeriod === 'quarter') {
      start = startOfMonth(subMonths(now, 2))
      end = endOfMonth(now)
    } else {
      start = startOfMonth(subMonths(now, 11))
      end = endOfMonth(now)
    }
    return transactions.filter(t => {
      const d = new Date(t.date || t.createdAt)
      return d >= start && d <= end
    })
  }, [transactions, selectedPeriod])

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      alert('Nenhuma transação encontrada para o período selecionado.')
      return
    }
    setExporting(true)
    try {
      if (selectedFormat === 'csv') {
        exportCSV()
      } else if (selectedFormat === 'ofx') {
        exportOFX()
      } else {
        exportCSV() // PDF fallback to CSV
      }
    } finally {
      setExporting(false)
    }
  }

  const exportCSV = () => {
    const header = 'Data,Descrição,Categoria,Valor,Tipo,Compartilhada\n'
    const rows = filteredTransactions.map(t => {
      const d = format(new Date(t.date || t.createdAt), 'dd/MM/yyyy')
      const cat = CATEGORIES[t.category]?.label || t.category || ''
      const desc = (t.description || '').replace(/,/g, ';')
      const tipo = t.amount >= 0 ? 'Receita' : 'Despesa'
      const shared = t.isShared ? 'Sim' : 'Não'
      return `${d},${desc},${cat},${t.amount.toFixed(2)},${tipo},${shared}`
    }).join('\n')

    downloadFile(header + rows, 'unity-finance-extrato.csv', 'text/csv')
  }

  const exportOFX = () => {
    const now = format(new Date(), 'yyyyMMddHHmmss')
    let ofx = `OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n<OFX>\n<BANKMSGSRSV1>\n<STMTTRNRS>\n<STMTRS>\n<BANKTRANLIST>\n`
    filteredTransactions.forEach(t => {
      const d = format(new Date(t.date || t.createdAt), 'yyyyMMdd')
      ofx += `<STMTTRN>\n<TRNTYPE>${t.amount >= 0 ? 'CREDIT' : 'DEBIT'}\n<DTPOSTED>${d}\n<TRNAMT>${t.amount.toFixed(2)}\n<MEMO>${t.description || ''}\n</STMTTRN>\n`
    })
    ofx += `</BANKTRANLIST>\n</STMTRS>\n</STMTTRNRS>\n</BANKMSGSRSV1>\n</OFX>`
    downloadFile(ofx, 'unity-finance-extrato.ofx', 'application/x-ofx')
  }

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type: `${type};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader
        title="Exportar Relat\u00f3rios"
        actions={
          <div className="p-2 text-brand-500">
            <BadgeCheck className="w-5 h-5" />
          </div>
        }
      />

      <div className="px-5 pb-32 space-y-6 mt-4">
        {/* Illustration Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center py-6"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
              <FileText className="w-10 h-10 text-brand-500" />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-3 uppercase tracking-widest">
            Unity Secure Export Engine
          </p>
        </motion.div>

        {/* Format Selection */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Selecionar Formato
          </p>
          <div className="space-y-2.5">
            {FORMATS.map((fmt) => {
              const Icon = fmt.icon
              const isSelected = selectedFormat === fmt.id

              return (
                <button
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10 shadow-sm'
                      : 'border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${fmt.iconBg}`}>
                    <Icon className={`w-5 h-5 ${fmt.iconColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {fmt.title}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {fmt.description}
                    </p>
                  </div>

                  {/* Radio indicator */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'border-brand-500 bg-brand-500' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Period Selection */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Per\u00edodo
          </p>
          <div className="flex gap-2">
            {PERIODS.map((period) => (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id)}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  selectedPeriod === period.id
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700/50'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Custom date range display */}
          {selectedPeriod === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <Card className="!bg-slate-50 dark:!bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-brand-500" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    01 Out - 31 Dez, 2023
                  </p>
                </div>
              </Card>
            </motion.div>
          )}
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-2xl"
        >
          <Lock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
            Ao exportar, voc\u00ea concorda com nossa pol\u00edtica de seguran\u00e7a de dados. Seus relat\u00f3rios s\u00e3o criptografados e processados de forma segura.
          </p>
        </motion.div>

        {/* Generate Button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <Button fullWidth size="lg" icon={Download} onClick={handleExport} loading={exporting}>
            Gerar Relat\u00f3rio ({filteredTransactions.length} transações)
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
