import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bell, Eye, EyeOff, TrendingUp, ArrowRight, AlertTriangle,
  Wallet, CreditCard, BarChart3, Scissors, Target,
  ShoppingCart, UtensilsCrossed, Car, Home, Gamepad2,
  Heart, GraduationCap, ShoppingBag, Briefcase,
  Gift, Plane, MoreHorizontal, Shield, Zap, PiggyBank,
  Filter, X, CalendarDays, Activity, TrendingDown,
  RefreshCw, Receipt, Award, Lock, Calculator, Lightbulb,
  RotateCw, Sparkles, ChevronRight
} from 'lucide-react'
import * as AllLucideIcons from 'lucide-react'
import { Card, Badge, ProgressBar, SectionHeader, Avatar, EmptyState } from '../../components/ui'
import { getProgressColor, getProgressTextColor, toDate } from '../../lib/utils'
import { PageTransition } from '../../components/layout'
import { forceReload, checkForUpdates } from '../../components/PWAUpdatePrompt'
import useStore from '../../lib/store'
import { formatCurrency, formatDate, CATEGORIES } from '../../lib/utils'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ICON_MAP = {
  ShoppingCart, UtensilsCrossed, Car, Home, Gamepad2,
  Heart, GraduationCap, ShoppingBag, CreditCard, TrendingUp,
  Wallet, Briefcase, Gift, Plane, MoreHorizontal, Shield
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
}

const PERIOD_LABELS = {
  month: 'Este mês',
  last_month: 'Mês anterior',
  '3months': '3 meses',
  '6months': '6 meses',
  '12months': '12 meses',
  all: 'Tudo',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    transactions, goals, notifications, debts, recurringTransactions,
    privacyMode, togglePrivacyMode,
    getNetWorth, getBalance, getTotalSavings, getGoalsWithProgress,
    getFinancialHealth, getCashFlowProjection, getSmartInsights,
    user, partner,
    globalFilters, resetGlobalFilters
  } = useStore()

  const allGoals = getGoalsWithProgress()
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  // --- Date range from globalFilters.period ---
  const dateRange = useMemo(() => {
    const now = new Date()
    let start, end
    switch (globalFilters.period) {
      case 'month': start = startOfMonth(now); end = endOfMonth(now); break
      case 'last_month': start = startOfMonth(subMonths(now, 1)); end = endOfMonth(subMonths(now, 1)); break
      case '3months': start = startOfMonth(subMonths(now, 2)); end = endOfMonth(now); break
      case '6months': start = startOfMonth(subMonths(now, 5)); end = endOfMonth(now); break
      case '12months': start = startOfMonth(subMonths(now, 11)); end = endOfMonth(now); break
      default: start = new Date(2000, 0, 1); end = endOfMonth(now); break
    }
    return { start, end }
  }, [globalFilters.period])

  // --- Filter transactions by period + user ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = toDate(t.date || t.createdAt)
      if (d < dateRange.start || d > dateRange.end) return false
      if (globalFilters.users !== 'all' && t.paidBy !== globalFilters.users) return false
      return true
    })
  }, [transactions, dateRange, globalFilters.users])

  // --- Computed from filtered data ---
  const balance = useMemo(() => filteredTransactions.reduce((sum, t) => sum + t.amount, 0), [filteredTransactions])
  const totalSavings = useMemo(() => filteredTransactions.filter(t => t.transactionType === 'savings').reduce((sum, t) => sum + Math.abs(t.amount), 0), [filteredTransactions])
  const recentTransactions = useMemo(() => filteredTransactions.slice(0, 6), [filteredTransactions])

  // --- Check if filters are non-default ---
  const isFilterActive = globalFilters.period !== 'month' || globalFilters.users !== 'all' || globalFilters.selectedCategories.length > 0 || globalFilters.type !== 'all'

  // --- Period label for badge ---
  const periodLabel = useMemo(() => {
    if (globalFilters.period === 'month') return null
    if (globalFilters.period === 'last_month') {
      const m = subMonths(new Date(), 1)
      return format(m, "MMMM 'de' yyyy", { locale: ptBR })
    }
    return PERIOD_LABELS[globalFilters.period] || null
  }, [globalFilters.period])

  // Budget alerts - expense limits approaching or over
  const budgetAlerts = useMemo(() => {
    return allGoals
      .filter(g => g.type === 'expense_limit' && g.percent >= 70)
      .sort((a, b) => b.percent - a.percent)
  }, [allGoals])

  // Goals for carousel (savings + income goals)
  const dashboardGoals = useMemo(() => {
    return allGoals.filter(g => g.type !== 'expense_limit')
  }, [allGoals])

  const [isUpdating, setIsUpdating] = useState(false)

  const handleForceUpdate = () => {
    setIsUpdating(true)
    // Try SW update first, then force reload
    checkForUpdates()
    setTimeout(() => forceReload(), 500)
  }

  const displayValue = (value) => {
    if (privacyMode) return 'R$ ••••••'
    return formatCurrency(value)
  }

  const userName = user?.displayName || 'Você'
  const partnerName = partner?.displayName || 'Parceiro(a)'
  const hasPartner = !!partner

  return (
    <PageTransition>
      <motion.div
        className="px-4 pt-4 pb-6 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Couple Avatar */}
            <div className="relative flex items-center">
              <Avatar src={user?.photoURL} name={userName} size="md" className="ring-2 ring-white dark:ring-slate-900 z-10" />
              {hasPartner && (
                <Avatar src={partner?.photoURL} name={partnerName} size="md" className="ring-2 ring-white dark:ring-slate-900 -ml-3" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">Unity Finance</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Gestão financeira a dois</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Filter indicator */}
            {isFilterActive && (
              <button
                onClick={resetGlobalFilters}
                className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-slate-500 dark:text-slate-400 relative"
                aria-label="Resetar filtros"
                title="Resetar filtros para hoje"
              >
                <Filter className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              </button>
            )}
            {/* Privacy toggle */}
            <button
              onClick={togglePrivacyMode}
              className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-slate-500 dark:text-slate-400"
              aria-label="Alternar modo privacidade"
            >
              {privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            {/* Notifications */}
            <button
              onClick={() => navigate('/app/notifications')}
              className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-slate-500 dark:text-slate-400 relative"
              aria-label="Notificações"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Update App Button */}
        <motion.div variants={itemVariants}>
          <button
            onClick={handleForceUpdate}
            disabled={isUpdating}
            className="w-full flex items-center gap-3 bg-gradient-to-r from-brand-50 to-amber-50 dark:from-brand-900/20 dark:to-amber-900/20 border border-brand-200 dark:border-brand-800/50 rounded-xl px-4 py-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shrink-0 shadow-sm shadow-brand-500/20">
              {isUpdating
                ? <RotateCw className="w-4 h-4 text-white animate-spin" />
                : <RotateCw className="w-4 h-4 text-white" />
              }
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-bold text-slate-800 dark:text-white">
                {isUpdating ? 'Atualizando...' : 'Atualizar App'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Toque para carregar a versao mais recente
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-brand-500 shrink-0" />
          </button>
        </motion.div>

        {/* Period Badge */}
        {periodLabel && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3 py-2">
              <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex-1">
                Visão de <span className="font-bold capitalize">{periodLabel}</span>
              </p>
              <button
                onClick={resetGlobalFilters}
                className="p-1 rounded-full hover:bg-amber-200/50 dark:hover:bg-amber-800/30 text-amber-600 dark:text-amber-400"
                aria-label="Voltar para mês atual"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Net Worth Card */}
        <motion.div variants={itemVariants}>
          <div className="gradient-brand rounded-2xl p-6 shadow-lg shadow-brand-500/20 text-white relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />

            <div className="relative z-10">
              <p className="text-white/80 text-sm font-medium mb-1">
                {periodLabel ? `Saldo do Período` : 'Saldo do Casal'}
              </p>
              <h2 className="text-3xl font-bold mb-2">{displayValue(balance)}</h2>
              {filteredTransactions.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">{filteredTransactions.length} transações</span>
                  </div>
                  {totalSavings > 0 && (
                    <div className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5">
                      <PiggyBank className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">{privacyMode ? '••••' : formatCurrency(totalSavings)} guardado</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Financial Health Score */}
        {filteredTransactions.length > 3 && globalFilters.period === 'month' && (
          <motion.div variants={itemVariants}>
            <SectionHeader
              title="Saúde Financeira"
              action="Relatório"
              onAction={() => navigate('/app/reports')}
            />
            {(() => {
              const health = getFinancialHealth()
              const scoreColor = health.score >= 80 ? 'text-emerald-500' : health.score >= 60 ? 'text-blue-500' : health.score >= 40 ? 'text-amber-500' : 'text-red-500'
              const scoreLabel = health.score >= 80 ? 'Excelente' : health.score >= 60 ? 'Bom' : health.score >= 40 ? 'Regular' : 'Atenção'
              const scoreBg = health.score >= 80 ? 'bg-emerald-500' : health.score >= 60 ? 'bg-blue-500' : health.score >= 40 ? 'bg-amber-500' : 'bg-red-500'
              return (
                <Card padding="p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="relative w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none" stroke="currentColor" strokeWidth="3"
                          className="text-slate-100 dark:text-slate-700" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none" strokeWidth="3" strokeLinecap="round"
                          className={scoreColor}
                          strokeDasharray={`${health.score}, 100`} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-lg font-bold ${scoreColor}`}>{health.score}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${scoreColor}`}>{scoreLabel}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <PiggyBank className="w-3 h-3 text-violet-500" />
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Poupança: {privacyMode ? '••' : `${health.savingsRate}%`}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-blue-500" />
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Fixas: {privacyMode ? '••' : `${health.fixedRatio}%`}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3 h-3 text-emerald-500" />
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Emergência: {health.hasEmergencyFund ? 'OK' : 'Criar'}</span>
                        </div>
                        {health.totalDebt > 0 && (
                          <div className="flex items-center gap-1.5">
                            <TrendingDown className="w-3 h-3 text-red-500" />
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">Dívida: {privacyMode ? '••' : `${health.debtRatio}%`}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })()}
          </motion.div>
        )}

        {/* Smart Insights */}
        {filteredTransactions.length > 3 && globalFilters.period === 'month' && (() => {
          const insights = getSmartInsights()
          if (insights.length === 0) return null
          const INSIGHT_ICONS = { AlertTriangle, TrendingDown, Award, PiggyBank, Target, Lock, Shield }
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
            <motion.div variants={itemVariants}>
              <SectionHeader title="Insights Inteligentes" />
              <div className="space-y-2">
                {insights.slice(0, 3).map((insight, i) => {
                  const InsightIcon = INSIGHT_ICONS[insight.icon] || Zap
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${INSIGHT_COLORS[insight.type]}`}>
                      <InsightIcon className={`w-4 h-4 shrink-0 mt-0.5 ${INSIGHT_TEXT[insight.type]}`} />
                      <div>
                        <p className={`text-xs font-semibold ${INSIGHT_TEXT[insight.type]}`}>{insight.title}</p>
                        <p className={`text-[11px] mt-0.5 ${INSIGHT_TEXT[insight.type]} opacity-80`}>{insight.message}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )
        })()}

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Target, label: 'Metas', path: '/app/budgets', color: 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' },
              { icon: RefreshCw, label: 'Fixas', path: '/app/recurring', color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' },
              { icon: Receipt, label: 'Dívidas', path: '/app/debts', color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
              { icon: BarChart3, label: 'Investimentos', path: '/app/investments', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' }
            ].map((action) => (
              <motion.button
                key={action.label}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl py-4 px-3 shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Gestão Financeira */}
        <motion.div variants={itemVariants}>
          <SectionHeader title="Gestão Financeira" />
          <div className="space-y-2">
            {/* Simulador de Impacto - featured card */}
            <Card padding="p-0" onClick={() => navigate('/app/simulator')}>
              <div className="flex items-center gap-3 p-4">
                <div className="w-11 h-11 rounded-xl gradient-brand flex items-center justify-center shrink-0 shadow-sm shadow-brand-500/20">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">Simulador de Impacto</p>
                    <Badge variant="brand" className="!text-[9px]">Novo</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Simule compras parceladas antes de decidir</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </Card>

            {/* Metas Inteligentes - featured card */}
            <Card padding="p-0" onClick={() => navigate('/app/smart-goals')}>
              <div className="flex items-center gap-3 p-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/20">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">Metas Inteligentes</p>
                    <Badge variant="brand" className="!text-[9px]">Novo</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sugestões de economia baseadas nos seus gastos</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </Card>

            {/* Other management links */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { icon: RefreshCw, label: 'Contas Fixas', path: '/app/recurring', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
                { icon: Receipt, label: 'Dívidas', path: '/app/debts', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                { icon: BarChart3, label: 'Relatório', path: '/app/reports', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
              ].map(item => (
                <motion.button
                  key={item.label}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center gap-1.5 bg-white dark:bg-slate-800 rounded-xl py-3 px-2 shadow-sm border border-slate-100 dark:border-slate-700/50"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg}`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Budget Alerts */}
        {budgetAlerts.length > 0 && (
          <motion.div variants={itemVariants}>
            <SectionHeader
              title="Alertas de Orçamento"
              action="Ver metas"
              onAction={() => navigate('/app/budgets')}
            />
            <div className="space-y-2">
              {budgetAlerts.slice(0, 3).map(alert => {
                const cat = CATEGORIES[alert.category] || CATEGORIES.outros
                const IconComponent = ICON_MAP[cat.icon] || MoreHorizontal
                const isOver = alert.percent >= 100
                return (
                  <Card key={alert.id} padding="p-3" onClick={() => navigate('/app/budgets')}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat.color}15` }}
                      >
                        <IconComponent className="w-4.5 h-4.5" style={{ color: cat.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{alert.name}</p>
                          <span className={`text-xs font-bold ${getProgressTextColor(alert.percent)}`}>
                            {alert.percent}%
                          </span>
                        </div>
                        <ProgressBar value={alert.currentAmount} max={alert.targetAmount} size="sm" />
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          {privacyMode ? '••••' : formatCurrency(alert.currentAmount)} de {privacyMode ? '••••' : formatCurrency(alert.targetAmount)}
                          {isOver && ' — Limite ultrapassado!'}
                        </p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Shared Goals (income + savings) */}
        <motion.div variants={itemVariants}>
          <SectionHeader
            title="Metas"
            action={allGoals.length > 0 ? "Ver todas" : "Criar meta"}
            onAction={() => navigate(allGoals.length > 0 ? '/app/budgets' : '/app/budgets/new')}
          />
          {dashboardGoals.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {dashboardGoals.map((goal) => {
                const GoalIcon = ICON_MAP[goal.icon] || Wallet
                const isSavings = goal.type === 'savings'
                const barColor = isSavings ? 'bg-violet-500' : 'bg-emerald-500'

                return (
                  <motion.div
                    key={goal.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(`/app/budgets/${goal.id}`)}
                    className="min-w-[160px] bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 cursor-pointer shrink-0"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                      isSavings ? 'bg-violet-50 dark:bg-violet-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'
                    }`}>
                      <GoalIcon className={`w-4.5 h-4.5 ${isSavings ? 'text-violet-500' : 'text-emerald-500'}`} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 truncate">{goal.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                      {privacyMode ? '••••••' : formatCurrency(goal.currentAmount)}
                    </p>
                    <ProgressBar
                      value={goal.currentAmount}
                      max={goal.targetAmount}
                      size="sm"
                      color={barColor}
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">{goal.percent}%</p>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <Card padding="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-brand-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Crie sua primeira meta</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Limites, receitas ou poupança</p>
                </div>
                <button
                  onClick={() => navigate('/app/budgets/new')}
                  className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-semibold"
                >
                  Criar
                </button>
              </div>
            </Card>
          )}
        </motion.div>

        {/* Recent Transactions */}
        <motion.div variants={itemVariants}>
          <SectionHeader
            title={periodLabel ? 'Transações do Período' : 'Transações Recentes'}
            action="Ver tudo"
            onAction={() => navigate('/app/history')}
          />

          {recentTransactions.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="Nenhuma transação ainda"
              description="Adicione sua primeira transação para começar a acompanhar seus gastos."
              action="Iniciar Configuração"
              onAction={() => useStore.getState().setShowAddTransaction(true)}
            />
          ) : (
            <Card padding="p-2">
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {recentTransactions.map((transaction, index) => {
                  const cat = CATEGORIES[transaction.category] || CATEGORIES.outros
                  const IconComponent = ICON_MAP[cat?.icon] || AllLucideIcons[cat?.icon] || MoreHorizontal
                  const isIncome = transaction.amount > 0
                  const isSavings = transaction.transactionType === 'savings'

                  return (
                    <motion.button
                      key={transaction.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center w-full py-3 gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl px-3 transition-colors"
                      onClick={() => navigate(`/app/transaction/${transaction.id}`)}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: isSavings ? '#8b5cf615' : (cat?.color + '18'),
                          color: isSavings ? '#8b5cf6' : cat?.color
                        }}
                      >
                        {isSavings ? <PiggyBank className="w-5 h-5" /> : <IconComponent className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {transaction.description}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(transaction.date)}
                          </p>
                          {isSavings && (
                            <Badge variant="brand" className="!text-[10px] !px-1.5 !py-0 !bg-violet-100 !text-violet-600 dark:!bg-violet-900/30 dark:!text-violet-400">
                              Economia
                            </Badge>
                          )}
                          {transaction.isShared && !isSavings && (
                            <Badge variant="brand" className="!text-[10px] !px-1.5 !py-0">
                              Conjunto
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm font-bold shrink-0 ${
                        isSavings ? 'text-violet-500 dark:text-violet-400' :
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' :
                        'text-red-500 dark:text-red-400'
                      }`}>
                        {privacyMode ? '••••' : (isIncome ? '+' : '') + formatCurrency(transaction.amount)}
                      </p>
                    </motion.button>
                  )
                })}
              </div>
            </Card>
          )}
        </motion.div>
      </motion.div>
    </PageTransition>
  )
}
