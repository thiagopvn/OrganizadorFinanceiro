import { useState, useRef, useMemo, useCallback } from 'react'
import { Button, Card, Badge, ProgressBar, Modal } from '../../components/ui'
import { PageHeader } from '../../components/layout'
import useStore from '../../lib/store'
import { CATEGORIES, formatCurrency, formatDate } from '../../lib/utils'
import { importTransactionsBatch, Timestamp } from '../../lib/firebase'
import { parseOFX } from '../../lib/ofxParser'
import { processTransactions, classifyTransaction, cleanDescription } from '../../lib/categoryMatcher'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Upload, FileSpreadsheet, Check, AlertTriangle, X, ChevronDown, ChevronUp,
  ArrowRight, Shield, Loader2, CheckCircle2, XCircle, Filter, Eye, EyeOff,
  Tag, RefreshCw, Trash2, CreditCard, Building2, Calendar, Hash
} from 'lucide-react'

// Step constants
const STEP_UPLOAD = 0
const STEP_PREVIEW = 1
const STEP_IMPORTING = 2
const STEP_DONE = 3

export default function Import() {
  const { coupleId, user, transactions: existingTransactions } = useStore()

  // State
  const [step, setStep] = useState(STEP_UPLOAD)
  const [parsedData, setParsedData] = useState(null)
  const [processedTx, setProcessedTx] = useState([])
  const [selectedTx, setSelectedTx] = useState(new Set())
  const [importResult, setImportResult] = useState(null)
  const [importProgress, setImportProgress] = useState(0)
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterType, setFilterType] = useState('all') // all, expense, income
  const [showIOF, setShowIOF] = useState(true)
  const [editingTx, setEditingTx] = useState(null) // index of tx being edited
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [duplicateIds, setDuplicateIds] = useState(new Set())

  const fileInputRef = useRef(null)

  // ─── File handling ──────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (!file.name.toLowerCase().endsWith('.ofx')) {
      setError('Formato inválido. Selecione um arquivo .OFX')
      return
    }

    setFileName(file.name)

    try {
      const content = await file.text()
      const parsed = parseOFX(content)

      if (!parsed.transactions.length) {
        setError('Nenhuma transação encontrada no arquivo.')
        return
      }

      setParsedData(parsed)

      // Process and classify all transactions, passing account type for context
      const processed = processTransactions(parsed.transactions, {
        accountType: parsed.account.type
      })

      // Check for duplicates against existing transactions
      const existingFitIds = new Set(
        existingTransactions
          .filter(t => t.fitId)
          .map(t => t.fitId)
      )

      const dupes = new Set()
      processed.forEach((tx) => {
        if (tx.fitId && existingFitIds.has(tx.fitId)) {
          dupes.add(tx.fitId)
        }
      })
      setDuplicateIds(dupes)

      setProcessedTx(processed)

      // Auto-select: exclude duplicates and IOFs
      const autoSelected = new Set()
      processed.forEach((tx, i) => {
        if (!dupes.has(tx.fitId) && !tx.isIOF) {
          autoSelected.add(i)
        }
      })
      setSelectedTx(autoSelected)

      setStep(STEP_PREVIEW)
    } catch (err) {
      console.error('Parse error:', err)
      setError('Erro ao ler o arquivo OFX. Verifique se o arquivo é válido.')
    }

    // Reset input so same file can be re-selected
    e.target.value = ''
  }, [existingTransactions])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect({ target: { files: [file] } })
    }
  }, [handleFileSelect])

  // ─── Selection helpers ──────────────────────────────────────────────

  const toggleTx = (index) => {
    setSelectedTx(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const selectAll = () => {
    const all = new Set()
    filteredTx.forEach(({ originalIndex }) => all.add(originalIndex))
    setSelectedTx(all)
  }

  const deselectAll = () => setSelectedTx(new Set())

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  // ─── Category editing ──────────────────────────────────────────────

  const updateCategory = (index, category) => {
    setProcessedTx(prev => {
      const next = [...prev]
      next[index] = { ...next[index], category }
      return next
    })
    setEditingTx(null)
  }

  // ─── Filtered/grouped transactions ─────────────────────────────────

  const filteredTx = useMemo(() => {
    return processedTx
      .map((tx, i) => ({ ...tx, originalIndex: i }))
      .filter(tx => {
        if (filterCategory !== 'all' && tx.category !== filterCategory) return false
        if (filterType === 'expense' && tx.amount >= 0) return false
        if (filterType === 'income' && tx.amount < 0) return false
        if (!showIOF && tx.isIOF) return false
        return true
      })
  }, [processedTx, filterCategory, filterType, showIOF])

  const groupedByDate = useMemo(() => {
    const groups = {}
    filteredTx.forEach(tx => {
      const key = tx.date ? format(tx.date, 'yyyy-MM-dd') : 'sem-data'
      if (!groups[key]) {
        groups[key] = {
          date: tx.date,
          label: tx.date ? format(tx.date, "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Sem data',
          transactions: []
        }
      }
      groups[key].transactions.push(tx)
    })

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, group]) => ({ key, ...group }))
  }, [filteredTx])

  // ─── Stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const selected = processedTx.filter((_, i) => selectedTx.has(i))
    const totalExpenses = selected.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
    const totalIncome = selected.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
    const categories = new Set(selected.map(t => t.category))
    const duplicates = processedTx.filter(t => duplicateIds.has(t.fitId)).length

    return {
      total: processedTx.length,
      selected: selected.length,
      expenses: totalExpenses,
      income: totalIncome,
      categories: categories.size,
      duplicates,
    }
  }, [processedTx, selectedTx, duplicateIds])

  // ─── Import action ─────────────────────────────────────────────────

  const handleImport = async () => {
    if (!coupleId || selectedTx.size === 0) return

    setStep(STEP_IMPORTING)
    setImportProgress(0)

    const toImport = processedTx
      .filter((_, i) => selectedTx.has(i))
      .map(tx => ({
        description: tx.description,
        amount: tx.amount,
        category: tx.category,
        transactionType: tx.transactionType,
        date: Timestamp.fromDate(tx.date || new Date()),
        paidBy: user.uid,
        paidByName: user.displayName || user.email || '',
        isShared: true,
        splitType: 'equal',
        merchant: tx.description,
        tags: tx.installment ? [`parcela ${tx.installment.current}/${tx.installment.total}`] : [],
        comments: [],
        memo: tx.memo,
        fitId: tx.fitId,
        ...(tx.isIOF && { isIOF: true }),
        ...(tx.isEstorno && { isEstorno: true }),
        ...(tx.installment && {
          installment: tx.installment,
        }),
      }))

    // Simulate progress
    const progressInterval = setInterval(() => {
      setImportProgress(prev => Math.min(prev + 2, 90))
    }, 100)

    try {
      const result = await importTransactionsBatch(coupleId, toImport)
      clearInterval(progressInterval)
      setImportProgress(100)
      setImportResult(result)
      setTimeout(() => setStep(STEP_DONE), 500)
    } catch (err) {
      clearInterval(progressInterval)
      console.error('Import error:', err)
      setImportResult({ success: 0, errors: selectedTx.size })
      setStep(STEP_DONE)
    }
  }

  // ─── Reset ──────────────────────────────────────────────────────────

  const handleReset = () => {
    setStep(STEP_UPLOAD)
    setParsedData(null)
    setProcessedTx([])
    setSelectedTx(new Set())
    setImportResult(null)
    setImportProgress(0)
    setError(null)
    setFileName('')
    setDuplicateIds(new Set())
    setFilterCategory('all')
    setFilterType('all')
    setShowIOF(true)
    setEditingTx(null)
    setExpandedGroups(new Set())
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader
        title="Importar OFX"
        actions={
          step === STEP_PREVIEW && (
            <button onClick={handleReset} className="p-2 text-slate-500 hover:text-slate-700">
              <RefreshCw className="w-5 h-5" />
            </button>
          )
        }
      />

      <div className="px-5 pb-32 mt-4">
        <AnimatePresence mode="wait">
          {/* ─── STEP 0: Upload ─────────────────────────────────── */}
          {step === STEP_UPLOAD && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Illustration */}
              <div className="flex flex-col items-center py-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                    <Upload className="w-10 h-10 text-brand-500" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-3 uppercase tracking-widest">
                  Unity Import Engine
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition-all"
              >
                <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Toque para selecionar ou arraste o arquivo
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Suporta arquivos .OFX (Nubank, Itaú, Bradesco, etc.)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ofx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-2xl"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </motion.div>
              )}

              {/* Info */}
              <Card className="!bg-blue-50/50 dark:!bg-blue-900/10 !border-blue-100 dark:!border-blue-800/30">
                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="space-y-2 text-xs text-blue-600 dark:text-blue-400">
                    <p className="font-semibold">Como funciona:</p>
                    <ul className="space-y-1 list-disc pl-4">
                      <li>Exporte o arquivo OFX do seu banco (Nubank, Itaú, etc.)</li>
                      <li>As transações são classificadas automaticamente por categoria</li>
                      <li>Você pode revisar e editar antes de importar</li>
                      <li>Duplicatas são detectadas e marcadas automaticamente</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* ─── STEP 1: Preview ───────────────────────────────── */}
          {step === STEP_PREVIEW && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* File info card */}
              <Card>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{fileName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">
                        <Building2 className="w-3 h-3 inline mr-1" />
                        {parsedData?.bank?.org}
                      </span>
                      {parsedData?.account?.type === 'credit_card' && (
                        <Badge variant="info">
                          <CreditCard className="w-3 h-3 mr-1" />
                          Cartão
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {parsedData?.period?.start && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {format(parsedData.period.start, 'dd/MM/yyyy')} — {format(parsedData.period.end, 'dd/MM/yyyy')}
                  </div>
                )}
              </Card>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                <Card padding="p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{stats.total}</p>
                </Card>
                <Card padding="p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Selecionadas</p>
                  <p className="text-lg font-bold text-brand-500">{stats.selected}</p>
                </Card>
                <Card padding="p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Duplicatas</p>
                  <p className="text-lg font-bold text-amber-500">{stats.duplicates}</p>
                </Card>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-2">
                <Card padding="p-3" className="!border-red-100 dark:!border-red-800/30">
                  <p className="text-[10px] font-bold text-red-400 uppercase">Despesas</p>
                  <p className="text-sm font-bold text-red-500">{formatCurrency(stats.expenses)}</p>
                </Card>
                <Card padding="p-3" className="!border-emerald-100 dark:!border-emerald-800/30">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase">Receitas</p>
                  <p className="text-sm font-bold text-emerald-500">{formatCurrency(stats.income)}</p>
                </Card>
              </div>

              {/* Filters */}
              <div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filtros
                  {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      {/* Category filter */}
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Categoria</p>
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
                        >
                          <option value="all">Todas as categorias</option>
                          {Object.entries(CATEGORIES).map(([key, cat]) => (
                            <option key={key} value={key}>{cat.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Type filter */}
                      <div className="flex gap-2">
                        {[
                          { id: 'all', label: 'Todas' },
                          { id: 'expense', label: 'Despesas' },
                          { id: 'income', label: 'Receitas' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setFilterType(opt.id)}
                            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                              filterType === opt.id
                                ? 'bg-brand-500 text-white'
                                : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Toggle buttons */}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setShowIOF(!showIOF)}
                          className="flex items-center gap-2 text-xs text-slate-500"
                        >
                          {showIOF ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {showIOF ? 'Mostrando IOFs' : 'Ocultando IOFs'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Select all / none */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  {filteredTx.length} transações listadas
                </p>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs font-semibold text-brand-500">
                    Selecionar tudo
                  </button>
                  <span className="text-slate-300">|</span>
                  <button onClick={deselectAll} className="text-xs font-semibold text-slate-400">
                    Nenhuma
                  </button>
                </div>
              </div>

              {/* Transaction list grouped by date */}
              <div className="space-y-3">
                {groupedByDate.map((group) => {
                  const isExpanded = expandedGroups.has(group.key) || groupedByDate.length <= 5
                  const groupTotal = group.transactions.reduce((s, t) => s + t.amount, 0)
                  const groupSelectedCount = group.transactions.filter(t => selectedTx.has(t.originalIndex)).length

                  return (
                    <div key={group.key}>
                      <button
                        onClick={() => toggleGroup(group.key)}
                        className="flex items-center justify-between w-full py-2 px-1"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                            {group.label}
                          </p>
                          <Badge variant={groupSelectedCount > 0 ? 'brand' : 'info'}>
                            {groupSelectedCount}/{group.transactions.length}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${groupTotal < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {formatCurrency(groupTotal)}
                          </span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-1.5 overflow-hidden"
                          >
                            {group.transactions.map((tx) => {
                              const isDuplicate = duplicateIds.has(tx.fitId)
                              const isSelected = selectedTx.has(tx.originalIndex)
                              const cat = CATEGORIES[tx.category]

                              return (
                                <div
                                  key={tx.originalIndex}
                                  className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                                    isDuplicate
                                      ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30 opacity-60'
                                      : isSelected
                                        ? 'bg-white dark:bg-slate-800 border-brand-200 dark:border-brand-700/50 shadow-sm'
                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 opacity-50'
                                  }`}
                                >
                                  {/* Checkbox */}
                                  <button
                                    onClick={() => toggleTx(tx.originalIndex)}
                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                                      isSelected
                                        ? 'bg-brand-500 border-brand-500'
                                        : 'border-slate-300 dark:border-slate-600'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                  </button>

                                  {/* Category dot */}
                                  <button
                                    onClick={() => setEditingTx(tx.originalIndex)}
                                    className="shrink-0"
                                    title="Editar categoria"
                                  >
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                                      style={{ backgroundColor: cat?.color || '#64748b' }}
                                    >
                                      {(cat?.label || '?')[0]}
                                    </div>
                                  </button>

                                  {/* Description */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                      {tx.description || tx.memo}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] text-slate-400 truncate">
                                        {cat?.label || tx.category}
                                      </span>
                                      {tx.installment && (
                                        <Badge variant="info">
                                          {tx.installment.current}/{tx.installment.total}
                                        </Badge>
                                      )}
                                      {isDuplicate && (
                                        <Badge variant="warning">Duplicata</Badge>
                                      )}
                                      {tx.isEstorno && (
                                        <Badge variant="success">Estorno</Badge>
                                      )}
                                      {tx.isIOF && (
                                        <Badge variant="warning">IOF</Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Amount */}
                                  <p className={`text-sm font-bold shrink-0 ${
                                    tx.amount >= 0 ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-200'
                                  }`}>
                                    {formatCurrency(tx.amount)}
                                  </p>
                                </div>
                              )
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>

              {/* Import button */}
              <div className="sticky bottom-20 pt-4">
                <Button
                  fullWidth
                  size="lg"
                  icon={ArrowRight}
                  onClick={handleImport}
                  disabled={selectedTx.size === 0 || !coupleId}
                >
                  Importar {selectedTx.size} transações
                </Button>
                {!coupleId && (
                  <p className="text-xs text-red-500 text-center mt-2">
                    Faça login para importar transações
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── STEP 2: Importing ─────────────────────────────── */}
          {step === STEP_IMPORTING && (
            <motion.div
              key="importing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center py-16 space-y-6"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  Importando transações...
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {Math.round(importProgress)}% concluído
                </p>
              </div>
              <div className="w-full max-w-xs">
                <ProgressBar value={importProgress} max={100} color="bg-brand-500" size="lg" />
              </div>
              <p className="text-xs text-slate-400">
                {selectedTx.size} transações sendo processadas
              </p>
            </motion.div>
          )}

          {/* ─── STEP 3: Done ──────────────────────────────────── */}
          {step === STEP_DONE && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-12 space-y-6"
            >
              <div className="relative">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                  importResult?.errors > 0
                    ? 'bg-amber-50 dark:bg-amber-900/20'
                    : 'bg-emerald-50 dark:bg-emerald-900/20'
                }`}>
                  {importResult?.errors > 0 ? (
                    <AlertTriangle className="w-10 h-10 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  )}
                </div>
              </div>

              <div className="text-center">
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {importResult?.errors > 0 ? 'Importação parcial' : 'Importação concluída!'}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {importResult?.success || 0} transações importadas com sucesso
                </p>
                {importResult?.errors > 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    {importResult.errors} transações com erro
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                <Card padding="p-4" className="text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-emerald-500">{importResult?.success || 0}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Sucesso</p>
                </Card>
                <Card padding="p-4" className="text-center">
                  <XCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-red-400">{importResult?.errors || 0}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Erros</p>
                </Card>
              </div>

              <div className="w-full space-y-2 pt-4">
                <Button fullWidth icon={Upload} onClick={handleReset}>
                  Importar outro arquivo
                </Button>
                <Button fullWidth variant="ghost" onClick={() => window.history.back()}>
                  Voltar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Category edit modal ──────────────────────────────── */}
      <Modal
        isOpen={editingTx !== null}
        onClose={() => setEditingTx(null)}
        title="Alterar Categoria"
        size="sm"
      >
        <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-auto">
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => updateCategory(editingTx, key)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                editingTx !== null && processedTx[editingTx]?.category === key
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10'
                  : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: cat.color }}
              >
                {cat.label[0]}
              </div>
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 text-center leading-tight">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
