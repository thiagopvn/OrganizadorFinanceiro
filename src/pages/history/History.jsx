import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, isSameMonth, isToday as isDateToday
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Search, ChevronLeft, ChevronRight, X, Clock, Users,
  PiggyBank, ArrowLeft, SlidersHorizontal, TrendingDown, TrendingUp, CalendarDays
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Card, Badge, SectionHeader, Avatar, Input } from '../../components/ui'
import useStore from '../../lib/store'
import {
  formatCurrency, formatDate, CATEGORIES, getCategoryList, groupByDate, toDate
} from '../../lib/utils'

export default function History() {
  const navigate = useNavigate()
  const {
    transactions, privacyMode, user, partner,
    globalFilters, setGlobalFilters,
    drillDown, clearDrillDown
  } = useStore()

  // Drill-down state from analytics
  const [drillDownActive, setDrillDownActive] = useState(false)
  const [drillDownLabel, setDrillDownLabel] = useState('')

  useEffect(() => {
    if (drillDown) {
      if (drillDown.type === 'category') {
        setSelectedCategory(drillDown.category)
        setShowFilters(true)
        const catLabel = CATEGORIES[drillDown.category]?.label || drillDown.category
        setDrillDownLabel(`Categoria: ${catLabel}`)
        setDrillDownActive(true)
      } else if (drillDown.type === 'month') {
        const date = new Date(drillDown.year, drillDown.month - 1, 1)
        setCurrentMonth(date)
        setDrillDownLabel(`${format(date, "MMMM 'de' yyyy", { locale: ptBR })}`)
        setDrillDownActive(true)
      }
      clearDrillDown()
    }
  }, [drillDown, clearDrillDown])

  const clearDrillDownMode = () => {
    setDrillDownActive(false)
    setDrillDownLabel('')
    setSelectedCategory(null)
    setShowFilters(false)
  }

  // State
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (globalFilters.period === 'last_month') return subMonths(new Date(), 1)
    return new Date()
  })
  const [selectedDay, setSelectedDay] = useState(null) // null = show all
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedPartner, setSelectedPartner] = useState(null)

  const dayStripRef = useRef(null)

  // Sync global filters
  useEffect(() => {
    if (globalFilters.users !== 'all') setSelectedPartner(globalFilters.users)
  }, [globalFilters.users])

  useEffect(() => {
    if (globalFilters.selectedCategories.length === 1 && !drillDown) {
      setSelectedCategory(globalFilters.selectedCategories[0])
      setShowFilters(true)
    }
  }, [])

  // Calendar data
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Month transactions
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = toDate(t.date || t.createdAt)
      return isSameMonth(d, currentMonth)
    })
  }, [transactions, currentMonth])

  // Days with transactions (for dot indicators)
  const daysWithTransactions = useMemo(() => {
    const days = new Set()
    monthTransactions.forEach(t => {
      const d = toDate(t.date || t.createdAt)
      days.add(format(d, 'yyyy-MM-dd'))
    })
    return days
  }, [monthTransactions])

  // Daily totals for the strip
  const dailyTotals = useMemo(() => {
    const totals = {}
    monthTransactions.forEach(t => {
      const d = toDate(t.date || t.createdAt)
      const key = format(d, 'yyyy-MM-dd')
      if (!totals[key]) totals[key] = 0
      if (t.amount < 0 && t.transactionType !== 'savings') {
        totals[key] += Math.abs(t.amount)
      }
    })
    return totals
  }, [monthTransactions])

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let filtered = selectedDay
      ? transactions.filter(t => isSameDay(toDate(t.date || t.createdAt), selectedDay))
      : monthTransactions

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.description?.toLowerCase().includes(q) ||
        t.merchant?.toLowerCase().includes(q) ||
        CATEGORIES[t.category]?.label.toLowerCase().includes(q)
      )
    }
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }
    if (selectedPartner) {
      filtered = filtered.filter(t => t.paidBy === selectedPartner)
    }
    return filtered
  }, [selectedDay, monthTransactions, transactions, searchQuery, selectedCategory, selectedPartner])

  // Month summary
  const monthExpenses = useMemo(() =>
    monthTransactions.filter(t => t.amount < 0 && t.transactionType !== 'savings').reduce((s, t) => s + Math.abs(t.amount), 0),
    [monthTransactions]
  )
  const monthIncome = useMemo(() =>
    monthTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [monthTransactions]
  )
  const monthBalance = monthIncome - monthExpenses

  // Group filtered transactions by date
  const grouped = useMemo(() => groupByDate(filteredTransactions), [filteredTransactions])

  const handleDayClick = (day) => {
    if (selectedDay && isSameDay(selectedDay, day)) {
      setSelectedDay(null) // toggle off → show all
    } else {
      setSelectedDay(day)
    }
  }

  // Scroll day strip to today or selected day on mount
  useEffect(() => {
    if (dayStripRef.current) {
      const today = new Date()
      const targetDay = isSameMonth(today, currentMonth) ? today.getDate() : 1
      const el = dayStripRef.current.children[targetDay - 1]
      if (el) el.scrollIntoView({ inline: 'center', behavior: 'smooth' })
    }
  }, [currentMonth])

  const getCategoryIcon = (categoryKey) => {
    const cat = CATEGORIES[categoryKey]
    if (!cat) return LucideIcons.MoreHorizontal
    return LucideIcons[cat.icon] || LucideIcons.MoreHorizontal
  }

  const activeFilters = [selectedCategory, selectedPartner, searchQuery].filter(Boolean).length

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader
        title="Histórico"
        onBack={false}
        actions={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <SlidersHorizontal className="w-5 h-5" />
              {activeFilters > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>
          </div>
        }
      />

      <div className="px-5 pb-32 space-y-4">
        {/* Drill-down banner */}
        {drillDownActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 p-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/30 rounded-xl">
              <ArrowLeft className="w-4 h-4 text-brand-500 shrink-0" />
              <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex-1">
                Filtrando por: {drillDownLabel}
              </p>
              <button onClick={clearDrillDownMode} className="text-brand-500 hover:text-brand-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Month Navigator ────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setSelectedDay(null) }}
            className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setCurrentMonth(new Date()); setSelectedDay(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            <CalendarDays className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-white capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </h2>
          </button>
          <button
            onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setSelectedDay(null) }}
            className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Horizontal Day Strip ───────────────────────────────── */}
        <div
          ref={dayStripRef}
          className="flex gap-1.5 overflow-x-auto pb-2 -mx-5 px-5 hide-scrollbar scrollbar-hide"
        >
          {daysInMonth.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const isSelected = selectedDay && isSameDay(day, selectedDay)
            const hasTx = daysWithTransactions.has(dateKey)
            const isToday = isDateToday(day)
            const dayExpense = dailyTotals[dateKey] || 0
            const weekDay = format(day, 'EEEEE', { locale: ptBR }).toUpperCase()

            return (
              <button
                key={dateKey}
                onClick={() => handleDayClick(day)}
                className={`flex flex-col items-center shrink-0 w-11 py-2 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                    : isToday
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <span className={`text-[9px] font-bold uppercase ${
                  isSelected ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {weekDay}
                </span>
                <span className={`text-sm font-bold mt-0.5 ${
                  isSelected ? 'text-white' : ''
                }`}>
                  {format(day, 'd')}
                </span>
                {hasTx && (
                  <div className={`w-1 h-1 rounded-full mt-1 ${
                    isSelected ? 'bg-white' : 'bg-brand-500'
                  }`} />
                )}
              </button>
            )
          })}
        </div>

        {/* Show all button when a day is selected */}
        {selectedDay && (
          <button
            onClick={() => setSelectedDay(null)}
            className="w-full text-center text-xs font-semibold text-brand-500 hover:text-brand-600 py-1 transition-colors"
          >
            Ver todas do mês
          </button>
        )}

        {/* ─── Filters Panel ─────────────────────────────────────── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card>
                <div className="space-y-4">
                  {/* Search */}
                  <Input
                    icon={Search}
                    placeholder="Buscar transações..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />

                  {/* Category chips */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest">Categorias</p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide hide-scrollbar">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          !selectedCategory
                            ? 'bg-brand-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        Todas
                      </button>
                      {getCategoryList().map(cat => (
                        <button
                          key={cat.key}
                          onClick={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
                          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            selectedCategory === cat.key
                              ? 'bg-brand-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Partner filter */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest">Responsável</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedPartner(null)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          !selectedPartner
                            ? 'bg-brand-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Users className="w-3 h-3" />
                        Todos
                      </button>
                      <button
                        onClick={() => setSelectedPartner(selectedPartner === user?.uid ? null : user?.uid)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          selectedPartner === user?.uid
                            ? 'bg-brand-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Avatar name={user?.displayName || 'Você'} size="sm" className="w-4 h-4 text-[7px]" />
                        {user?.displayName || 'Você'}
                      </button>
                      {partner && (
                        <button
                          onClick={() => setSelectedPartner(selectedPartner === partner?.uid ? null : partner?.uid)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            selectedPartner === partner?.uid
                              ? 'bg-brand-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <Avatar name={partner?.displayName || 'Parceiro(a)'} size="sm" className="w-4 h-4 text-[7px]" />
                          {partner?.displayName || 'Parceiro(a)'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Clear filters */}
                  {activeFilters > 0 && (
                    <button
                      onClick={() => { setSearchQuery(''); setSelectedCategory(null); setSelectedPartner(null) }}
                      className="w-full text-center text-xs font-semibold text-red-500 hover:text-red-600 py-1"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Month Summary ─────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <Card padding="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-3 h-3 text-red-400" />
              <p className="text-[10px] font-bold text-slate-400 uppercase">Despesas</p>
            </div>
            <p className="text-sm font-bold text-red-500">
              {privacyMode ? '••••' : formatCurrency(-monthExpenses)}
            </p>
          </Card>
          <Card padding="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <p className="text-[10px] font-bold text-slate-400 uppercase">Receitas</p>
            </div>
            <p className="text-sm font-bold text-emerald-500">
              {privacyMode ? '••••' : formatCurrency(monthIncome)}
            </p>
          </Card>
          <Card padding="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <PiggyBank className="w-3 h-3 text-blue-400" />
              <p className="text-[10px] font-bold text-slate-400 uppercase">Saldo</p>
            </div>
            <p className={`text-sm font-bold ${monthBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {privacyMode ? '••••' : formatCurrency(monthBalance)}
            </p>
          </Card>
        </div>

        {/* ─── Transaction List ──────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              {selectedDay
                ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR })
                : 'Transações do mês'
              }
            </p>
            <Badge variant="info">{filteredTransactions.length}</Badge>
          </div>

          {grouped.length === 0 ? (
            <Card>
              <div className="py-10 text-center">
                <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Nenhuma transação encontrada
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {showFilters ? 'Tente alterar os filtros.' : 'Selecione outro dia ou mês.'}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {grouped.map((group, gi) => (
                <div key={gi}>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 pl-1">
                    {formatDate(group.date)}
                  </p>
                  <Card padding="p-1.5">
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {group.transactions.map(transaction => {
                        const cat = CATEGORIES[transaction.category] || CATEGORIES.outros
                        const IconComponent = getCategoryIcon(transaction.category)
                        const isExpense = transaction.amount < 0
                        const isSavings = transaction.transactionType === 'savings'

                        return (
                          <motion.button
                            key={transaction.id}
                            onClick={() => navigate(`/app/transaction/${transaction.id}`)}
                            className="flex items-center w-full py-2.5 px-2 gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors"
                            whileTap={{ scale: 0.98 }}
                          >
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: isSavings ? '#8b5cf615' : `${cat?.color}15`,
                              }}
                            >
                              {isSavings
                                ? <PiggyBank className="w-4.5 h-4.5" style={{ color: '#8b5cf6' }} />
                                : <IconComponent className="w-4.5 h-4.5" style={{ color: cat?.color }} />
                              }
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                {transaction.description}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                {isSavings && 'Economia · '}
                                {transaction.installment && `${transaction.installment.current}/${transaction.installment.total} · `}
                                {cat?.label}
                              </p>
                            </div>

                            <p className={`text-sm font-bold shrink-0 ${
                              isSavings ? 'text-violet-500' :
                              isExpense ? 'text-red-500' :
                              'text-emerald-500'
                            }`}>
                              {privacyMode ? '••••' : formatCurrency(transaction.amount)}
                            </p>
                          </motion.button>
                        )
                      })}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
