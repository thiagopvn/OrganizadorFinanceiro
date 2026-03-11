import { create } from 'zustand'
import { DEMO_TRANSACTIONS, DEMO_BUDGETS, DEMO_GOALS, DEMO_SUBSCRIPTIONS } from './utils'

const useStore = create((set, get) => ({
  // Auth state
  user: null,
  userProfile: null,
  couple: null,
  partner: null,
  isLoading: true,
  isDemo: true,

  setUser: (user) => set({ user }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setCouple: (couple) => set({ couple }),
  setPartner: (partner) => set({ partner }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsDemo: (isDemo) => set({ isDemo }),

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

  // Transactions
  transactions: DEMO_TRANSACTIONS,
  setTransactions: (transactions) => set({ transactions }),
  addTransactionLocal: (transaction) =>
    set({ transactions: [transaction, ...get().transactions] }),

  // Budgets
  budgets: DEMO_BUDGETS,
  setBudgets: (budgets) => set({ budgets }),

  // Goals
  goals: DEMO_GOALS,
  setGoals: (goals) => set({ goals }),

  // Subscriptions
  subscriptions: DEMO_SUBSCRIPTIONS,
  setSubscriptions: (subscriptions) => set({ subscriptions }),

  // UI State
  showAddTransaction: false,
  setShowAddTransaction: (show) => set({ showAddTransaction: show }),

  showSuccess: null,
  setShowSuccess: (data) => set({ showSuccess: data }),

  showAchievement: null,
  setShowAchievement: (data) => set({ showAchievement: data }),

  isOffline: !navigator.onLine,
  setIsOffline: (isOffline) => set({ isOffline }),

  // Notifications
  notifications: [
    { id: 'n1', type: 'ai_alert', title: 'Alerta de IA: Limite de Restaurantes', message: 'No ritmo atual, vocês vão atingir o limite mensal de Restaurantes em 2 dias.', read: false, createdAt: new Date() },
    { id: 'n2', type: 'partner_expense', title: 'Nova despesa compartilhada', message: 'Seu parceiro adicionou R$ 284,50 na categoria Mercado.', read: false, createdAt: new Date(Date.now() - 7200000) },
    { id: 'n3', type: 'achievement', title: 'Conquista Desbloqueada!', message: 'Vocês economizaram 15% a mais este mês comparado à média.', read: true, createdAt: new Date(Date.now() - 18000000) },
    { id: 'n4', type: 'budget_set', title: 'Orçamento Mensal Definido', message: 'Seu orçamento personalizado de Março está pronto para revisão.', read: true, createdAt: new Date(Date.now() - 86400000) }
  ],
  markNotificationRead: (id) => set({
    notifications: get().notifications.map(n => n.id === id ? { ...n, read: true } : n)
  }),

  // Computed values
  getTotalIncome: () => get().transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
  getTotalExpenses: () => get().transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
  getBalance: () => get().transactions.reduce((sum, t) => sum + t.amount, 0),
  getNetWorth: () => 142450.00,
  getCategoryTotals: () => {
    const totals = {}
    get().transactions.filter(t => t.amount < 0).forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount)
    })
    return totals
  }
}))

export default useStore
