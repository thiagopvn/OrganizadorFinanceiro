import { create } from 'zustand'
import { startOfMonth, endOfMonth, subMonths, addDays, format } from 'date-fns'

const useStore = create((set, get) => ({
  // Auth state
  user: null,
  userProfile: null,
  couple: null,
  partner: null,
  coupleId: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setCouple: (couple) => set({ couple }),
  setPartner: (partner) => set({ partner }),
  setCoupleId: (coupleId) => set({ coupleId }),
  setIsLoading: (isLoading) => set({ isLoading }),

  // Theme
  darkMode: false,
  toggleDarkMode: () => {
    const next = !get().darkMode
    set({ darkMode: next })
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('darkMode', JSON.stringify(next))
  },
  initTheme: () => {
    const saved = localStorage.getItem('darkMode')
    const dark = saved ? JSON.parse(saved) : false
    set({ darkMode: dark })
    document.documentElement.classList.toggle('dark', dark)
  },

  // Privacy mode
  privacyMode: false,
  togglePrivacyMode: () => set({ privacyMode: !get().privacyMode }),

  // Transactions — starts empty, loaded from Firestore
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),
  addTransactionLocal: (transaction) =>
    set({ transactions: [transaction, ...get().transactions] }),

  // Budgets
  budgets: [],
  setBudgets: (budgets) => set({ budgets }),

  // Goals
  goals: [],
  setGoals: (goals) => set({ goals }),

  // Subscriptions
  subscriptions: [],
  setSubscriptions: (subscriptions) => set({ subscriptions }),

  // Settlements
  settlements: [],
  setSettlements: (settlements) => set({ settlements }),

  // Cards
  cards: [],
  setCards: (cards) => set({ cards }),

  // Investments
  investments: [],
  setInvestments: (investments) => set({ investments }),

  // Recurring transactions
  recurringTransactions: [],
  setRecurringTransactions: (recurringTransactions) => set({ recurringTransactions }),

  // Debts / Loans
  debts: [],
  setDebts: (debts) => set({ debts }),

  // Global Filters — shared across Analytics, History, Dashboard
  globalFilters: {
    period: 'month',           // 'month' | 'last_month' | '3months' | '6months' | '12months' | 'all'
    selectedCategories: [],    // empty = all categories
    type: 'all',               // 'all' | 'expense' | 'income' | 'savings'
    users: 'all',              // 'all' | userId
  },
  setGlobalFilters: (filters) => set({
    globalFilters: { ...get().globalFilters, ...filters }
  }),
  resetGlobalFilters: () => set({
    globalFilters: { period: 'month', selectedCategories: [], type: 'all', users: 'all' }
  }),

  // Drill-down context — set by Analytics, consumed by History
  drillDown: null, // { type: 'category', category: 'mercado' } or { type: 'month', year: 2026, month: 2 }
  setDrillDown: (ctx) => set({ drillDown: ctx }),
  clearDrillDown: () => set({ drillDown: null }),

  // AddTransaction context — pre-selected category from current screen
  addTransactionContext: null, // { category: 'lazer' } or null
  setAddTransactionContext: (ctx) => set({ addTransactionContext: ctx }),

  // UI State
  showAddTransaction: false,
  setShowAddTransaction: (show) => set({ showAddTransaction: show }),

  showSuccess: null,
  setShowSuccess: (data) => set({ showSuccess: data }),

  showAchievement: null,
  setShowAchievement: (data) => set({ showAchievement: data }),

  isOffline: !navigator.onLine,
  setIsOffline: (isOffline) => set({ isOffline }),

  // Notifications — starts empty, loaded from Firestore
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  markNotificationRead: (id) => set({
    notifications: get().notifications.map(n => n.id === id ? { ...n, read: true } : n)
  }),

  // Computed values
  getTotalIncome: () => get().transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
  getTotalExpenses: () => get().transactions.filter(t => t.amount < 0 && t.transactionType !== 'savings').reduce((sum, t) => sum + Math.abs(t.amount), 0),
  getTotalSavings: () => get().transactions.filter(t => t.transactionType === 'savings').reduce((sum, t) => sum + Math.abs(t.amount), 0),
  getBalance: () => get().transactions.reduce((sum, t) => sum + t.amount, 0),
  getNetWorth: () => {
    return get().transactions.reduce((sum, t) => sum + t.amount, 0)
  },
  getCategoryTotals: () => {
    const totals = {}
    get().transactions.filter(t => t.amount < 0 && t.transactionType !== 'savings').forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount)
    })
    return totals
  },

  // Budgets with spent calculated from current month transactions (excludes savings)
  getBudgetsWithSpent: () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const transactions = get().transactions
    const budgets = get().budgets

    const monthlySpent = {}
    transactions.forEach(t => {
      if (t.amount >= 0 || t.transactionType === 'savings') return
      const d = t.date?.toDate ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date || t.createdAt?.toDate?.() || t.createdAt))
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        monthlySpent[t.category] = (monthlySpent[t.category] || 0) + Math.abs(t.amount)
      }
    })

    return budgets.map(b => ({
      ...b,
      spent: monthlySpent[b.category] || 0
    }))
  },

  // All goals with progress computed from transactions
  getGoalsWithProgress: () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const transactions = get().transactions
    const goals = get().goals
    const budgets = get().budgets

    // Calculate start of current week (Monday)
    const weekStart = new Date(now)
    const dayOfWeek = weekStart.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = 0
    weekStart.setDate(weekStart.getDate() - diff)
    weekStart.setHours(0, 0, 0, 0)

    // Aggregators per period
    const monthlyExpenses = {}
    const monthlyIncome = {}
    const weeklySavings = {}
    const monthlySavings = {}
    const allTimeSavings = {}
    const weeklyExpenses = {}
    const weeklyIncome = {}

    transactions.forEach(t => {
      const d = t.date?.toDate ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date || t.createdAt?.toDate?.() || t.createdAt))
      const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear
      const isCurrentWeek = d >= weekStart && d <= now

      if (t.transactionType === 'savings') {
        const amt = Math.abs(t.amount)
        allTimeSavings[t.category] = (allTimeSavings[t.category] || 0) + amt
        if (isCurrentMonth) {
          monthlySavings[t.category] = (monthlySavings[t.category] || 0) + amt
        }
        if (isCurrentWeek) {
          weeklySavings[t.category] = (weeklySavings[t.category] || 0) + amt
        }
      } else if (t.amount < 0) {
        if (isCurrentMonth) {
          monthlyExpenses[t.category] = (monthlyExpenses[t.category] || 0) + Math.abs(t.amount)
        }
        if (isCurrentWeek) {
          weeklyExpenses[t.category] = (weeklyExpenses[t.category] || 0) + Math.abs(t.amount)
        }
      } else {
        if (isCurrentMonth) {
          monthlyIncome[t.category] = (monthlyIncome[t.category] || 0) + t.amount
        }
        if (isCurrentWeek) {
          weeklyIncome[t.category] = (weeklyIncome[t.category] || 0) + t.amount
        }
      }
    })

    // Process goals from goals subcollection
    const processedGoals = goals.map(g => {
      const type = g.type || 'savings'
      const period = g.period || 'monthly'
      let currentAmount = 0

      if (type === 'expense_limit') {
        currentAmount = period === 'weekly'
          ? (weeklyExpenses[g.category] || 0)
          : (monthlyExpenses[g.category] || 0)
      } else if (type === 'income_goal') {
        currentAmount = period === 'weekly'
          ? (weeklyIncome[g.category] || 0)
          : (monthlyIncome[g.category] || 0)
      } else {
        // savings - compute from savings transactions
        if (period === 'weekly') {
          currentAmount = weeklySavings[g.category] || 0
        } else if (period === 'monthly') {
          currentAmount = monthlySavings[g.category] || 0
        } else {
          // custom/no deadline - all time savings for this category + manual deposits
          currentAmount = (allTimeSavings[g.category] || 0) + (g.currentAmount || 0)
        }
      }

      const percent = g.targetAmount > 0 ? Math.round((currentAmount / g.targetAmount) * 100) : 0

      return { ...g, currentAmount, percent }
    })

    // Also include legacy budgets as expense_limit type
    const legacyBudgets = budgets
      .filter(b => !goals.some(g => g.category === b.category && g.type === 'expense_limit'))
      .map(b => ({
        ...b,
        type: 'expense_limit',
        name: b.name || `Limite ${b.category || 'Gasto'}`,
        targetAmount: b.limit || 0,
        currentAmount: monthlyExpenses[b.category] || 0,
        percent: b.limit > 0 ? Math.round(((monthlyExpenses[b.category] || 0) / b.limit) * 100) : 0
      }))

    return [...processedGoals, ...legacyBudgets]
  },

  // ─── Financial Health Indicators ────────────────────────────────
  getFinancialHealth: () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const transactions = get().transactions
    const debts = get().debts
    const subscriptions = get().subscriptions

    let monthlyIncome = 0
    let monthlyExpenses = 0
    let monthlySavings = 0
    let fixedExpenses = 0
    const fixedCategories = ['moradia', 'assinatura', 'educacao', 'saude']

    transactions.forEach(t => {
      const d = t.date?.toDate ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date || t.createdAt?.toDate?.() || t.createdAt))
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return

      if (t.transactionType === 'savings') {
        monthlySavings += Math.abs(t.amount)
      } else if (t.amount > 0) {
        monthlyIncome += t.amount
      } else {
        monthlyExpenses += Math.abs(t.amount)
        if (fixedCategories.includes(t.category)) {
          fixedExpenses += Math.abs(t.amount)
        }
      }
    })

    // Add subscription costs to fixed expenses
    const monthlySubCost = subscriptions
      .filter(s => s.active !== false)
      .reduce((sum, s) => sum + (s.amount || 0), 0)
    fixedExpenses += monthlySubCost

    const totalDebt = debts.reduce((sum, d) => sum + (d.remainingAmount || d.totalAmount || 0), 0)
    const monthlyDebtPayment = debts.reduce((sum, d) => sum + (d.monthlyPayment || 0), 0)

    const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0
    const fixedRatio = monthlyIncome > 0 ? Math.round((fixedExpenses / monthlyIncome) * 100) : 0
    const debtRatio = monthlyIncome > 0 ? Math.round((monthlyDebtPayment / monthlyIncome) * 100) : 0

    // Emergency fund check: 3 months of expenses
    const avgMonthlyExpense = monthlyExpenses + monthlySubCost
    const emergencyTarget = avgMonthlyExpense * 3
    const emergencyGoal = get().goals.find(g =>
      g.name?.toLowerCase().includes('emergência') ||
      g.name?.toLowerCase().includes('emergencia') ||
      g.name?.toLowerCase().includes('reserva')
    )
    const emergencySaved = emergencyGoal?.currentAmount || 0
    const hasEmergencyFund = emergencySaved >= emergencyTarget && emergencyTarget > 0

    // Score calculation
    let score = 50
    score += Math.min(savingsRate, 30)
    score -= Math.max(0, fixedRatio - 50) * 0.5
    score -= Math.min(debtRatio, 40) * 0.5
    if (hasEmergencyFund) score += 10
    score = Math.max(0, Math.min(100, Math.round(score)))

    return {
      monthlyIncome, monthlyExpenses, monthlySavings, fixedExpenses,
      totalDebt, monthlyDebtPayment,
      savingsRate, fixedRatio, debtRatio, score,
      emergencyTarget, emergencySaved, hasEmergencyFund,
      monthlySubCost
    }
  },

  // ─── Cash Flow Projection (next 30 days) ──────────────────────
  getCashFlowProjection: () => {
    const now = new Date()
    const transactions = get().transactions
    const recurringTxs = get().recurringTransactions
    const subscriptions = get().subscriptions

    // Calculate average daily spending from last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    let recentExpenses = 0
    let recentIncome = 0
    let recentDays = 0

    transactions.forEach(t => {
      const d = t.date?.toDate ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date || t.createdAt?.toDate?.() || t.createdAt))
      if (d >= thirtyDaysAgo && d <= now && t.transactionType !== 'savings') {
        if (t.amount < 0) recentExpenses += Math.abs(t.amount)
        else recentIncome += t.amount
        recentDays = Math.max(recentDays, Math.ceil((now - d) / 86400000))
      }
    })

    const avgDailyExpense = recentDays > 0 ? recentExpenses / Math.min(recentDays, 30) : 0

    // Project next 30 days
    const projection = []
    const currentBalance = transactions.reduce((sum, t) => sum + t.amount, 0)
    let runningBalance = currentBalance

    for (let i = 0; i < 30; i++) {
      const date = addDays(now, i + 1)
      const dayOfMonth = date.getDate()

      // Check for recurring transactions on this day
      let dayIncome = 0
      let dayExpense = avgDailyExpense

      recurringTxs.forEach(rt => {
        if (rt.active === false) return
        if (rt.dayOfMonth === dayOfMonth || (rt.frequency === 'weekly' && i % 7 === 0)) {
          if (rt.amount > 0) dayIncome += rt.amount
          else dayExpense += Math.abs(rt.amount)
        }
      })

      // Subscriptions
      subscriptions.forEach(s => {
        if (s.active === false) return
        if (s.billingDate === dayOfMonth) {
          dayExpense += s.amount || 0
        }
      })

      runningBalance = runningBalance + dayIncome - dayExpense
      projection.push({
        date,
        label: format(date, 'dd/MM'),
        balance: runningBalance,
        income: dayIncome,
        expense: dayExpense
      })
    }

    const endBalance = projection[projection.length - 1]?.balance || currentBalance
    const willBeNegative = projection.some(p => p.balance < 0)
    const daysUntilNegative = willBeNegative
      ? projection.findIndex(p => p.balance < 0) + 1
      : null

    return {
      currentBalance,
      projectedBalance: endBalance,
      projection,
      avgDailyExpense,
      willBeNegative,
      daysUntilNegative
    }
  },

  // ─── Net Worth History (monthly) ──────────────────────────────
  getNetWorthHistory: () => {
    const transactions = get().transactions
    const investments = get().investments
    if (transactions.length === 0) return []

    // Group transactions by month and compute cumulative balance
    const monthlyBalances = {}
    const sorted = [...transactions].sort((a, b) => {
      const da = a.date?.toDate ? a.date.toDate() : new Date(a.date || a.createdAt?.toDate?.() || a.createdAt)
      const db2 = b.date?.toDate ? b.date.toDate() : new Date(b.date || b.createdAt?.toDate?.() || b.createdAt)
      return da - db2
    })

    let cumulative = 0
    sorted.forEach(t => {
      const d = t.date?.toDate ? t.date.toDate() : new Date(t.date || t.createdAt?.toDate?.() || t.createdAt)
      const key = format(d, 'yyyy-MM')
      cumulative += t.amount
      monthlyBalances[key] = cumulative
    })

    // Add investment values to the latest month
    const totalInvested = investments.reduce((sum, inv) => sum + (inv.currentValue || inv.amount || 0), 0)

    const months = Object.keys(monthlyBalances).sort()
    return months.map((key, i) => ({
      month: key,
      label: format(new Date(key + '-01'), 'MMM yy'),
      balance: monthlyBalances[key] + (i === months.length - 1 ? totalInvested : 0)
    }))
  },

  // ─── Monthly Report ───────────────────────────────────────────
  getMonthlyReport: (year, month) => {
    const transactions = get().transactions
    const goals = get().getGoalsWithProgress()
    const start = startOfMonth(new Date(year, month))
    const end = endOfMonth(new Date(year, month))

    let income = 0, expenses = 0, savings = 0
    const byCategory = {}
    const byPerson = {}

    transactions.forEach(t => {
      const d = t.date?.toDate ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date || t.createdAt?.toDate?.() || t.createdAt))
      if (d < start || d > end) return

      if (t.transactionType === 'savings') {
        savings += Math.abs(t.amount)
      } else if (t.amount > 0) {
        income += t.amount
      } else {
        expenses += Math.abs(t.amount)
        byCategory[t.category] = (byCategory[t.category] || 0) + Math.abs(t.amount)
      }

      const person = t.paidBy || 'unknown'
      if (!byPerson[person]) byPerson[person] = { income: 0, expenses: 0 }
      if (t.amount > 0) byPerson[person].income += t.amount
      else byPerson[person].expenses += Math.abs(t.amount)
    })

    // Compare to previous month
    const prevStart = startOfMonth(subMonths(start, 1))
    const prevEnd = endOfMonth(subMonths(start, 1))
    let prevIncome = 0, prevExpenses = 0

    transactions.forEach(t => {
      const d = t.date?.toDate ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date || t.createdAt?.toDate?.() || t.createdAt))
      if (d < prevStart || d > prevEnd) return
      if (t.transactionType === 'savings') return
      if (t.amount > 0) prevIncome += t.amount
      else prevExpenses += Math.abs(t.amount)
    })

    const balance = income - expenses - savings
    const incomeChange = prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 100) : 0
    const expenseChange = prevExpenses > 0 ? Math.round(((expenses - prevExpenses) / prevExpenses) * 100) : 0

    // Top 5 categories
    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amount]) => ({ category: cat, amount, percent: expenses > 0 ? Math.round((amount / expenses) * 100) : 0 }))

    // Goals hit
    const goalsHit = goals.filter(g => g.percent >= 100 && g.type !== 'expense_limit').length
    const limitsExceeded = goals.filter(g => g.percent >= 100 && g.type === 'expense_limit').length

    return {
      income, expenses, savings, balance,
      incomeChange, expenseChange,
      topCategories, byPerson,
      goalsHit, limitsExceeded,
      savingsRate: income > 0 ? Math.round((savings / income) * 100) : 0,
      txCount: transactions.filter(t => {
        const d = t.date?.toDate ? t.date.toDate() : new Date(t.date || t.createdAt?.toDate?.() || t.createdAt)
        return d >= start && d <= end
      }).length
    }
  },

  // ─── Smart Insights ───────────────────────────────────────────
  getSmartInsights: () => {
    const transactions = get().transactions
    const goals = get().getGoalsWithProgress()
    const health = get().getFinancialHealth()
    const cashFlow = get().getCashFlowProjection()
    const insights = []

    // 1. Spending trend
    if (health.monthlyExpenses > health.monthlyIncome && health.monthlyIncome > 0) {
      insights.push({
        type: 'warning',
        icon: 'AlertTriangle',
        title: 'Gastos acima da receita',
        message: `Você gastou ${Math.round((health.monthlyExpenses / health.monthlyIncome) * 100)}% da receita este mês. Tente reduzir gastos variáveis.`,
        priority: 1
      })
    }

    // 2. Cash flow alert
    if (cashFlow.willBeNegative) {
      insights.push({
        type: 'danger',
        icon: 'TrendingDown',
        title: 'Saldo pode ficar negativo',
        message: `No ritmo atual, seu saldo ficará negativo em ${cashFlow.daysUntilNegative} dias. Considere reduzir gastos.`,
        priority: 0
      })
    }

    // 3. Savings celebration
    if (health.savingsRate >= 20) {
      insights.push({
        type: 'success',
        icon: 'Award',
        title: 'Ótima taxa de poupança!',
        message: `Vocês estão guardando ${health.savingsRate}% da receita. Continue assim!`,
        priority: 3
      })
    } else if (health.savingsRate < 10 && health.monthlyIncome > 0) {
      insights.push({
        type: 'info',
        icon: 'PiggyBank',
        title: 'Poupe mais',
        message: `Taxa de poupança de apenas ${health.savingsRate}%. O ideal é guardar pelo menos 20% da receita.`,
        priority: 2
      })
    }

    // 4. Goals near completion
    goals.forEach(g => {
      if (g.type !== 'expense_limit' && g.percent >= 80 && g.percent < 100) {
        insights.push({
          type: 'info',
          icon: 'Target',
          title: `Meta "${g.name}" quase lá!`,
          message: `Faltam apenas ${100 - g.percent}% para atingir a meta.`,
          priority: 2
        })
      }
    })

    // 5. Budget warnings
    goals.forEach(g => {
      if (g.type === 'expense_limit' && g.percent >= 90 && g.percent < 100) {
        insights.push({
          type: 'warning',
          icon: 'AlertTriangle',
          title: `Limite "${g.name}" no limite`,
          message: `${g.percent}% do limite usado. Restam apenas ${Math.round(g.targetAmount - g.currentAmount)} reais.`,
          priority: 1
        })
      }
    })

    // 6. Fixed expense ratio
    if (health.fixedRatio > 60) {
      insights.push({
        type: 'warning',
        icon: 'Lock',
        title: 'Despesas fixas altas',
        message: `${health.fixedRatio}% da receita vai para despesas fixas. O ideal é manter abaixo de 50%.`,
        priority: 2
      })
    }

    // 7. Emergency fund
    if (!health.hasEmergencyFund && health.emergencyTarget > 0) {
      const percent = health.emergencyTarget > 0 ? Math.round((health.emergencySaved / health.emergencyTarget) * 100) : 0
      insights.push({
        type: 'info',
        icon: 'Shield',
        title: 'Reserva de emergência',
        message: percent > 0
          ? `Sua reserva cobre ${percent}% do necessário (3 meses de gastos). Continue guardando!`
          : 'Crie uma reserva de emergência para cobrir 3 meses de despesas.',
        priority: 2
      })
    }

    return insights.sort((a, b) => a.priority - b.priority)
  },

  // Reset all data on logout
  reset: () => set({
    user: null, userProfile: null, couple: null, partner: null, coupleId: null,
    transactions: [], budgets: [], goals: [], subscriptions: [], settlements: [], cards: [], investments: [], notifications: [],
    recurringTransactions: [], debts: [],
    globalFilters: { period: 'month', selectedCategories: [], type: 'all', users: 'all' },
    drillDown: null, addTransactionContext: null
  })
}))

export default useStore
