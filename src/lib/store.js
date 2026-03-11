import { create } from 'zustand'

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

  // Reset all data on logout
  reset: () => set({
    user: null, userProfile: null, couple: null, partner: null, coupleId: null,
    transactions: [], budgets: [], goals: [], subscriptions: [], settlements: [], cards: [], investments: [], notifications: []
  })
}))

export default useStore
