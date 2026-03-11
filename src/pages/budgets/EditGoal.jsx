import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Pencil, Trash2, Target, Bell, Zap } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Card, Input, TabBar, ProgressBar, Toggle, Button } from '../../components/ui'
import useStore from '../../lib/store'
import { formatCurrency, CATEGORIES } from '../../lib/utils'

export default function EditGoal() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { goals, budgets } = useStore()

  const isNew = !id
  const existingGoal = useMemo(() => {
    if (isNew) return null
    return goals.find(g => g.id === id) || budgets.find(b => b.id === id)
  }, [id, goals, budgets, isNew])

  // Determine if it's a goal or budget
  const isGoal = existingGoal ? 'targetAmount' in existingGoal : true

  // Form state
  const [name, setName] = useState(existingGoal?.name || '')
  const [targetAmount, setTargetAmount] = useState(existingGoal?.targetAmount || existingGoal?.limit || 10000)
  const [currentAmount] = useState(existingGoal?.currentAmount || existingGoal?.spent || 0)
  const [frequency, setFrequency] = useState(existingGoal?.frequency || 'monthly')
  const [remindersEnabled, setRemindersEnabled] = useState(true)
  const [autoInvest, setAutoInvest] = useState(false)

  const categoryKey = existingGoal?.category || 'outros'
  const category = CATEGORIES[categoryKey] || CATEGORIES.outros

  const GoalIcon = LucideIcons[existingGoal?.icon || 'Target'] || LucideIcons.Target

  const frequencyTabs = [
    { key: 'weekly', label: 'Semanal' },
    { key: 'monthly', label: 'Mensal' },
    { key: 'yearly', label: 'Anual' }
  ]

  // Impact calculations
  const monthlySavings = useMemo(() => {
    const remaining = targetAmount - currentAmount
    if (remaining <= 0) return 0
    switch (frequency) {
      case 'weekly': return remaining / ((remaining / (targetAmount * 0.05)) / 4.33)
      case 'yearly': return (remaining / Math.ceil(remaining / (targetAmount * 0.3))) / 12
      default: return targetAmount * 0.05 // ~5% of target per month
    }
  }, [targetAmount, currentAmount, frequency])

  const monthsToGoal = useMemo(() => {
    if (monthlySavings <= 0) return 0
    return Math.ceil((targetAmount - currentAmount) / monthlySavings)
  }, [targetAmount, currentAmount, monthlySavings])

  const percent = targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0

  const handleSave = () => {
    // In a real app, this would save to store/backend
    navigate(-1)
  }

  const handleDelete = () => {
    // In a real app, this would delete from store/backend
    navigate(-1)
  }

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
        title={isNew ? 'Nova Meta' : 'Editar Meta'}
        actions={
          <button
            onClick={handleSave}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-brand-500"
          >
            <Check className="w-5 h-5" strokeWidth={2.5} />
          </button>
        }
      />

      <motion.div
        className="px-5 pb-8 space-y-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Icon Selector */}
        <motion.div variants={itemVariants} className="flex justify-center pt-4">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <GoalIcon className="w-10 h-10" style={{ color: category.color }} />
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-md">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>

        {/* Goal Name */}
        <motion.div variants={itemVariants}>
          <Input
            label="Nome da Meta"
            placeholder="Ex: Viagem Europa"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </motion.div>

        {/* Category Display */}
        <motion.div variants={itemVariants}>
          <Card padding="p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${category.color}15` }}
              >
                <GoalIcon className="w-5 h-5" style={{ color: category.color }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">Categoria</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{category.label}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Target Amount */}
        <motion.div variants={itemVariants}>
          <Card>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Valor Alvo
            </p>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-slate-800 dark:text-white">
                {formatCurrency(targetAmount)}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Atual: <span className="font-semibold text-brand-500">{formatCurrency(currentAmount)}</span>
              </p>
            </div>
            <input
              type="range"
              min={1000}
              max={100000}
              step={500}
              value={targetAmount}
              onChange={(e) => setTargetAmount(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-slate-400 dark:text-slate-500">R$ 1.000</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">R$ 100.000</span>
            </div>
          </Card>
        </motion.div>

        {/* Contribution Frequency */}
        <motion.div variants={itemVariants}>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Frequência de Contribuição
          </p>
          <TabBar tabs={frequencyTabs} active={frequency} onChange={setFrequency} />
        </motion.div>

        {/* Budget Impact */}
        <motion.div variants={itemVariants}>
          <Card className="border-brand-100 dark:border-brand-800/30">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-brand-500" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Impacto no Orçamento
              </p>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">Economia Mensal</p>
              <p className="text-lg font-bold text-brand-500">
                {formatCurrency(monthlySavings)}
              </p>
            </div>

            <ProgressBar value={currentAmount} max={targetAmount} size="md" />

            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
              <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                Levará aproximadamente{' '}
                <span className="font-bold text-slate-800 dark:text-white">
                  {monthsToGoal} {monthsToGoal === 1 ? 'mês' : 'meses'}
                </span>
                {' '}para atingir a meta nesse ritmo.
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Smart Reminders */}
        <motion.div variants={itemVariants}>
          <Card padding="p-4">
            <Toggle
              checked={remindersEnabled}
              onChange={setRemindersEnabled}
              label="Lembretes Inteligentes"
              description="Receba notificações sobre o progresso da meta"
            />
          </Card>
        </motion.div>

        {/* Auto-Invest */}
        <motion.div variants={itemVariants}>
          <Card padding="p-4">
            <Toggle
              checked={autoInvest}
              onChange={setAutoInvest}
              label="Auto-Investir"
              description="Transferir sobras automaticamente para esta meta"
            />
          </Card>
        </motion.div>

        {/* Delete Goal Button */}
        {!isNew && (
          <motion.div variants={itemVariants}>
            <button
              onClick={handleDelete}
              className="w-full py-3.5 border-2 border-dashed border-red-200 dark:border-red-800/50 rounded-2xl flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-semibold">Excluir Meta</span>
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
