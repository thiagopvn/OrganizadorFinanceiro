import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Lightbulb, Trophy, Target, ChevronRight } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Card, TabBar, ProgressBar, SectionHeader, Badge } from '../../components/ui'
import useStore from '../../lib/store'
import { formatCurrency, CATEGORIES, getProgressColor, getProgressTextColor } from '../../lib/utils'

export default function Budgets() {
  const navigate = useNavigate()
  const { budgets, goals, privacyMode } = useStore()
  const [period, setPeriod] = useState('monthly')

  const periodTabs = [
    { key: 'weekly', label: 'Semanal' },
    { key: 'monthly', label: 'Mensal' },
    { key: 'yearly', label: 'Anual' }
  ]

  const getCategoryIcon = (categoryKey) => {
    const cat = CATEGORIES[categoryKey]
    if (!cat) return LucideIcons.MoreHorizontal
    return LucideIcons[cat.icon] || LucideIcons.MoreHorizontal
  }

  const getGoalIcon = (iconName) => {
    return LucideIcons[iconName] || LucideIcons.Target
  }

  // Active budgets (not fully completed)
  const activeBudgets = useMemo(() => {
    return budgets.filter(b => {
      const percent = (b.spent / b.limit) * 100
      return percent < 100
    })
  }, [budgets])

  // Completed budgets (at or near 100%)
  const completedBudgets = useMemo(() => {
    return budgets.filter(b => {
      const percent = (b.spent / b.limit) * 100
      return percent >= 100
    })
  }, [budgets])

  // Goals near completion
  const completedGoals = useMemo(() => {
    return goals.filter(g => {
      const percent = (g.currentAmount / g.targetAmount) * 100
      return percent >= 95
    })
  }, [goals])

  // Long-term goals (not near completion)
  const longTermGoals = useMemo(() => {
    return goals.filter(g => {
      const percent = (g.currentAmount / g.targetAmount) * 100
      return percent < 95
    })
  }, [goals])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  }

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader
        title="Metas e Orçamentos"
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
        {/* Period Selector */}
        <motion.div variants={itemVariants} className="pt-2">
          <TabBar tabs={periodTabs} active={period} onChange={setPeriod} />
        </motion.div>

        {/* AI Insight Card */}
        <motion.div variants={itemVariants}>
          <Card className="bg-amber-50/80 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center shrink-0">
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                  Insight da IA
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                  <span className="font-semibold">Atenção:</span> Vocês atingirão o limite de{' '}
                  <span className="font-semibold">Supermercado</span> em 3 dias no ritmo atual de gastos.
                  Considere reduzir compras não essenciais nesta categoria.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Active Budget Categories */}
        <motion.div variants={itemVariants}>
          <SectionHeader
            title="Categorias em Aberto"
          />
          <div className="space-y-3">
            {activeBudgets.map(budget => {
              const cat = CATEGORIES[budget.category] || CATEGORIES.outros
              const IconComponent = getCategoryIcon(budget.category)
              const percent = Math.round((budget.spent / budget.limit) * 100)

              return (
                <motion.div key={budget.id} variants={itemVariants}>
                  <Card
                    onClick={() => navigate(`/app/budgets/${budget.id}`)}
                    padding="p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat.color}15` }}
                      >
                        <IconComponent className="w-5 h-5" style={{ color: cat.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                          {cat.label}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {privacyMode ? '••••' : formatCurrency(budget.spent)} de{' '}
                          {privacyMode ? '••••' : formatCurrency(budget.limit)}
                        </p>
                      </div>
                      <span className={`text-sm font-bold ${getProgressTextColor(percent)}`}>
                        {percent}%
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                    <ProgressBar value={budget.spent} max={budget.limit} size="sm" />
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <motion.div variants={itemVariants}>
            <SectionHeader title="Metas Concluídas" />
            <div className="space-y-3">
              {completedGoals.map(goal => {
                const GoalIcon = getGoalIcon(goal.icon)
                const percent = Math.round((goal.currentAmount / goal.targetAmount) * 100)

                return (
                  <motion.div key={goal.id} variants={itemVariants}>
                    <Card
                      onClick={() => navigate(`/app/budgets/${goal.id}`)}
                      padding="p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                          <Trophy className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">
                              {goal.name}
                            </p>
                            <Badge variant="success">Meta Batida!</Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            <span className="line-through text-slate-400 dark:text-slate-500">
                              {privacyMode ? '••••' : formatCurrency(goal.targetAmount)}
                            </span>
                            {' '}
                            <span className="font-semibold text-emerald-500">
                              {privacyMode ? '••••' : formatCurrency(goal.currentAmount)}
                            </span>
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

        {/* Long-term Goals */}
        <motion.div variants={itemVariants}>
          <SectionHeader title="Metas de Longo Prazo" />
          <div className="space-y-3">
            {longTermGoals.map(goal => {
              const GoalIcon = getGoalIcon(goal.icon)
              const percent = Math.round((goal.currentAmount / goal.targetAmount) * 100)
              const cat = CATEGORIES[goal.category]

              return (
                <motion.div key={goal.id} variants={itemVariants}>
                  <Card
                    onClick={() => navigate(`/app/budgets/${goal.id}`)}
                    padding="p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: cat ? `${cat.color}15` : '#f9731615' }}
                      >
                        <GoalIcon
                          className="w-5 h-5"
                          style={{ color: cat?.color || '#f97316' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                          {goal.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {privacyMode ? '••••' : formatCurrency(goal.currentAmount)} de{' '}
                          {privacyMode ? '••••' : formatCurrency(goal.targetAmount)}
                        </p>
                      </div>
                      <span className={`text-sm font-bold ${getProgressTextColor(percent)}`}>
                        {percent}%
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                    <ProgressBar value={goal.currentAmount} max={goal.targetAmount} size="sm" />
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
