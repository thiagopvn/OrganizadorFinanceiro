import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bell, Eye, EyeOff, TrendingUp, ArrowRight, AlertTriangle,
  Wallet, CreditCard, BarChart3, Scissors, Target,
  ShoppingCart, UtensilsCrossed, Car, Home, Gamepad2,
  Heart, GraduationCap, ShoppingBag, Briefcase,
  Gift, Plane, MoreHorizontal, Shield, Zap
} from 'lucide-react'
import { Card, Badge, ProgressBar, SectionHeader, Avatar, EmptyState } from '../../components/ui'
import { getProgressColor, getProgressTextColor } from '../../lib/utils'
import { PageTransition } from '../../components/layout'
import useStore from '../../lib/store'
import { formatCurrency, formatDate, CATEGORIES } from '../../lib/utils'

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

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    transactions, goals, notifications,
    privacyMode, togglePrivacyMode,
    getNetWorth, getBalance, getBudgetsWithSpent, user, partner
  } = useStore()

  const budgets = getBudgetsWithSpent()
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])
  const balance = getBalance()
  const recentTransactions = useMemo(() => transactions.slice(0, 6), [transactions])

  // Budget alerts - categories approaching or over limit
  const budgetAlerts = useMemo(() => {
    return budgets
      .map(b => ({ ...b, percent: b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0 }))
      .filter(b => b.percent >= 70)
      .sort((a, b) => b.percent - a.percent)
  }, [budgets])

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

        {/* Net Worth Card */}
        <motion.div variants={itemVariants}>
          <div className="gradient-brand rounded-2xl p-6 shadow-lg shadow-brand-500/20 text-white relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />

            <div className="relative z-10">
              <p className="text-white/80 text-sm font-medium mb-1">Saldo do Casal</p>
              <h2 className="text-3xl font-bold mb-2">{displayValue(balance)}</h2>
              {transactions.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className={`flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">{transactions.length} transações</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Target, label: 'Metas', path: '/app/budgets', color: 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' },
              { icon: Scissors, label: 'Divisão', path: '/app/split', color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' },
              { icon: CreditCard, label: 'Cartões', path: '/app/cards', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
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

        {/* Budget Alerts */}
        {budgetAlerts.length > 0 && (
          <motion.div variants={itemVariants}>
            <SectionHeader
              title="Alertas de Orçamento"
              action="Ver orçamentos"
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
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{cat.label}</p>
                          <span className={`text-xs font-bold ${getProgressTextColor(alert.percent)}`}>
                            {alert.percent}%
                          </span>
                        </div>
                        <ProgressBar value={alert.spent} max={alert.limit} size="sm" />
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          {privacyMode ? '••••' : formatCurrency(alert.spent)} de {privacyMode ? '••••' : formatCurrency(alert.limit)}
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

        {/* Shared Goals */}
        <motion.div variants={itemVariants}>
          <SectionHeader
            title="Metas Compartilhadas"
            action={goals.length > 0 ? "Ver todas" : "Criar meta"}
            onAction={() => navigate(goals.length > 0 ? '/app/budgets' : '/app/budgets/new')}
          />
          {goals.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {goals.map((goal) => {
                const percent = Math.round((goal.currentAmount / goal.targetAmount) * 100)
                const GoalIcon = ICON_MAP[goal.icon] || Wallet

                return (
                  <motion.div
                    key={goal.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(`/app/budgets/${goal.id}`)}
                    className="min-w-[160px] bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 cursor-pointer shrink-0"
                  >
                    <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-3">
                      <GoalIcon className="w-4.5 h-4.5 text-brand-500" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 truncate">{goal.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                      {privacyMode ? '••••••' : formatCurrency(goal.currentAmount)}
                    </p>
                    <ProgressBar
                      value={goal.currentAmount}
                      max={goal.targetAmount}
                      size="sm"
                      color="bg-brand-500"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">{percent}% concluído</p>
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">Definam objetivos financeiros juntos</p>
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
            title="Transações Recentes"
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
                  const IconComponent = ICON_MAP[cat.icon] || MoreHorizontal
                  const isIncome = transaction.amount > 0

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
                        style={{ backgroundColor: cat.color + '18', color: cat.color }}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {transaction.description}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(transaction.date)}
                          </p>
                          {transaction.isShared && (
                            <Badge variant="brand" className="!text-[10px] !px-1.5 !py-0">
                              Conjunto
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm font-bold shrink-0 ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
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
