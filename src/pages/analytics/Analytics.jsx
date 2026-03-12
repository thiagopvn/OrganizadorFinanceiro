import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  BarChart3, Users, PiggyBank, Filter, ChevronDown,
  Wallet, Target, Activity, DollarSign, Percent,
  Clock, Flame, Award, AlertTriangle, Copy, Zap, ExternalLink
} from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Card, SectionHeader, Badge, EmptyState, Avatar } from '../../components/ui'
import { BarChart, LineChart, HorizontalBarChart, MultiLineChart } from '../../components/charts'
import useStore from '../../lib/store'
import { formatCurrency, formatCurrencyShort, CATEGORIES, toDate } from '../../lib/utils'
import { format, subMonths, startOfMonth, endOfMonth, endOfWeek, eachWeekOfInterval, differenceInDays, getDaysInMonth, getDay, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PERIOD_OPTIONS = [
  { id: 'month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês anterior' },
  { id: '3months', label: '3 meses' },
  { id: '6months', label: '6 meses' },
  { id: '12months', label: '12 meses' },
  { id: 'all', label: 'Tudo' },
]

const TYPE_OPTIONS = [
  { id: 'all', label: 'Todos' },
  { id: 'expense', label: 'Despesas' },
  { id: 'income', label: 'Receitas' },
  { id: 'savings', label: 'Economia' },
]

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function Analytics() {
  const navigate = useNavigate()
  const {
    transactions, subscriptions, privacyMode, user, partner,
    globalFilters, setGlobalFilters, setDrillDown, setAddTransactionContext,
    budgets, getBudgetsWithSpent, getGoalsWithProgress,
    getSmartInsights, getNetWorthHistory
  } = useStore()

  // Use global filters from store
  const selectedPeriod = globalFilters.period
  const selectedType = globalFilters.type
  const selectedCategories = globalFilters.selectedCategories
  const selectedUsers = globalFilters.users

  const setSelectedPeriod = (p) => setGlobalFilters({ period: p })
  const setSelectedType = (t) => setGlobalFilters({ type: t })
  const setSelectedCategories = (cats) => setGlobalFilters({ selectedCategories: cats })

  const [showFilters, setShowFilters] = useState(false)
  const [expandedSections, setExpandedSections] = useState(new Set([
    'kpis', 'evolution', 'categories', 'trend', 'comparison', 'weekly', 'person', 'top', 'indicators', 'catEvolution', 'budgetStatus', 'anomalies', 'forecast'
  ]))

  // Sync addTransaction context with selected categories
  useEffect(() => {
    if (selectedCategories.length === 1) {
      setAddTransactionContext({ category: selectedCategories[0] })
    } else {
      setAddTransactionContext(null)
    }
  }, [selectedCategories, setAddTransactionContext])

  const toggleSection = (key) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleCategory = (cat) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat]
    setSelectedCategories(next)
  }

  // Date range calculation
  const dateRange = useMemo(() => {
    const now = new Date()
    let start, end
    switch (selectedPeriod) {
      case 'month': start = startOfMonth(now); end = endOfMonth(now); break
      case 'last_month': start = startOfMonth(subMonths(now, 1)); end = endOfMonth(subMonths(now, 1)); break
      case '3months': start = startOfMonth(subMonths(now, 2)); end = endOfMonth(now); break
      case '6months': start = startOfMonth(subMonths(now, 5)); end = endOfMonth(now); break
      case '12months': start = startOfMonth(subMonths(now, 11)); end = endOfMonth(now); break
      default: start = new Date(2000, 0, 1); end = endOfMonth(now); break
    }
    return { start, end }
  }, [selectedPeriod])

  // Previous period for comparisons
  const prevDateRange = useMemo(() => {
    const diff = differenceInDays(dateRange.end, dateRange.start) + 1
    const prevEnd = new Date(dateRange.start)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - diff + 1)
    return { start: prevStart, end: prevEnd }
  }, [dateRange])

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const d = toDate(t.date || t.createdAt)
      if (d < dateRange.start || d > dateRange.end) return false
      if (selectedType === 'expense' && (t.amount >= 0 || t.transactionType === 'savings')) return false
      if (selectedType === 'income' && t.amount <= 0) return false
      if (selectedType === 'savings' && t.transactionType !== 'savings') return false
      if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false
      if (selectedUsers !== 'all' && t.paidBy !== selectedUsers) return false
      return true
    })
  }, [transactions, dateRange, selectedType, selectedCategories, selectedUsers])

  // Previous period transactions
  const prevFiltered = useMemo(() => {
    return transactions.filter(t => {
      const d = toDate(t.date || t.createdAt)
      if (d < prevDateRange.start || d > prevDateRange.end) return false
      if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false
      return true
    })
  }, [transactions, prevDateRange, selectedCategories])

  // === KPI Calculations ===
  const kpis = useMemo(() => {
    const income = filtered.filter(t => t.amount > 0 && t.transactionType !== 'savings').reduce((s, t) => s + t.amount, 0)
    const expenses = filtered.filter(t => t.amount < 0 && t.transactionType !== 'savings').reduce((s, t) => s + Math.abs(t.amount), 0)
    const savings = filtered.filter(t => t.transactionType === 'savings').reduce((s, t) => s + Math.abs(t.amount), 0)
    const netFlow = income - expenses - savings
    const savingsRate = income > 0 ? Math.round(((income - expenses - savings) / income) * 100) : 0
    const days = Math.max(differenceInDays(Math.min(dateRange.end, new Date()), dateRange.start) + 1, 1)
    const dailyAvg = expenses / days
    const txCount = filtered.length

    const prevIncome = prevFiltered.filter(t => t.amount > 0 && t.transactionType !== 'savings').reduce((s, t) => s + t.amount, 0)
    const prevExpenses = prevFiltered.filter(t => t.amount < 0 && t.transactionType !== 'savings').reduce((s, t) => s + Math.abs(t.amount), 0)
    const expenseChange = prevExpenses > 0 ? Math.round(((expenses - prevExpenses) / prevExpenses) * 100) : 0
    const incomeChange = prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 100) : 0

    return { income, expenses, savings, netFlow, savingsRate, dailyAvg, txCount, expenseChange, incomeChange }
  }, [filtered, prevFiltered, dateRange])

  // === Monthly Evolution Data ===
  const monthlyData = useMemo(() => {
    if (transactions.length === 0) return null
    const allInRange = transactions.filter(t => {
      const d = toDate(t.date || t.createdAt)
      return d >= dateRange.start && d <= dateRange.end
    })
    const monthMap = {}
    allInRange.forEach(t => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return
      if (selectedUsers !== 'all' && t.paidBy !== selectedUsers) return
      const d = toDate(t.date || t.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!monthMap[key]) monthMap[key] = { income: 0, expenses: 0, savings: 0 }
      if (t.transactionType === 'savings') monthMap[key].savings += Math.abs(t.amount)
      else if (t.amount > 0) monthMap[key].income += t.amount
      else monthMap[key].expenses += Math.abs(t.amount)
    })
    const sortedKeys = Object.keys(monthMap).sort()
    if (sortedKeys.length === 0) return null
    return {
      labels: sortedKeys.map(k => MONTH_NAMES[parseInt(k.split('-')[1]) - 1]),
      keys: sortedKeys,
      income: sortedKeys.map(k => monthMap[k].income),
      expenses: sortedKeys.map(k => monthMap[k].expenses),
      savings: sortedKeys.map(k => monthMap[k].savings),
    }
  }, [transactions, dateRange, selectedCategories, selectedUsers])

  // === Category Totals ===
  const categoryData = useMemo(() => {
    const totals = {}
    filtered.filter(t => t.amount < 0 && t.transactionType !== 'savings').forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount)
    })
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([key, value]) => ({
        key, label: CATEGORIES[key]?.label || key, value, color: CATEGORIES[key]?.color || '#64748b'
      }))
  }, [filtered])

  const totalCategorySpend = categoryData.reduce((s, d) => s + d.value, 0)

  // === Budget status per category (unified: goals + legacy budgets) ===
  const budgetStatus = useMemo(() => {
    const allGoals = getGoalsWithProgress()
    const expenseGoals = allGoals.filter(g => g.type === 'expense_limit')

    // If we have expense_limit goals, use them; otherwise fall back to legacy budgets
    if (expenseGoals.length > 0) {
      return expenseGoals
        .filter(g => g.targetAmount > 0)
        .map(g => {
          const cat = CATEGORIES[g.category]
          return {
            ...g,
            limit: g.targetAmount,
            spent: g.currentAmount,
            catLabel: cat?.label || g.category,
            catColor: cat?.color || '#64748b',
            percent: g.percent
          }
        })
        .sort((a, b) => b.percent - a.percent)
    }

    const allBudgets = getBudgetsWithSpent()
    if (allBudgets.length === 0) return []
    return allBudgets
      .filter(b => b.limit > 0)
      .map(b => {
        const cat = CATEGORIES[b.category]
        const percent = Math.round((b.spent / b.limit) * 100)
        return { ...b, catLabel: cat?.label || b.category, catColor: cat?.color || '#64748b', percent }
      })
      .sort((a, b) => b.percent - a.percent)
  }, [getGoalsWithProgress, getBudgetsWithSpent])

  // === Forecast: future subscriptions + installments ===
  const forecastData = useMemo(() => {
    const now = new Date()
    const isFuturePeriod = dateRange.start > now

    // Only show forecast for current month or future months
    if (!isFuturePeriod && selectedPeriod !== 'month') return null

    const items = []

    // Active subscriptions
    subscriptions.filter(s => s.active).forEach(s => {
      items.push({
        description: s.name,
        amount: -Math.abs(s.amount),
        category: s.category || 'assinatura',
        type: 'subscription',
        billingDate: s.billingDate
      })
    })

    // Future installments from existing transactions
    transactions.forEach(t => {
      if (t.installment && t.installment.current < t.installment.total) {
        const remaining = t.installment.total - t.installment.current
        for (let i = 1; i <= Math.min(remaining, 3); i++) {
          items.push({
            description: `${t.description} (${t.installment.current + i}/${t.installment.total})`,
            amount: t.amount,
            category: t.category,
            type: 'installment',
            monthsAhead: i
          })
        }
      }
    })

    if (items.length === 0) return null

    const subsTotal = items.filter(i => i.type === 'subscription').reduce((s, i) => s + Math.abs(i.amount), 0)
    const installTotal = items.filter(i => i.type === 'installment' && i.monthsAhead === 1).reduce((s, i) => s + Math.abs(i.amount), 0)

    return { items, subsTotal, installTotal, total: subsTotal + installTotal }
  }, [subscriptions, transactions, dateRange, selectedPeriod])

  // === Spending Trend ===
  const trendData = useMemo(() => {
    if (filtered.length === 0) return null
    const expenseTx = filtered.filter(t => t.amount < 0 && t.transactionType !== 'savings')
    if (expenseTx.length === 0) return null
    try {
      const weeks = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end }, { weekStartsOn: 1 })
      if (weeks.length < 2) {
        const dayMap = {}
        expenseTx.forEach(t => {
          const d = toDate(t.date || t.createdAt)
          const key = format(d, 'dd/MM')
          dayMap[key] = (dayMap[key] || 0) + Math.abs(t.amount)
        })
        const keys = Object.keys(dayMap)
        if (keys.length < 2) return null
        return { labels: keys, data: keys.map(k => dayMap[k]) }
      }
      const weekTotals = weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
        const total = expenseTx
          .filter(t => { const d = toDate(t.date || t.createdAt); return d >= weekStart && d <= weekEnd })
          .reduce((s, t) => s + Math.abs(t.amount), 0)
        return { label: format(weekStart, 'dd/MM'), total }
      })
      return { labels: weekTotals.map(w => w.label), data: weekTotals.map(w => w.total) }
    } catch { return null }
  }, [filtered, dateRange])

  // === Comparison ===
  const comparisonData = useMemo(() => {
    const currExp = filtered.filter(t => t.amount < 0 && t.transactionType !== 'savings').reduce((s, t) => s + Math.abs(t.amount), 0)
    const currInc = filtered.filter(t => t.amount > 0 && t.transactionType !== 'savings').reduce((s, t) => s + t.amount, 0)
    const prevExp = prevFiltered.filter(t => t.amount < 0 && t.transactionType !== 'savings').reduce((s, t) => s + Math.abs(t.amount), 0)
    const prevInc = prevFiltered.filter(t => t.amount > 0 && t.transactionType !== 'savings').reduce((s, t) => s + t.amount, 0)
    return { labels: ['Receitas', 'Despesas'], current: [currInc, currExp], previous: [prevInc, prevExp] }
  }, [filtered, prevFiltered])

  // === Weekly Pattern ===
  const weeklyPattern = useMemo(() => {
    const dayTotals = [0, 0, 0, 0, 0, 0, 0]
    const dayCounts = [0, 0, 0, 0, 0, 0, 0]
    filtered.filter(t => t.amount < 0 && t.transactionType !== 'savings').forEach(t => {
      const d = toDate(t.date || t.createdAt)
      const day = getDay(d)
      dayTotals[day] += Math.abs(t.amount)
      dayCounts[day]++
    })
    return { labels: DAY_NAMES, totals: dayTotals, averages: dayTotals.map((t, i) => dayCounts[i] > 0 ? t / dayCounts[i] : 0), counts: dayCounts }
  }, [filtered])

  // === Per Person ===
  const perPersonData = useMemo(() => {
    const userUid = user?.uid
    const partnerUid = partner?.uid
    const userName = user?.displayName || 'Você'
    const partnerName = partner?.displayName || 'Parceiro(a)'
    let userExp = 0, userInc = 0, partnerExp = 0, partnerInc = 0
    filtered.forEach(t => {
      const isUser = t.paidBy === userUid || (!t.paidBy && t.paidByName === userName) || t.paidByName === user?.displayName
      const isPartner = t.paidBy === partnerUid || t.paidByName === partnerName || t.paidByName === partner?.displayName
      if (isUser) { if (t.amount < 0) userExp += Math.abs(t.amount); else userInc += t.amount }
      else if (isPartner) { if (t.amount < 0) partnerExp += Math.abs(t.amount); else partnerInc += t.amount }
    })
    return { user: { name: userName, expenses: userExp, income: userInc }, partner: { name: partnerName, expenses: partnerExp, income: partnerInc }, totalExpenses: userExp + partnerExp }
  }, [filtered, user, partner])

  // === Top Transactions ===
  const topTransactions = useMemo(() => {
    return [...filtered].filter(t => t.amount < 0 && t.transactionType !== 'savings').sort((a, b) => a.amount - b.amount).slice(0, 8)
  }, [filtered])

  // === Category Evolution ===
  const catEvolutionData = useMemo(() => {
    if (!monthlyData || !monthlyData.keys || monthlyData.keys.length < 2) return null
    const topCats = categoryData.slice(0, 5)
    if (topCats.length === 0) return null
    const catMonthly = {}
    topCats.forEach(c => { catMonthly[c.key] = {} })
    filtered.filter(t => t.amount < 0 && t.transactionType !== 'savings').forEach(t => {
      if (!catMonthly[t.category]) return
      const d = toDate(t.date || t.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      catMonthly[t.category][key] = (catMonthly[t.category][key] || 0) + Math.abs(t.amount)
    })
    return {
      labels: monthlyData.labels,
      datasets: topCats.map(cat => ({ label: cat.label, data: monthlyData.keys.map(k => catMonthly[cat.key][k] || 0), color: cat.color }))
    }
  }, [filtered, monthlyData, categoryData])

  // === Anomaly Detection (Epic 4) ===
  const anomalies = useMemo(() => {
    const alerts = []
    const now = new Date()

    // 1. Duplicate detection: same amount + same description in same month
    const currentMonthTx = filtered.filter(t => t.amount < 0)
    const seen = {}
    currentMonthTx.forEach(t => {
      const key = `${Math.abs(t.amount).toFixed(2)}_${(t.description || '').toLowerCase().trim()}`
      if (!seen[key]) seen[key] = []
      seen[key].push(t)
    })
    Object.entries(seen).forEach(([_, txs]) => {
      if (txs.length >= 2) {
        const desc = txs[0].description || 'transação'
        const amt = Math.abs(txs[0].amount)
        alerts.push({
          type: 'duplicate',
          icon: Copy,
          color: 'text-amber-500',
          bg: 'bg-amber-50 dark:bg-amber-900/10',
          borderColor: 'border-amber-200 dark:border-amber-800/30',
          title: 'Possível cobrança duplicada',
          message: `Você teve ${txs.length} lançamentos de "${desc}" com valor ${formatCurrency(-amt)} neste período.`
        })
      }
    })

    // 2. Category anomaly: current period vs historical average (last 6 months)
    const sixMonthsAgo = subMonths(now, 6)
    const historicalTx = transactions.filter(t => {
      const d = toDate(t.date || t.createdAt)
      return d >= sixMonthsAgo && d < dateRange.start && t.amount < 0 && t.transactionType !== 'savings'
    })

    if (historicalTx.length > 0) {
      // Calculate monthly averages per category
      const histCatMonthly = {}
      const histMonths = new Set()
      historicalTx.forEach(t => {
        const d = toDate(t.date || t.createdAt)
        const mKey = `${d.getFullYear()}-${d.getMonth()}`
        histMonths.add(mKey)
        histCatMonthly[t.category] = (histCatMonthly[t.category] || 0) + Math.abs(t.amount)
      })
      const numHistMonths = Math.max(histMonths.size, 1)

      categoryData.forEach(cat => {
        const histAvg = (histCatMonthly[cat.key] || 0) / numHistMonths
        if (histAvg > 0 && cat.value > 0) {
          const pctAbove = Math.round(((cat.value - histAvg) / histAvg) * 100)
          if (pctAbove >= 40) {
            alerts.push({
              type: 'anomaly',
              icon: TrendingUp,
              color: 'text-red-500',
              bg: 'bg-red-50 dark:bg-red-900/10',
              borderColor: 'border-red-200 dark:border-red-800/30',
              title: `${cat.label} acima da média`,
              message: `Seus gastos com ${cat.label} estão ${pctAbove}% acima da sua média histórica (${formatCurrency(histAvg)}/mês).`,
              category: cat.key
            })
          }
        }
      })
    }

    return alerts
  }, [filtered, transactions, categoryData, dateRange])

  // === Financial Indicators ===
  const indicators = useMemo(() => {
    const now = new Date()
    const daysInMonth = getDaysInMonth(now)
    const dayOfMonth = now.getDate()
    const remainingDays = daysInMonth - dayOfMonth
    const biggestExpense = filtered.filter(t => t.amount < 0 && t.transactionType !== 'savings').sort((a, b) => a.amount - b.amount)[0]
    const topCategory = categoryData[0]
    const projected = selectedPeriod === 'month' ? kpis.dailyAvg * daysInMonth : 0
    const expenseTxs = filtered.filter(t => t.amount < 0 && t.transactionType !== 'savings')
    const avgTxValue = expenseTxs.length > 0 ? expenseTxs.reduce((s, t) => s + Math.abs(t.amount), 0) / expenseTxs.length : 0
    const midDate = new Date((dateRange.start.getTime() + dateRange.end.getTime()) / 2)
    const firstHalf = filtered.filter(t => { const d = toDate(t.date || t.createdAt); return d <= midDate && t.amount < 0 && t.transactionType !== 'savings' }).reduce((s, t) => s + Math.abs(t.amount), 0)
    const secondHalf = filtered.filter(t => { const d = toDate(t.date || t.createdAt); return d > midDate && t.amount < 0 && t.transactionType !== 'savings' }).reduce((s, t) => s + Math.abs(t.amount), 0)
    const velocityChange = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0
    return { biggestExpense, topCategory, projected, remainingDays, avgTxValue, velocityChange }
  }, [filtered, categoryData, kpis, dateRange, selectedPeriod])

  // Active categories
  const activeCats = useMemo(() => {
    const cats = new Set()
    transactions.forEach(t => { if (t.category) cats.add(t.category) })
    return Array.from(cats).sort()
  }, [transactions])

  const periodLabel = PERIOD_OPTIONS.find(p => p.id === selectedPeriod)?.label || ''

  const hasData = transactions.length > 0
  const hasFilteredData = filtered.length > 0

  // === Drill-Down Handlers ===
  const handleCategoryClick = (index, label, value) => {
    const cat = categoryData[index]
    if (!cat) return
    setDrillDown({ type: 'category', category: cat.key })
    navigate('/app/history')
  }

  const handleMonthClick = (index, label, value) => {
    if (!monthlyData?.keys) return
    const key = monthlyData.keys[index]
    if (!key) return
    const [year, month] = key.split('-').map(Number)
    setDrillDown({ type: 'month', year, month })
    navigate('/app/history')
  }

  const handleAnomalyClick = (anomaly) => {
    if (anomaly.category) {
      setDrillDown({ type: 'category', category: anomaly.category })
      navigate('/app/history')
    }
  }

  const v = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }
  const item = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
  const mask = (val) => privacyMode ? '••••' : val

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader title="Análise Financeira" onBack={false} />

      <motion.div className="px-4 pb-8 space-y-4" variants={v} initial="hidden" animate="visible">
        {/* Period Selector */}
        <motion.div variants={item} className="pt-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {PERIOD_OPTIONS.map(p => (
              <button key={p.id} onClick={() => setSelectedPeriod(p.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedPeriod === p.id ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Type + Category Filters */}
        <motion.div variants={item} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 flex-1">
              {TYPE_OPTIONS.map(t => (
                <button key={t.id} onClick={() => setSelectedType(t.id)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${selectedType === t.id ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border transition-all ${selectedCategories.length > 0 ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-500' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}>
              <Filter className="w-4 h-4" />
            </button>
          </div>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
              <div className="flex flex-wrap gap-1.5 py-2">
                {selectedCategories.length > 0 && (
                  <button onClick={() => setSelectedCategories([])}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-800/30">
                    Limpar filtros
                  </button>
                )}
                {activeCats.map(cat => {
                  const c = CATEGORIES[cat]
                  const isActive = selectedCategories.includes(cat)
                  return (
                    <button key={cat} onClick={() => toggleCategory(cat)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${isActive ? 'text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}
                      style={isActive ? { backgroundColor: c?.color || '#64748b' } : {}}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isActive ? '#fff' : (c?.color || '#64748b') }} />
                      {c?.label || cat}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </motion.div>

        {!hasData ? (
          <motion.div variants={item}>
            <EmptyState icon={BarChart3} title="Sem dados para análise" description="Adicione transações para visualizar seus relatórios e gráficos financeiros." />
          </motion.div>
        ) : (
          <>
            {/* ─── KPI Cards ───────────────────────────── */}
            <motion.div variants={item}>
              <SectionHeader title="Resumo" action={<button onClick={() => toggleSection('kpis')} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.has('kpis') ? 'rotate-180' : ''}`} /></button>} />
              {expandedSections.has('kpis') && (
                <div className="space-y-2 mt-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Card padding="p-3">
                      <div className="flex items-center gap-1 mb-1"><ArrowUpRight className="w-3 h-3 text-emerald-500" /><p className="text-[10px] text-slate-400 font-semibold">Receitas</p></div>
                      <p className="text-base font-bold text-emerald-500">{mask(formatCurrencyShort(kpis.income))}</p>
                      {kpis.incomeChange !== 0 && <p className={`text-[9px] font-semibold mt-0.5 ${kpis.incomeChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{kpis.incomeChange > 0 ? '+' : ''}{kpis.incomeChange}%</p>}
                    </Card>
                    <Card padding="p-3">
                      <div className="flex items-center gap-1 mb-1"><ArrowDownRight className="w-3 h-3 text-red-500" /><p className="text-[10px] text-slate-400 font-semibold">Despesas</p></div>
                      <p className="text-base font-bold text-red-500">{mask(formatCurrencyShort(kpis.expenses))}</p>
                      {kpis.expenseChange !== 0 && <p className={`text-[9px] font-semibold mt-0.5 ${kpis.expenseChange <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{kpis.expenseChange > 0 ? '+' : ''}{kpis.expenseChange}%</p>}
                    </Card>
                    <Card padding="p-3">
                      <div className="flex items-center gap-1 mb-1"><PiggyBank className="w-3 h-3 text-violet-500" /><p className="text-[10px] text-slate-400 font-semibold">Economia</p></div>
                      <p className="text-base font-bold text-violet-500">{mask(formatCurrencyShort(kpis.savings))}</p>
                    </Card>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Card padding="p-3">
                      <div className="flex items-center gap-1 mb-1"><Wallet className="w-3 h-3 text-blue-500" /><p className="text-[10px] text-slate-400 font-semibold">Fluxo Líquido</p></div>
                      <p className={`text-base font-bold ${kpis.netFlow >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{mask(formatCurrencyShort(kpis.netFlow))}</p>
                    </Card>
                    <Card padding="p-3">
                      <div className="flex items-center gap-1 mb-1"><Percent className="w-3 h-3 text-brand-500" /><p className="text-[10px] text-slate-400 font-semibold">Taxa Econ.</p></div>
                      <p className={`text-base font-bold ${kpis.savingsRate >= 0 ? 'text-brand-500' : 'text-red-500'}`}>{mask(`${kpis.savingsRate}%`)}</p>
                    </Card>
                    <Card padding="p-3">
                      <div className="flex items-center gap-1 mb-1"><Activity className="w-3 h-3 text-amber-500" /><p className="text-[10px] text-slate-400 font-semibold">Média/Dia</p></div>
                      <p className="text-base font-bold text-amber-500">{mask(formatCurrencyShort(kpis.dailyAvg))}</p>
                    </Card>
                  </div>
                </div>
              )}
            </motion.div>

            {/* ─── Anomaly Alerts (Epic 4) ──────────── */}
            {anomalies.length > 0 && (
              <motion.div variants={item}>
                <SectionHeader title="Alertas Inteligentes" action={<button onClick={() => toggleSection('anomalies')} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.has('anomalies') ? 'rotate-180' : ''}`} /></button>} />
                {expandedSections.has('anomalies') && (
                  <div className="space-y-2 mt-2">
                    {anomalies.map((a, i) => {
                      const Icon = a.icon
                      return (
                        <button key={i} onClick={() => handleAnomalyClick(a)}
                          className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border ${a.bg} ${a.borderColor} transition-all active:scale-[0.98]`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.bg}`}>
                            <Icon className={`w-4 h-4 ${a.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{a.title}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{a.message}</p>
                          </div>
                          {a.category && <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-1" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── Monthly Evolution ────────────────── */}
            {monthlyData && (
              <motion.div variants={item}>
                <Card>
                  <SectionHeader title="Evolução Mensal" action={<button onClick={() => toggleSection('evolution')} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.has('evolution') ? 'rotate-180' : ''}`} /></button>} />
                  {expandedSections.has('evolution') && (
                    <>
                      <p className="text-[10px] text-brand-500 mb-2 font-medium">Toque em uma coluna para ver detalhes</p>
                      <BarChart labels={monthlyData.labels} onClick={handleMonthClick}
                        datasets={[
                          { label: 'Receitas', data: monthlyData.income, backgroundColor: '#10b981' },
                          { label: 'Despesas', data: monthlyData.expenses, backgroundColor: '#ef4444' },
                          { label: 'Economia', data: monthlyData.savings, backgroundColor: '#8b5cf6' }
                        ]} />
                      <div className="flex items-center justify-center gap-4 mt-3">
                        {[['bg-emerald-500', 'Receitas'], ['bg-red-500', 'Despesas'], ['bg-violet-500', 'Economia']].map(([bg, l]) => (
                          <div key={l} className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-full ${bg}`} /><span className="text-[10px] text-slate-500 dark:text-slate-400">{l}</span></div>
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              </motion.div>
            )}

            {/* ─── Budget Status (Epic 3) ──────────── */}
            {budgetStatus.length > 0 && (
              <motion.div variants={item}>
                <Card>
                  <SectionHeader title="Status do Orçamento" action={<button onClick={() => toggleSection('budgetStatus')} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.has('budgetStatus') ? 'rotate-180' : ''}`} /></button>} />
                  {expandedSections.has('budgetStatus') && (
                    <div className="space-y-3 mt-1">
                      {budgetStatus.map((b, i) => (
                        <div key={b.id || i}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.catColor }} />
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{b.catLabel}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400">{mask(formatCurrencyShort(b.spent))} / {mask(formatCurrencyShort(b.limit))}</span>
                              <span className={`text-[10px] font-bold ${b.percent >= 100 ? 'text-red-500' : b.percent >= 80 ? 'text-amber-500' : 'text-emerald-500'}`}>{b.percent}%</span>
                            </div>
                          </div>
                          <div className="relative h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className={`absolute inset-y-0 left-0 rounded-full transition-all ${b.percent >= 100 ? 'bg-red-500' : b.percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(b.percent, 100)}%` }} />
                          </div>
                          {b.percent >= 100 && <p className="text-[9px] text-red-500 font-semibold mt-0.5">Limite ultrapassado em {mask(formatCurrencyShort(b.spent - b.limit))}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* ─── Category Spending (Horizontal Bar) ── */}
            {categoryData.length > 0 && (
              <motion.div variants={item}>
                <Card>
                  <SectionHeader title="Gastos por Categoria" action={<button onClick={() => toggleSection('categories')} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.has('categories') ? 'rotate-180' : ''}`} /></button>} />
                  {expandedSections.has('categories') && (
                    <>
                      <p className="text-[10px] text-brand-500 mb-2 font-medium">Toque em uma barra para ver transações</p>
                      <HorizontalBarChart labels={categoryData.map(d => d.label)} data={categoryData.map(d => d.value)} colors={categoryData.map(d => d.color)} onClick={handleCategoryClick} />
                      <div className="space-y-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                        {categoryData.map((cat, i) => {
                          const pct = totalCategorySpend > 0 ? Math.round((cat.value / totalCategorySpend) * 100) : 0
                          const budget = budgetStatus.find(b => b.category === cat.key)
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                              <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">{cat.label}</span>
                              {budget && <Badge variant={budget.percent >= 100 ? 'danger' : budget.percent >= 80 ? 'warning' : 'success'} className="!text-[8px] !px-1.5 !py-0">{budget.percent}%</Badge>}
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">{mask(formatCurrencyShort(cat.value))}</span>
                              <span className="text-[10px] text-slate-400 w-8 text-right shrink-0">{pct}%</span>
                            </div>
                          )
                        })}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white">{mask(formatCurrency(totalCategorySpend))}</span>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </motion.div>
            )}

            {/* ─── Spending Trend ──────────────────── */}
            {trendData && (
              <motion.div variants={item}>
                <Card>
                  <SectionHeader title="Tendência de Gastos" action={<button onClick={() => toggleSection('trend')} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.has('trend') ? 'rotate-180' : ''}`} /></button>} />
                  {expandedSections.has('trend') && (<><LineChart labels={trendData.labels} data={trendData.data} /><p className="text-[10px] text-slate-400 mt-2 text-center">Gastos semanais no período</p></>)}
                </Card>
              </motion.div>
            )}

            {/* ─── Period Comparison ───────────────── */}
            {selectedPeriod !== 'all' && (
              <motion.div variants={item}>
                <Card>
                  <SectionHeader title="Comparativo com Período Anterior" action={<button onClick={() => toggleSection('comparison')} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.has('comparison') ? 'rotate-180' : ''}`} /></button>} />
                  {expandedSections.has('comparison') && (
                    <>
                      <BarChart labels={comparisonData.labels} datasets={[
                        { label: 'Período Atual', data: comparisonData.current, backgroundColor: '#f97316' },
                        { label: 'Período Anterior', data: comparisonData.previous, backgroundColor: '#cbd5e1' }
                      ]} />
                      <div className="flex items-center justify-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-brand-500" /><span className="text-[10px] text-slate-500 dark:text-slate-400">{periodLabel}</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-300" /><span className="text-[10px] text-slate-500 dark:text-slate-400">Anterior</span></div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <div className={`flex-1 p-2 rounded-lg text-center ${kpis.incomeChange >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
                          <p className="text-[10px] text-slate-500">Receitas</p>
                          <p className={`text-sm font-bold ${kpis.incomeChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{kpis.incomeChange > 0 ? '+' : ''}{kpis.incomeChange}%</p>
                        </div>
                        <div className={`flex-1 p-2 rounded-lg text-center ${kpis.expenseChange <= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-red-50 dark:bg-red-900/10'}`}>
                          <p className="text-[10px] text-slate-500">Despesas</p>
                          <p className={`text-sm font-bold ${kpis.expenseChange <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{kpis.expenseChange > 0 ? '+' : ''}{kpis.expenseChange}%</p>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </motion.div>
            )}

            {/* ─── Category Evolution ──────────────── */}
            {catEvolutionData && (
              <motion.div variants={item}>
                <Card>
                  <SectionHeader title="Evolução por Categoria" action={<button onClick={() => toggleSection('catEvolution')} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.has('catEvolution') ? 'rotate-180' : ''}`} /></button>} />
                  {expandedSections.has('catEvolution') && (
                    <>
                      <MultiLineChart labels={catEvolutionData.labels} datasets={catEvolutionData.datasets} />
                      <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
                        {catEvolutionData.datasets.map((ds, i) => (
                          <div key={i} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ds.color }} /><span className="text-[10px] text-slate-500 dark:text-slate-400">{ds.label}</span></div>
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              </motion.div>
            )}

            {/* ─── Forecast (Epic 3) ──────────────── */}
            {forecastData && (
              <motion.div variants={item}>
                <Card>
                  <SectionHeader title="Previsão de Fluxo de Caixa" action={<button onClick={() => toggleSection('forecast')} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.has('forecast') ? 'rotate-180' : ''}`} /></button>} />
                  {expandedSections.has('forecast') && (
                    <div className="space-y-3 mt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
                          <p className="text-[10px] text-blue-500 font-semibold">Assinaturas Fixas</p>
                          <p className="text-sm font-bold text-blue-600">{mask(formatCurrency(forecastData.subsTotal))}</p>
                          <p className="text-[9px] text-blue-400">{forecastData.items.filter(i => i.type === 'subscription').length} ativas</p>
                        </div>
                        <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/30">
                          <p className="text-[10px] text-violet-500 font-semibold">Parcelas Próximas</p>
                          <p className="text-sm font-bold text-violet-600">{mask(formatCurrency(forecastData.installTotal))}</p>
                          <p className="text-[9px] text-violet-400">Próximo mês</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-amber-600">Compromissos Previstos</p>
                          <p className="text-sm font-bold text-amber-600">{mask(formatCurrency(forecastData.total))}</p>
                        </div>
                        <p className="text-[9px] text-amber-500 mt-0.5">Assinaturas + Parcelas que irão cair</p>
                      </div>
                      <div className="space-y-1.5">
                        {forecastData.items.slice(0, 8).map((item, i) => (
                          <div key={i} className="flex items-center gap-2 py-1">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORIES[item.category]?.color || '#64748b' }} />
                            <span className="text-[11px] text-slate-600 dark:text-slate-400 flex-1 truncate">{item.description}</span>
                            <Badge variant={item.type === 'subscription' ? 'info' : 'brand'} className="!text-[8px] !px-1.5 !py-0">{item.type === 'subscription' ? 'Fixa' : 'Parcela'}</Badge>
                            <span className="text-[11px] font-semibold text-red-500">{mask(formatCurrency(item.amount))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* ─── Weekly Pattern ─────────────────── */}
            {weeklyPattern.totals.some(v => v > 0) && (
              <motion.div variants={item}>
                <Card>
                  <SectionHeader title="Padrão Semanal de Gastos" action={<button onClick={() => toggleSection('weekly')} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.has('weekly') ? 'rotate-180' : ''}`} /></button>} />
                  {expandedSections.has('weekly') && (
                    <>
                      <BarChart labels={weeklyPattern.labels} datasets={[{
                        label: 'Total por dia da semana', data: weeklyPattern.totals,
                        backgroundColor: weeklyPattern.totals.map(v => v === Math.max(...weeklyPattern.totals) ? '#ef4444' : '#f97316')
                      }]} />
                      <div className="grid grid-cols-7 gap-1 mt-3">
                        {weeklyPattern.labels.map((day, i) => (
                          <div key={i} className="text-center">
                            <p className="text-[9px] font-bold text-slate-400">{day}</p>
                            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{mask(formatCurrencyShort(weeklyPattern.averages[i]))}</p>
                            <p className="text-[9px] text-slate-400">{weeklyPattern.counts[i]}x</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              </motion.div>
            )}

            {/* ─── Per Person ─────────────────────── */}
            {perPersonData.totalExpenses > 0 && (
              <motion.div variants={item}>
                <Card>
                  <SectionHeader title="Gastos por Pessoa" action={<button onClick={() => toggleSection('person')} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.has('person') ? 'rotate-180' : ''}`} /></button>} />
                  {expandedSections.has('person') && (
                    <>
                      <BarChart labels={[perPersonData.user.name, perPersonData.partner.name]} datasets={[{ label: 'Despesas', data: [perPersonData.user.expenses, perPersonData.partner.expenses], backgroundColor: ['#f97316', '#8b5cf6'] }]} />
                      <div className="space-y-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                        {[perPersonData.user, perPersonData.partner].map((person, i) => {
                          const pct = perPersonData.totalExpenses > 0 ? Math.round((person.expenses / perPersonData.totalExpenses) * 100) : 0
                          return (
                            <div key={i}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2"><Avatar name={person.name} size="sm" /><span className="text-sm font-semibold text-slate-800 dark:text-white">{person.name}</span></div>
                                <span className="text-sm font-bold text-red-500">{mask(formatCurrency(-person.expenses))}</span>
                              </div>
                              <div className="relative h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className={`absolute inset-y-0 left-0 rounded-full transition-all ${i === 0 ? 'bg-brand-500' : 'bg-violet-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-slate-400">{pct}% do total</span>
                                {person.income > 0 && <span className="text-[10px] text-emerald-500 font-medium">Receita: {mask(formatCurrency(person.income))}</span>}
                              </div>
                            </div>
                          )
                        })}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /><span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total do Casal</span></div>
                          <span className="text-sm font-bold text-slate-800 dark:text-white">{mask(formatCurrency(-perPersonData.totalExpenses))}</span>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </motion.div>
            )}

            {/* ─── Top Transactions ───────────────── */}
            {topTransactions.length > 0 && (
              <motion.div variants={item}>
                <Card>
                  <SectionHeader title="Maiores Gastos" action={<button onClick={() => toggleSection('top')} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.has('top') ? 'rotate-180' : ''}`} /></button>} />
                  {expandedSections.has('top') && (
                    <div className="space-y-2">
                      {topTransactions.map((t, i) => {
                        const cat = CATEGORIES[t.category]
                        return (
                          <button key={t.id || i} onClick={() => navigate(`/app/transaction/${t.id}`)} className="flex items-center gap-2.5 py-1.5 w-full text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg px-1 transition-colors">
                            <span className="text-xs font-bold text-slate-300 dark:text-slate-600 w-5 text-center">{i + 1}</span>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: cat?.color || '#64748b' }}>{(cat?.label || '?')[0]}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{t.description || t.merchant || 'Transação'}</p>
                              <p className="text-[10px] text-slate-400">{cat?.label || t.category} · {format(toDate(t.date || t.createdAt), 'dd/MM')}</p>
                            </div>
                            <span className="text-xs font-bold text-red-500 shrink-0">{mask(formatCurrency(t.amount))}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* ─── Financial Indicators ───────────── */}
            <motion.div variants={item}>
              <Card>
                <SectionHeader title="Indicadores Financeiros" action={<button onClick={() => toggleSection('indicators')} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.has('indicators') ? 'rotate-180' : ''}`} /></button>} />
                {expandedSections.has('indicators') && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${indicators.velocityChange <= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        {indicators.velocityChange <= 0 ? <TrendingDown className="w-4 h-4 text-emerald-500" /> : <TrendingUp className="w-4 h-4 text-red-500" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Velocidade de Gastos</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {indicators.velocityChange === 0 ? 'Gastos estáveis no período' : indicators.velocityChange > 0 ? `Gastos acelerando ${indicators.velocityChange}% na 2ª metade` : `Gastos desacelerando ${Math.abs(indicators.velocityChange)}% na 2ª metade`}
                        </p>
                      </div>
                    </div>
                    {selectedPeriod === 'month' && indicators.projected > 0 && (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 shrink-0"><Target className="w-4 h-4 text-amber-500" /></div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Projeção Mensal</p>
                          <p className="text-sm font-bold text-amber-500">{mask(formatCurrency(indicators.projected))}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{indicators.remainingDays} dias restantes · {mask(formatCurrencyShort(kpis.dailyAvg))}/dia</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 shrink-0"><DollarSign className="w-4 h-4 text-blue-500" /></div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Valor Médio por Transação</p>
                        <p className="text-sm font-bold text-blue-500">{mask(formatCurrency(indicators.avgTxValue))}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{kpis.txCount} transações no período</p>
                      </div>
                    </div>
                    {indicators.biggestExpense && (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100 dark:bg-red-900/30 shrink-0"><Flame className="w-4 h-4 text-red-500" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Maior Gasto Individual</p>
                          <p className="text-sm font-bold text-red-500">{mask(formatCurrency(indicators.biggestExpense.amount))}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{indicators.biggestExpense.description || indicators.biggestExpense.merchant}</p>
                        </div>
                      </div>
                    )}
                    {indicators.topCategory && (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${indicators.topCategory.color}20` }}>
                          <Award className="w-4 h-4" style={{ color: indicators.topCategory.color }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Categoria com Mais Gastos</p>
                          <p className="text-sm font-bold" style={{ color: indicators.topCategory.color }}>{indicators.topCategory.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{mask(formatCurrency(indicators.topCategory.value))} ({totalCategorySpend > 0 ? Math.round((indicators.topCategory.value / totalCategorySpend) * 100) : 0}% do total)</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>

            {/* ─── Smart Insights ───────────────── */}
            {selectedPeriod === 'month' && (() => {
              const insights = getSmartInsights()
              if (insights.length === 0) return null
              const INSIGHT_COLORS = {
                warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50',
                danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50',
                success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50',
                info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50',
              }
              const INSIGHT_TEXT = {
                warning: 'text-amber-700 dark:text-amber-300',
                danger: 'text-red-700 dark:text-red-300',
                success: 'text-emerald-700 dark:text-emerald-300',
                info: 'text-blue-700 dark:text-blue-300',
              }
              return (
                <motion.div variants={item}>
                  <Card>
                    <SectionHeader title="Insights Inteligentes" />
                    <div className="space-y-2">
                      {insights.map((insight, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${INSIGHT_COLORS[insight.type]}`}>
                          <Zap className={`w-4 h-4 shrink-0 mt-0.5 ${INSIGHT_TEXT[insight.type]}`} />
                          <div>
                            <p className={`text-xs font-semibold ${INSIGHT_TEXT[insight.type]}`}>{insight.title}</p>
                            <p className={`text-[11px] mt-0.5 ${INSIGHT_TEXT[insight.type]} opacity-80`}>{insight.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )
            })()}

            {/* ─── Net Worth Evolution ────────────── */}
            {selectedPeriod !== 'month' && selectedPeriod !== 'last_month' && (() => {
              const history = getNetWorthHistory()
              if (history.length < 2) return null
              return (
                <motion.div variants={item}>
                  <Card>
                    <SectionHeader title="Evolução Patrimonial" />
                    <LineChart
                      labels={history.map(h => h.label)}
                      data={history.map(h => h.balance)}
                    />
                  </Card>
                </motion.div>
              )
            })()}

            {/* Empty filtered state */}
            {hasData && !hasFilteredData && (
              <motion.div variants={item}>
                <Card className="text-center py-8">
                  <Filter className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhuma transação encontrada</p>
                  <p className="text-xs text-slate-400 mt-1">Ajuste os filtros para visualizar dados</p>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}
