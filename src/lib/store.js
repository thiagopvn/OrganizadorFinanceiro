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
  getTotalExpenses: () => get().transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
  getBalance: () => get().transactions.reduce((sum, t) => sum + t.amount, 0),
  getNetWorth: () => {
    // Net worth = soma de todas as transações (receitas - despesas)
    return get().transactions.reduce((sum, t) => sum + t.amount, 0)
  },
  getCategoryTotals: () => {
    const totals = {}
    get().transactions.filter(t => t.amount < 0).forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount)
    })
    return totals
  },

  // Budgets with spent calculated from current month transactions
  getBudgetsWithSpent: () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const transactions = get().transactions
    const budgets = get().budgets

    // Calculate spent per category for current month
    const monthlySpent = {}
    transactions.forEach(t => {
      if (t.amount >= 0) return // only expenses
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

  // Reset all data on logout
  reset: () => set({
    user: null, userProfile: null, couple: null, partner: null, coupleId: null,
    transactions: [], budgets: [], goals: [], subscriptions: [], settlements: [], cards: [], investments: [], notifications: []
  })
}))

export default useStore
