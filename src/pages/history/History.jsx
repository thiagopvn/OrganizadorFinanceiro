import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, ChevronLeft, ChevronRight, X, Filter, Clock, Users, PiggyBank, ArrowLeft } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Card, Badge, ProgressBar, SectionHeader, Avatar, Input } from '../../components/ui'
import useStore from '../../lib/store'
import { formatCurrency, formatDate, CATEGORIES, getCategoryList, getProgressColor, getProgressTextColor, groupByDate, toDate } from '../../lib/utils'

export default function History() {
  const navigate = useNavigate()
  const {
    transactions, privacyMode, user, partner, getBudgetsWithSpent, getGoalsWithProgress,
    globalFilters, setGlobalFilters,
    drillDown, clearDrillDown
  } = useStore()
  const legacyBudgets = getBudgetsWithSpent()
  const allGoals = getGoalsWithProgress()

  // Unified budget data: use goals (expense_limit) if available, fallback to legacy budgets
  const budgets = useMemo(() => {
    const expenseGoals = allGoals.filter(g => g.type === 'expense_limit')
    if (expenseGoals.length > 0) {
      return expenseGoals.map(g => ({ ...g, limit: g.targetAmount, spent: g.currentAmount }))
    }
    return legacyBudgets
  }, [allGoals, legacyBudgets])

  // Drill-down state from analytics
  const [drillDownActive, setDrillDownActive] = useState(false)
  const [drillDownLabel, setDrillDownLabel] = useState('')

  // Apply drill-down on mount
  useEffect(() => {
    if (drillDown) {
      if (drillDown.type === 'category') {
        setSelectedCategory(drillDown.category)
        setShowSearch(true)
        setViewAll(true)
        const catLabel = CATEGORIES[drillDown.category]?.label || drillDown.category
        setDrillDownLabel(`Categoria: ${catLabel}`)
        setDrillDownActive(true)
      } else if (drillDown.type === 'month') {
        const date = new Date(drillDown.year, drillDown.month - 1, 1)
        setCurrentMonth(date)
        setViewAll(true)
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
    setShowSearch(false)
  }

  // Sync with global period filter
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (globalFilters.period === 'last_month') return subMonths(new Date(), 1)
    return new Date()
  })
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [viewAll, setViewAll] = useState(true)

  // Sync global filters users
  useEffect(() => {
    if (globalFilters.users !== 'all') {
      setSelectedPartner(globalFilters.users)
    }
  }, [globalFilters.users])

  // Apply global category filter if coming from analytics with single category
  useEffect(() => {
    if (globalFilters.selectedCategories.length === 1 && !drillDown) {
      setSelectedCategory(globalFilters.selectedCategories[0])
      setShowSearch(true)
    }
  }, [])

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart)

  // Transactions for the current month
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = toDate(t.date || t.createdAt)
      return isSameMonth(d, currentMonth)
    })
  }, [transactions, currentMonth])

  // Days that have transactions
  const daysWithTransactions = useMemo(() => {
    const days = new Set()
    monthTransactions.forEach(t => {
      const d = toDate(t.date || t.createdAt)
      days.add(format(d, 'yyyy-MM-dd'))
    })
    return days
  }, [monthTransactions])

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let filtered = viewAll ? monthTransactions : transactions.filter(t => {
      const d = toDate(t.date || t.createdAt)
      return isSameDay(d, selectedDay)
    })

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
  }, [viewAll, monthTransactions, transactions, selectedDay, searchQuery, selectedCategory, selectedPartner])

  // Month summary
  const monthExpenses = useMemo(() =>
    monthTransactions.filter(t => t.amount < 0 && t.transactionType !== 'savings').reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [monthTransactions]
  )
  const monthIncome = useMemo(() =>
    monthTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    [monthTransactions]
  )
  const monthSavings = useMemo(() =>
    monthTransactions.filter(t => t.transactionType === 'savings').reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [monthTransactions]
  )

  // Budget performance
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0)
  const totalBudgetSpent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const budgetPercent = totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0

  // Group filtered transactions by date
  const grouped = useMemo(() => groupByDate(filteredTransactions), [filteredTransactions])

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  const handleDayClick = (day) => {
    setSelectedDay(day)
    setViewAll(false)
  }

  const getCategoryIcon = (categoryKey) => {
    const cat = CATEGORIES[categoryKey]
    if (!cat) return LucideIcons.MoreHorizontal
    return LucideIcons[cat.icon] || LucideIcons.MoreHorizontal
  }

  const getBudgetMessage = (percent) => {
    if (percent < 50) return 'Excelente! Vocês estão bem dentro do orçamento.'
    if (percent < 75) return 'Bom ritmo! Continuem controlando os gastos.'
    if (percent < 90) return 'Atenção: vocês estão se aproximando do limite.'
    return 'Cuidado: orçamento quase no limite!'
  }

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader
        title="Histórico"
        onBack={false}
        actions={
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            {showSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>
        }
      />

      <div className="px-5 pb-8 space-y-4">
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

        {/* Search Section */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-4">
                <Input
                  icon={Search}
                  placeholder="Buscar transações..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                {/* Category filter chips */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Categorias</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        !selectedCategory
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Todas
                    </button>
                    {getCategoryList().map(cat => (
                      <button
                        key={cat.key}
                        onClick={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          selectedCategory === cat.key
                            ? 'bg-brand-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Partner filter */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Responsável</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedPartner(null)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        !selectedPartner
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Todos
                    </button>
                    <button
                      onClick={() => setSelectedPartner(selectedPartner === user?.uid ? null : user?.uid)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        selectedPartner === user?.uid
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Avatar name={user?.displayName || 'Você'} size="sm" className="w-5 h-5 text-[8px]" />
                      {user?.displayName || 'Você'}
                    </button>
                    {partner && (
                      <button
                        onClick={() => setSelectedPartner(selectedPartner === partner?.uid ? null : partner?.uid)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          selectedPartner === partner?.uid
                            ? 'bg-brand-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Avatar name={partner?.displayName || 'Parceiro(a)'} size="sm" className="w-5 h-5 text-[8px]" />
                        {partner?.displayName || 'Parceiro(a)'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Calendar */}
        <Card className="mt-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-slate-800 dark:text-white capitalize">
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Week Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day, i) => (
              <div key={i} className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {daysInMonth.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const isSelected = isSameDay(day, selectedDay) && !viewAll
              const hasTransactions = daysWithTransactions.has(dateKey)
              const isToday = isSameDay(day, new Date())

              return (
                <button
                  key={dateKey}
                  onClick={() => handleDayClick(day)}
                  className="flex flex-col items-center justify-center aspect-square relative"
                >
                  <div
                    className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-brand-500 text-white font-bold'
                        : isToday
                          ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                  {hasTransactions && (
                    <div className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-brand-500'
                    }`} />
                  )}
                </button>
              )
            })}
          </div>

          {!viewAll && (
            <button
              onClick={() => setViewAll(true)}
              className="w-full mt-3 py-2 text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors"
            >
              Ver todas as transações do mês
            </button>
          )}
        </Card>

        {/* Month Summary */}
        <Card>
          <div className={`grid ${monthSavings > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Gasto</p>
              <p className="text-lg font-bold text-red-500">
                {privacyMode ? '••••' : formatCurrency(-monthExpenses)}
              </p>
            </div>
            <div className={monthSavings > 0 ? 'text-center' : 'text-right'}>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Recebido</p>
              <p className="text-lg font-bold text-emerald-500">
                {privacyMode ? '••••' : formatCurrency(monthIncome)}
              </p>
            </div>
            {monthSavings > 0 && (
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Guardado</p>
                <p className="text-lg font-bold text-violet-500">
                  {privacyMode ? '••••' : formatCurrency(monthSavings)}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Budget Performance */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Desempenho do Orçamento</p>
            <span className={`text-sm font-bold ${getProgressTextColor(budgetPercent)}`}>
              {budgetPercent}%
            </span>
          </div>
          <ProgressBar value={totalBudgetSpent} max={totalBudgetLimit} size="md" />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {getBudgetMessage(budgetPercent)}
          </p>
        </Card>

        {/* Transaction List */}
        <div>
          <SectionHeader
            title={viewAll ? 'Transações do Mês' : `Transações de ${format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}`}
          />

          {grouped.length === 0 ? (
            <Card>
              <div className="py-8 text-center">
                <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Nenhuma transação encontrada
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {showSearch ? 'Tente alterar os filtros de busca.' : 'Selecione outro dia ou mês.'}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {grouped.map((group, gi) => (
                <div key={gi}>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {formatDate(group.date)}
                  </p>
                  <Card padding="p-2">
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {group.transactions.map(transaction => {
                        const cat = CATEGORIES[transaction.category] || CATEGORIES.outros
                        const IconComponent = getCategoryIcon(transaction.category)
                        const isExpense = transaction.amount < 0
                        const isSavings = transaction.transactionType === 'savings'
                        const transactionTime = format(
                          toDate(transaction.date || transaction.createdAt),
                          'HH:mm'
                        )

                        return (
                          <motion.button
                            key={transaction.id}
                            onClick={() => navigate(`/app/transaction/${transaction.id}`)}
                            className="flex items-center w-full py-3 px-2 gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors"
                            whileTap={{ scale: 0.98 }}
                          >
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: isSavings ? '#8b5cf615' : `${cat?.color}15`,
                                color: isSavings ? '#8b5cf6' : undefined
                              }}
                            >
                              {isSavings
                                ? <PiggyBank className="w-5 h-5" style={{ color: '#8b5cf6' }} />
                                : <IconComponent className="w-5 h-5" style={{ color: cat?.color }} />
                              }
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                {transaction.description}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                {isSavings && 'Economia · '}{transaction.installment && `Parcela ${transaction.installment.current}/${transaction.installment.total} · `}{transaction.merchant && `${transaction.merchant} · `}{transactionTime}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className={`text-sm font-bold ${
                                isSavings ? 'text-violet-500' :
                                isExpense ? 'text-red-500' :
                                'text-emerald-500'
                              }`}>
                                {privacyMode ? '••••' : formatCurrency(transaction.amount)}
                              </p>
                            </div>
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
