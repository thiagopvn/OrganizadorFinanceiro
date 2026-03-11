import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Check, Pencil, Trash2, Target, TrendingDown, TrendingUp, PiggyBank,
  ShoppingCart, UtensilsCrossed, Car, Home, Gamepad2,
  Heart, GraduationCap, ShoppingBag, CreditCard,
  Wallet, Briefcase, Gift, Plane, MoreHorizontal
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Card, Input, TabBar, ProgressBar, Toggle, Button } from '../../components/ui'
import useStore from '../../lib/store'
import { addGoal, updateGoal, deleteGoal } from '../../lib/firebase'
import { formatCurrency, CATEGORIES, CATEGORY_LIST } from '../../lib/utils'

const ICON_MAP = {
  ShoppingCart, UtensilsCrossed, Car, Home, Gamepad2,
  Heart, GraduationCap, ShoppingBag, CreditCard, TrendingUp,
  Wallet, Briefcase, Gift, Plane, MoreHorizontal, PiggyBank, Target
}

const GOAL_TYPES = [
  {
    key: 'expense_limit',
    label: 'Limite de Gasto',
    description: 'Controle quanto gastam em uma categoria',
    icon: TrendingDown,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800/40'
  },
  {
    key: 'income_goal',
    label: 'Meta de Receita',
    description: 'Definam uma meta de ganho mensal',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800/40'
  },
  {
    key: 'savings',
    label: 'Juntar Dinheiro',
    description: 'Guardem dinheiro para um objetivo',
    icon: PiggyBank,
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    border: 'border-violet-200 dark:border-violet-800/40'
  }
]

// Categories filtered by type
const EXPENSE_CATEGORIES = CATEGORY_LIST.filter(c =>
  !['salario', 'freelance'].includes(c.key)
)
const INCOME_CATEGORIES = CATEGORY_LIST.filter(c =>
  ['salario', 'freelance', 'investimento', 'presente', 'outros'].includes(c.key)
)

export default function EditGoal() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { goals, budgets, coupleId } = useStore()

  const isNew = !id
  const existingGoal = useMemo(() => {
    if (isNew) return null
    // Search in goals first, then budgets (legacy)
    const found = goals.find(g => g.id === id)
    if (found) return found
    const budget = budgets.find(b => b.id === id)
    if (budget) return { ...budget, type: 'expense_limit', targetAmount: budget.limit }
    return null
  }, [id, goals, budgets, isNew])

  // Form state
  const [goalType, setGoalType] = useState(existingGoal?.type || '')
  const [name, setName] = useState(existingGoal?.name || '')
  const [targetAmount, setTargetAmount] = useState(existingGoal?.targetAmount || 1000)
  const [category, setCategory] = useState(existingGoal?.category || '')
  const [period, setPeriod] = useState(existingGoal?.period || existingGoal?.frequency || 'monthly')
  const [icon, setIcon] = useState(existingGoal?.icon || '')
  const [remindersEnabled, setRemindersEnabled] = useState(existingGoal?.reminders ?? true)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Step: if editing, skip type selection
  const step = isNew && !goalType ? 'type' : 'config'

  const selectedType = GOAL_TYPES.find(t => t.key === goalType)
  const selectedCat = CATEGORIES[category]
  const GoalIcon = ICON_MAP[icon] || (selectedCat ? ICON_MAP[selectedCat.icon] : null) || Target

  const periodTabs = goalType === 'savings'
    ? [{ key: 'custom', label: 'Sem prazo' }]
    : [
      { key: 'monthly', label: 'Mensal' },
      { key: 'yearly', label: 'Anual' }
    ]

  const categoryOptions = goalType === 'income_goal' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  // Determine range based on type
  const amountRange = goalType === 'savings'
    ? { min: 500, max: 500000, step: 500 }
    : { min: 100, max: 50000, step: 100 }

  const handleSelectType = (type) => {
    setGoalType(type)
    // Set smart defaults
    if (type === 'expense_limit') {
      setName('')
      setCategory('mercado')
      setIcon('')
      setTargetAmount(1000)
      setPeriod('monthly')
    } else if (type === 'income_goal') {
      setName('')
      setCategory('salario')
      setIcon('')
      setTargetAmount(5000)
      setPeriod('monthly')
    } else {
      setName('')
      setCategory('')
      setIcon('PiggyBank')
      setTargetAmount(10000)
      setPeriod('custom')
    }
  }

  const getAutoName = () => {
    if (name.trim()) return name.trim()
    const catLabel = CATEGORIES[category]?.label
    if (goalType === 'expense_limit') return catLabel ? `Limite ${catLabel}` : 'Limite de Gasto'
    if (goalType === 'income_goal') return catLabel ? `Meta ${catLabel}` : 'Meta de Receita'
    return 'Poupança'
  }

  const handleSave = async () => {
    if (!coupleId || saving) return
    setSaving(true)
    try {
      const data = {
        name: getAutoName(),
        type: goalType,
        targetAmount,
        category: category || 'outros',
        period,
        icon: icon || CATEGORIES[category]?.icon || 'Target',
        reminders: remindersEnabled,
      }

      if (isNew) {
        // Savings goals need currentAmount
        if (goalType === 'savings') {
          data.currentAmount = 0
        }
        await addGoal(coupleId, data)
      } else {
        await updateGoal(coupleId, id, data)
      }
      navigate(-1)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!coupleId || !id || saving) return
    setSaving(true)
    try {
      await deleteGoal(coupleId, id)
      navigate(-1)
    } catch (err) {
      console.error('Erro ao excluir:', err)
      alert('Erro ao excluir. Tente novamente.')
    } finally {
      setSaving(false)
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

  // ─── Type Selection Screen ─────────────────────────────────────
  if (step === 'type') {
    return (
      <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
        <PageHeader title="Nova Meta" />
        <motion.div
          className="px-5 pb-8 space-y-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="pt-4">
            <p className="text-base font-bold text-slate-800 dark:text-white mb-1">Que tipo de meta?</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Escolha o tipo de controle financeiro</p>
          </motion.div>

          {GOAL_TYPES.map((type) => (
            <motion.div key={type.key} variants={itemVariants}>
              <Card
                onClick={() => handleSelectType(type.key)}
                className={`border-2 ${goalType === type.key ? type.border : 'border-transparent'} cursor-pointer hover:shadow-md transition-all`}
                padding="p-5"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${type.bg}`}>
                    <type.icon className={`w-6 h-6 ${type.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-white mb-0.5">{type.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{type.description}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    )
  }

  // ─── Configuration Screen ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader
        title={isNew ? selectedType?.label || 'Nova Meta' : 'Editar Meta'}
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-brand-500 disabled:opacity-50"
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
        {/* Type badge */}
        <motion.div variants={itemVariants} className="flex justify-center pt-4">
          <div className="relative">
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${selectedType?.bg || 'bg-brand-50 dark:bg-brand-900/20'}`}
            >
              <GoalIcon className={`w-10 h-10 ${selectedType?.color || 'text-brand-500'}`} />
            </div>
            {isNew && (
              <button
                onClick={() => setGoalType('')}
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center text-xs"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Goal Name */}
        <motion.div variants={itemVariants}>
          <Input
            label="Nome"
            placeholder={
              goalType === 'expense_limit' ? 'Ex: Limite Restaurantes' :
              goalType === 'income_goal' ? 'Ex: Meta Salário' :
              'Ex: Viagem Europa'
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {!name && category && (
            <p className="text-xs text-slate-400 mt-1">
              Será salvo como: "{getAutoName()}"
            </p>
          )}
        </motion.div>

        {/* Category Selection */}
        {goalType !== 'savings' && (
          <motion.div variants={itemVariants}>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Categoria
            </p>
            <div className="flex gap-2 flex-wrap">
              {categoryOptions.map((cat) => {
                const CatIcon = ICON_MAP[cat.icon] || MoreHorizontal
                const isSelected = category === cat.key
                return (
                  <motion.button
                    key={cat.key}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => {
                      setCategory(cat.key)
                      if (!icon) setIcon(cat.icon)
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                    style={isSelected ? { backgroundColor: cat.color } : {}}
                  >
                    <CatIcon className="w-3.5 h-3.5" />
                    {cat.label}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Savings icon selection */}
        {goalType === 'savings' && (
          <motion.div variants={itemVariants}>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Ícone
            </p>
            <div className="flex gap-2 flex-wrap">
              {['PiggyBank', 'Plane', 'Home', 'Car', 'GraduationCap', 'Heart', 'Gift', 'Target'].map((iconName) => {
                const Ic = ICON_MAP[iconName] || LucideIcons[iconName] || Target
                const isSelected = icon === iconName
                return (
                  <motion.button
                    key={iconName}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIcon(iconName)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-violet-500 text-white shadow-md shadow-violet-500/25'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Ic className="w-5 h-5" />
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Target Amount */}
        <motion.div variants={itemVariants}>
          <Card>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              {goalType === 'expense_limit' ? 'Limite Máximo' :
               goalType === 'income_goal' ? 'Meta de Ganho' :
               'Valor para Juntar'}
            </p>
            <div className="text-center mb-4">
              <p className={`text-3xl font-bold ${
                goalType === 'expense_limit' ? 'text-red-500' :
                goalType === 'income_goal' ? 'text-emerald-500' :
                'text-violet-500'
              }`}>
                {formatCurrency(targetAmount)}
              </p>
            </div>
            <input
              type="range"
              min={amountRange.min}
              max={amountRange.max}
              step={amountRange.step}
              value={targetAmount}
              onChange={(e) => setTargetAmount(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-slate-400 dark:text-slate-500">{formatCurrency(amountRange.min)}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{formatCurrency(amountRange.max)}</span>
            </div>
            {/* Manual input */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-500">R$</span>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (v >= 0) setTargetAmount(v)
                }}
                className="flex-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          </Card>
        </motion.div>

        {/* Period */}
        {goalType !== 'savings' && (
          <motion.div variants={itemVariants}>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Período de Controle
            </p>
            <TabBar tabs={periodTabs} active={period} onChange={setPeriod} />
          </motion.div>
        )}

        {/* Info card */}
        <motion.div variants={itemVariants}>
          <Card className={`${selectedType?.bg || ''} border ${selectedType?.border || 'border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {selectedType && <selectedType.icon className={`w-4 h-4 ${selectedType.color}`} />}
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Como funciona
              </p>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {goalType === 'expense_limit' && (
                <>O progresso é calculado automaticamente a partir dos gastos na categoria <strong>{CATEGORIES[category]?.label || 'selecionada'}</strong> no período. Quando chegar perto do limite, vocês recebem um alerta no painel.</>
              )}
              {goalType === 'income_goal' && (
                <>O progresso acompanha todas as receitas na categoria <strong>{CATEGORIES[category]?.label || 'selecionada'}</strong>. A barra de progresso avança conforme as receitas são lançadas.</>
              )}
              {goalType === 'savings' && (
                <>Vocês podem depositar valores manualmente conforme forem poupando. O progresso mostra quanto já foi juntado em relação ao objetivo final.</>
              )}
            </p>
          </Card>
        </motion.div>

        {/* Reminders */}
        <motion.div variants={itemVariants}>
          <Card padding="p-4">
            <Toggle
              checked={remindersEnabled}
              onChange={setRemindersEnabled}
              label="Lembretes"
              description={
                goalType === 'expense_limit'
                  ? 'Avisar quando estiver próximo do limite'
                  : goalType === 'income_goal'
                    ? 'Lembrar de registrar receitas'
                    : 'Lembrar de poupar periodicamente'
              }
            />
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div variants={itemVariants}>
          <Button
            fullWidth
            size="lg"
            onClick={handleSave}
            disabled={saving || (!category && goalType !== 'savings')}
            loading={saving}
            icon={Check}
          >
            {isNew ? 'Criar Meta' : 'Salvar Alterações'}
          </Button>
        </motion.div>

        {/* Delete */}
        {!isNew && (
          <motion.div variants={itemVariants}>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3.5 border-2 border-dashed border-red-200 dark:border-red-800/50 rounded-2xl flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-semibold">Excluir Meta</span>
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl"
          >
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white text-center mb-2">
              Excluir meta?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
              "{existingGoal?.name}" será removida permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
