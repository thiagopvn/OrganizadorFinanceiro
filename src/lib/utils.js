import { format, formatDistanceToNow, isToday, isYesterday, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Currency formatting
export const formatCurrency = (value, currency = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(value)
}

export const formatCurrencyShort = (value) => {
  if (Math.abs(value) >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`
  return formatCurrency(value)
}

// Date formatting
export const formatDate = (date) => {
  if (!date) return ''
  const d = date?.toDate ? date.toDate() : new Date(date)
  if (isToday(d)) return 'Hoje'
  if (isYesterday(d)) return 'Ontem'
  return format(d, "dd 'de' MMM", { locale: ptBR })
}

export const formatDateTime = (date) => {
  if (!date) return ''
  const d = date?.toDate ? date.toDate() : new Date(date)
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export const formatMonthYear = (date) => {
  const d = date?.toDate ? date.toDate() : new Date(date)
  return format(d, "MMMM 'de' yyyy", { locale: ptBR })
}

export const formatRelative = (date) => {
  if (!date) return ''
  const d = date?.toDate ? date.toDate() : new Date(date)
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
}

export const getMonthDays = (date) => {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  return eachDayOfInterval({ start, end })
}

// Category definitions
export const CATEGORIES = {
  mercado: { label: 'Mercado', icon: 'ShoppingCart', color: '#f97316' },
  restaurante: { label: 'Restaurantes', icon: 'UtensilsCrossed', color: '#ef4444' },
  transporte: { label: 'Transporte', icon: 'Car', color: '#8b5cf6' },
  moradia: { label: 'Moradia', icon: 'Home', color: '#3b82f6' },
  lazer: { label: 'Lazer', icon: 'Gamepad2', color: '#10b981' },
  saude: { label: 'Saúde', icon: 'Heart', color: '#ec4899' },
  educacao: { label: 'Educação', icon: 'GraduationCap', color: '#06b6d4' },
  compras: { label: 'Compras', icon: 'ShoppingBag', color: '#f59e0b' },
  assinatura: { label: 'Assinaturas', icon: 'CreditCard', color: '#6366f1' },
  investimento: { label: 'Investimentos', icon: 'TrendingUp', color: '#14b8a6' },
  salario: { label: 'Salário', icon: 'Wallet', color: '#22c55e' },
  freelance: { label: 'Freelance', icon: 'Briefcase', color: '#a855f7' },
  presente: { label: 'Presentes', icon: 'Gift', color: '#f43f5e' },
  viagem: { label: 'Viagem', icon: 'Plane', color: '#0ea5e9' },
  outros: { label: 'Outros', icon: 'MoreHorizontal', color: '#64748b' }
}

export const CATEGORY_LIST = Object.entries(CATEGORIES).map(([key, val]) => ({ key, ...val }))

// Progress bar color based on percentage
export const getProgressColor = (percent) => {
  if (percent >= 100) return 'bg-red-500'
  if (percent >= 80) return 'bg-orange-500'
  if (percent >= 60) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export const getProgressTextColor = (percent) => {
  if (percent >= 100) return 'text-red-600'
  if (percent >= 80) return 'text-orange-600'
  if (percent >= 60) return 'text-amber-600'
  return 'text-emerald-600'
}

// Calculate split amounts
export const calculateSplit = (total, ratioA, ratioB) => ({
  amountA: (total * ratioA) / 100,
  amountB: (total * ratioB) / 100
})

// Generate initials from name
export const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Safe Firestore Timestamp → JS Date conversion
export const toDate = (d) => {
  if (!d) return new Date()
  if (d?.toDate) return d.toDate()
  if (d instanceof Date) return d
  return new Date(d)
}

// Clamp number
export const clamp = (num, min, max) => Math.min(Math.max(num, min), max)

// Group transactions by date
export const groupByDate = (transactions) => {
  const groups = {}
  transactions.forEach(t => {
    const date = toDate(t.date || t.createdAt)
    const key = format(date, 'yyyy-MM-dd')
    if (!groups[key]) groups[key] = { date, transactions: [] }
    groups[key].transactions.push(t)
  })
  return Object.values(groups).sort((a, b) => b.date - a.date)
}

// Demo data for initial state
export const DEMO_TRANSACTIONS = [
  { id: 'd1', description: 'Supermercado Extra', amount: -284.50, category: 'mercado', date: new Date(), paidBy: 'user1', isShared: true, merchant: 'Extra' },
  { id: 'd2', description: 'Uber', amount: -32.90, category: 'transporte', date: new Date(Date.now() - 86400000), paidBy: 'user1', isShared: true, merchant: 'Uber' },
  { id: 'd3', description: 'Netflix', amount: -55.90, category: 'assinatura', date: new Date(Date.now() - 86400000 * 2), paidBy: 'user2', isShared: true, merchant: 'Netflix' },
  { id: 'd4', description: 'Restaurante Outback', amount: -189.00, category: 'restaurante', date: new Date(Date.now() - 86400000 * 2), paidBy: 'user1', isShared: true, merchant: 'Outback' },
  { id: 'd5', description: 'Salário', amount: 6000.00, category: 'salario', date: new Date(Date.now() - 86400000 * 5), paidBy: 'user1', isShared: false, merchant: '' },
  { id: 'd6', description: 'Aluguel', amount: -1800.00, category: 'moradia', date: new Date(Date.now() - 86400000 * 5), paidBy: 'user1', isShared: true, merchant: '' },
  { id: 'd7', description: 'Spotify Family', amount: -34.90, category: 'assinatura', date: new Date(Date.now() - 86400000 * 7), paidBy: 'user2', isShared: true, merchant: 'Spotify' },
  { id: 'd8', description: 'Farmácia', amount: -67.80, category: 'saude', date: new Date(Date.now() - 86400000 * 8), paidBy: 'user2', isShared: true, merchant: 'Drogasil' },
  { id: 'd9', description: 'Cinema', amount: -85.00, category: 'lazer', date: new Date(Date.now() - 86400000 * 10), paidBy: 'user1', isShared: true, merchant: 'Cinemark' },
  { id: 'd10', description: 'Salário', amount: 4000.00, category: 'salario', date: new Date(Date.now() - 86400000 * 5), paidBy: 'user2', isShared: false, merchant: '' }
]

export const DEMO_BUDGETS = [
  { id: 'b1', category: 'mercado', limit: 1200, spent: 850, period: 'monthly', icon: 'ShoppingCart' },
  { id: 'b2', category: 'restaurante', limit: 600, spent: 350, period: 'monthly', icon: 'UtensilsCrossed' },
  { id: 'b3', category: 'lazer', limit: 400, spent: 240, period: 'monthly', icon: 'Gamepad2' },
  { id: 'b4', category: 'transporte', limit: 500, spent: 180, period: 'monthly', icon: 'Car' }
]

export const DEMO_GOALS = [
  { id: 'g1', name: 'Viagem Europa', icon: 'Plane', category: 'viagem', targetAmount: 25000, currentAmount: 8500, frequency: 'monthly' },
  { id: 'g2', name: 'Entrada Apartamento', icon: 'Home', category: 'moradia', targetAmount: 80000, currentAmount: 32000, frequency: 'monthly' },
  { id: 'g3', name: 'Reserva de Emergência', icon: 'Shield', category: 'outros', targetAmount: 30000, currentAmount: 28500, frequency: 'monthly' }
]

export const DEMO_SUBSCRIPTIONS = [
  { id: 's1', name: 'Netflix', amount: 55.90, category: 'assinatura', billingDate: 15, splitType: 'equal', active: true },
  { id: 's2', name: 'Spotify Family', amount: 34.90, category: 'assinatura', billingDate: 22, splitType: 'equal', active: true },
  { id: 's3', name: 'SmartFit Casal', amount: 199.80, category: 'saude', billingDate: 10, splitType: 'proportional', active: true },
  { id: 's4', name: 'iCloud 200GB', amount: 14.90, category: 'assinatura', billingDate: 5, splitType: 'equal', active: true }
]
