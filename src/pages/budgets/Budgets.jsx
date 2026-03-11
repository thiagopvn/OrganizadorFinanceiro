import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, TrendingDown, TrendingUp, PiggyBank, ChevronRight, Trophy,
  Target, AlertTriangle, Coins
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Card, TabBar, ProgressBar, SectionHeader, Badge, Button, EmptyState } from '../../components/ui'
import useStore from '../../lib/store'
import { updateGoal } from '../../lib/firebase'
import { formatCurrency, CATEGORIES, getProgressColor, getProgressTextColor } from '../../lib/utils'

export default function Budgets() {
  const navigate = useNavigate()
  const { goals, privacyMode, coupleId, getGoalsWithProgress } = useStore()
  const [activeTab, setActiveTab] = useState('all')
  const [depositGoalId, setDepositGoalId] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)

  const tabs = [
    { key: 'all', label: 'Todos' },
    { key: 'expense_limit', label: 'Limites' },
    { key: 'income_goal', label: 'Receitas' },
    { key: 'savings', label: 'Poupança' }
  ]

  const allGoals = getGoalsWithProgress()

  const filteredGoals = useMemo(() => {
    if (activeTab === 'all') return allGoals
    return allGoals.filter(g => g.type === activeTab)
  }, [allGoals, activeTab])

  // Separate by status
  const activeGoals = useMemo(() =>
    filteredGoals.filter(g => g.percent < 100),
    [filteredGoals]
  )
  const completedGoals = useMemo(() =>
    filteredGoals.filter(g => g.percent >= 100),
    [filteredGoals]
  )

  // Summary stats
  const stats = useMemo(() => {
    const limits = allGoals.filter(g => g.type === 'expense_limit')
    const incomeGoals = allGoals.filter(g => g.type === 'income_goal')
    const savingsGoals = allGoals.filter(g => g.type === 'savings')

    const nearLimit = limits.filter(g => g.percent >= 80).length
    const totalSaved = savingsGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0)

    return { limitsCount: limits.length, incomeCount: incomeGoals.length, savingsCount: savingsGoals.length, nearLimit, totalSaved }
  }, [allGoals])

  const getGoalIcon = (goal) => {
    if (goal.icon) {
      return LucideIcons[goal.icon] || LucideIcons.Target
    }
    const cat = CATEGORIES[goal.category]
    if (cat) return LucideIcons[cat.icon] || LucideIcons.Target
    return LucideIcons.Target
  }

  const getTypeInfo = (type) => {
    switch (type) {
      case 'expense_limit':
        return { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Limite' }
      case 'income_goal':
        return { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Receita' }
      case 'savings':
        return { icon: PiggyBank, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', label: 'Poupança' }
      default:
        return { icon: Target, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20', label: 'Meta' }
    }
  }

  const getProgressLabel = (goal) => {
    if (goal.type === 'expense_limit') {
      return `${privacyMode ? '••••' : formatCurrency(goal.currentAmount)} de ${privacyMode ? '••••' : formatCurrency(goal.targetAmount)}`
    }
    if (goal.type === 'income_goal') {
      return `${privacyMode ? '••••' : formatCurrency(goal.currentAmount)} de ${privacyMode ? '••••' : formatCurrency(goal.targetAmount)}`
    }
    // savings
    return `${privacyMode ? '••••' : formatCurrency(goal.currentAmount || 0)} de ${privacyMode ? '••••' : formatCurrency(goal.targetAmount)}`
  }

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0 || !coupleId || depositing) return
    setDepositing(true)
    try {
      const goal = allGoals.find(g => g.id === depositGoalId)
      if (!goal) return
      await updateGoal(coupleId, depositGoalId, {
        currentAmount: (goal.currentAmount || 0) + amount
      })
      setDepositGoalId(null)
      setDepositAmount('')
    } catch (err) {
      console.error('Erro ao depositar:', err)
    } finally {
      setDepositing(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  }

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader
        title="Metas e Controle"
        onBack={false}
        actions={
          <button
            onClick={() => navigate('/app/budgets/new')}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-brand-500"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <motion.div
        className="px-5 pb-8 space-y-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Summary Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2.5 pt-2">
          <Card padding="p-3" className="text-center">
            <TrendingDown className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-slate-800 dark:text-white">{stats.limitsCount}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Limites</p>
            {stats.nearLimit > 0 && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] text-amber-600 font-semibold">{stats.nearLimit} alerta{stats.nearLimit > 1 ? 's' : ''}</span>
              </div>
            )}
          </Card>
          <Card padding="p-3" className="text-center">
            <TrendingUp className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-slate-800 dark:text-white">{stats.incomeCount}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Receitas</p>
          </Card>
          <Card padding="p-3" className="text-center">
            <PiggyBank className="w-5 h-5 text-violet-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              {privacyMode ? '••••' : formatCurrency(stats.totalSaved)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Poupado</p>
          </Card>
        </motion.div>

        {/* Tab Bar */}
        <motion.div variants={itemVariants}>
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </motion.div>

        {/* Empty state */}
        {filteredGoals.length === 0 && (
          <motion.div variants={itemVariants}>
            <EmptyState
              icon={Target}
              title="Nenhuma meta criada"
              description="Crie limites de gasto, metas de receita ou objetivos de poupança para controlar suas finanças."
              action="Criar Meta"
              onAction={() => navigate('/app/budgets/new')}
            />
          </motion.div>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <motion.div variants={itemVariants}>
            <SectionHeader title="Em Andamento" />
            <div className="space-y-3">
              {activeGoals.map(goal => {
                const GoalIcon = getGoalIcon(goal)
                const typeInfo = getTypeInfo(goal.type)
                const cat = CATEGORIES[goal.category]
                const isWarning = goal.type === 'expense_limit' && goal.percent >= 80

                return (
                  <motion.div key={goal.id} variants={itemVariants}>
                    <Card padding="p-4">
                      <div
                        className="flex items-center gap-3 mb-3 cursor-pointer"
                        onClick={() => navigate(`/app/budgets/${goal.id}`)}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!cat ? typeInfo.bg : ''}`}
                          style={cat ? { backgroundColor: `${cat.color}15` } : undefined}
                        >
                          <GoalIcon
                            className={`w-5 h-5 ${!cat ? typeInfo.color : ''}`}
                            style={cat ? { color: cat.color } : undefined}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                              {goal.name}
                            </p>
                            <Badge
                              variant={goal.type === 'expense_limit' ? 'danger' : goal.type === 'income_goal' ? 'success' : 'brand'}
                              className="!text-[9px] !px-1.5 !py-0 shrink-0"
                            >
                              {typeInfo.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {getProgressLabel(goal)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isWarning && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                          <span className={`text-sm font-bold ${
                            goal.type === 'expense_limit' ? getProgressTextColor(goal.percent) :
                            goal.percent >= 100 ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'
                          }`}>
                            {goal.percent}%
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                      <ProgressBar
                        value={goal.currentAmount}
                        max={goal.targetAmount}
                        size="sm"
                        color={
                          goal.type === 'expense_limit' ? undefined :
                          goal.type === 'income_goal' ? 'bg-emerald-500' :
                          'bg-violet-500'
                        }
                      />

                      {/* Info for savings goals */}
                      {goal.type === 'savings' && (
                        <div className="mt-3">
                          {goal.period === 'custom' ? (
                            // Legacy manual deposit for "no deadline" goals
                            depositGoalId === goal.id ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2">
                                  <span className="text-xs text-slate-400">R$</span>
                                  <input
                                    type="number"
                                    placeholder="0,00"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    autoFocus
                                    className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 focus:outline-none w-full"
                                  />
                                </div>
                                <button
                                  onClick={handleDeposit}
                                  disabled={depositing || !depositAmount}
                                  className="px-3 py-2 bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                                >
                                  {depositing ? '...' : 'Depositar'}
                                </button>
                                <button
                                  onClick={() => { setDepositGoalId(null); setDepositAmount('') }}
                                  className="px-2 py-2 text-slate-400 text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDepositGoalId(goal.id)}
                                className="w-full py-2 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                              >
                                <Coins className="w-3.5 h-3.5" />
                                Depositar Valor
                              </button>
                            )
                          ) : (
                            <p className="text-[10px] text-violet-500 dark:text-violet-400 text-center font-medium">
                              Use a aba "Economia" ao adicionar transações
                            </p>
                          )}
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <motion.div variants={itemVariants}>
            <SectionHeader title={completedGoals[0]?.type === 'expense_limit' ? 'Limite Atingido' : 'Metas Concluídas'} />
            <div className="space-y-3">
              {completedGoals.map(goal => {
                const GoalIcon = getGoalIcon(goal)
                const typeInfo = getTypeInfo(goal.type)
                const isOverBudget = goal.type === 'expense_limit'

                return (
                  <motion.div key={goal.id} variants={itemVariants}>
                    <Card
                      onClick={() => navigate(`/app/budgets/${goal.id}`)}
                      padding="p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isOverBudget ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'
                        }`}>
                          {isOverBudget
                            ? <AlertTriangle className="w-5 h-5 text-red-500" />
                            : <Trophy className="w-5 h-5 text-emerald-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                              {goal.name}
                            </p>
                            <Badge variant={isOverBudget ? 'danger' : 'success'}>
                              {isOverBudget ? 'Estourou!' : 'Concluída!'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {getProgressLabel(goal)}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
