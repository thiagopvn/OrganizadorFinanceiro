import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target, Lightbulb, TrendingDown, TrendingUp, Scissors, DollarSign,
  ArrowRight, CheckCircle2, Plus, PiggyBank, Shield, AlertTriangle,
  BarChart3, Sparkles, Award, ChevronDown, ChevronUp, Zap, Eye, Star
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Card, Button, Input, Badge, ProgressBar, SectionHeader, EmptyState } from '../../components/ui'
import { DonutChart, HorizontalBarChart } from '../../components/charts'
import useStore from '../../lib/store'
import { addGoal } from '../../lib/firebase'
import { formatCurrency, CATEGORIES, getCategoryList } from '../../lib/utils'

function StatBox({ label, children, className = '' }) {
  return (
    <div className={`bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 ${className}`}>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-0.5">{label}</p>
      {children}
    </div>
  )
}

// Priority levels for savings suggestions
const PRIORITY_CONFIG = {
  high: { label: 'Alta', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', badge: 'danger' },
  medium: { label: 'Media', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', badge: 'warning' },
  low: { label: 'Baixa', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', badge: 'info' },
}

export default function SmartGoals() {
  const navigate = useNavigate()
  const { transactions, goals, debts, subscriptions, coupleId, privacyMode } = useStore()
  const health = useStore(s => s.getFinancialHealth())
  const goalsWithProgress = useStore(s => s.getGoalsWithProgress())

  const [targetSavings, setTargetSavings] = useState('')
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [showStrategy, setShowStrategy] = useState(false)
  const [creatingGoal, setCreatingGoal] = useState(null)
  const [savedGoals, setSavedGoals] = useState([])

  const hide = (v) => privacyMode ? '••••' : formatCurrency(v)

  // Deep spending analysis
  const spendingAnalysis = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Last 3 months spending by category
    const monthlyByCategory = {}
    const last3Months = []
    for (let i = 0; i < 3; i++) {
      const m = new Date(currentYear, currentMonth - i, 1)
      last3Months.push({ month: m.getMonth(), year: m.getFullYear() })
    }

    transactions.forEach(t => {
      if (t.amount >= 0 || t.transactionType === 'savings') return
      const d = t.date?.toDate ? t.date.toDate() : (t.date instanceof Date ? t.date : new Date(t.date || t.createdAt?.toDate?.() || t.createdAt))
      const isRecent = last3Months.some(p => d.getMonth() === p.month && d.getFullYear() === p.year)
      if (!isRecent) return

      const cat = t.category || 'outros'
      if (!monthlyByCategory[cat]) monthlyByCategory[cat] = { total: 0, count: 0, months: new Set() }
      monthlyByCategory[cat].total += Math.abs(t.amount)
      monthlyByCategory[cat].count++
      monthlyByCategory[cat].months.add(`${d.getMonth()}-${d.getFullYear()}`)
    })

    // Calculate averages and sort by amount
    const categories = Object.entries(monthlyByCategory)
      .map(([cat, data]) => {
        const monthCount = Math.max(data.months.size, 1)
        const monthlyAvg = data.total / monthCount
        const catInfo = CATEGORIES[cat]
        return {
          key: cat,
          label: catInfo?.label || cat,
          icon: catInfo?.icon || 'MoreHorizontal',
          color: catInfo?.color || '#64748b',
          monthlyAvg,
          total3m: data.total,
          txCount: data.count,
          monthCount
        }
      })
      .sort((a, b) => b.monthlyAvg - a.monthlyAvg)

    const totalMonthlyExpense = categories.reduce((s, c) => s + c.monthlyAvg, 0)

    return { categories, totalMonthlyExpense }
  }, [transactions])

  // Generate savings suggestions based on target
  const suggestions = useMemo(() => {
    const target = parseFloat(targetSavings) || 0
    if (target <= 0 || spendingAnalysis.categories.length === 0) return null

    const { monthlyIncome, monthlyExpenses, monthlySavings } = health
    const currentSavingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0
    const targetSavingsRate = monthlyIncome > 0 ? ((monthlySavings + target) / monthlyIncome) * 100 : 0
    const maxPossible = Math.max(0, monthlyIncome - monthlyExpenses - monthlySavings)
    const isFeasible = target <= maxPossible + (monthlyExpenses * 0.3) // up to 30% cut
    const freeIncome = monthlyIncome - monthlyExpenses - monthlySavings

    // Categorize spending
    const fixedCategories = ['moradia', 'assinatura', 'educacao', 'saude']
    const discretionaryCategories = spendingAnalysis.categories.filter(c => !fixedCategories.includes(c.key))
    const fixedSpending = spendingAnalysis.categories.filter(c => fixedCategories.includes(c.key))

    // Generate suggestions per category
    const categorySuggestions = []
    let accumulatedSaving = 0

    // First: suggest cutting discretionary spending (easier)
    discretionaryCategories.forEach(cat => {
      if (accumulatedSaving >= target) return

      let reductionPercent, priority, tip
      const remaining = target - accumulatedSaving

      if (cat.key === 'restaurante') {
        reductionPercent = 30
        tip = 'Cozinhe mais em casa e leve marmita. Substitua jantares fora por receitas especiais em casa.'
        priority = 'high'
      } else if (cat.key === 'lazer') {
        reductionPercent = 25
        tip = 'Busque opcoes gratuitas de lazer: parques, trilhas, eventos culturais. Reduza idas ao cinema e shows.'
        priority = 'medium'
      } else if (cat.key === 'compras') {
        reductionPercent = 40
        tip = 'Aplique a regra dos 30 dias: espere 30 dias antes de compras nao essenciais. Evite compras por impulso.'
        priority = 'high'
      } else if (cat.key === 'transporte') {
        reductionPercent = 20
        tip = 'Use transporte publico, carona compartilhada ou bicicleta quando possivel. Agrupe trajetos.'
        priority = 'medium'
      } else if (cat.key === 'mercado') {
        reductionPercent = 15
        tip = 'Faca lista de compras, compare precos, aproveite promocoes e evite desperdicio de alimentos.'
        priority = 'medium'
      } else if (cat.key === 'viagem') {
        reductionPercent = 50
        tip = 'Adie viagens nao planejadas. Viaje em baixa temporada e busque hospedagens alternativas.'
        priority = 'low'
      } else if (cat.key === 'presente') {
        reductionPercent = 30
        tip = 'Defina um teto para presentes. Considere presentes feitos a mao ou experiencias.'
        priority = 'low'
      } else {
        reductionPercent = 20
        tip = 'Revise seus gastos nessa categoria e identifique o que pode ser reduzido ou eliminado.'
        priority = 'low'
      }

      const possibleSaving = cat.monthlyAvg * (reductionPercent / 100)
      const actualSaving = Math.min(possibleSaving, remaining)

      if (actualSaving >= 10) { // min R$ 10 suggestion
        categorySuggestions.push({
          category: cat.key,
          label: cat.label,
          icon: cat.icon,
          color: cat.color,
          currentSpending: cat.monthlyAvg,
          suggestedReduction: reductionPercent,
          savingAmount: actualSaving,
          newSpending: cat.monthlyAvg - actualSaving,
          tip,
          priority
        })
        accumulatedSaving += actualSaving
      }
    })

    // Then: suggest subscription cuts if needed
    if (accumulatedSaving < target) {
      const activeSubs = subscriptions.filter(s => s.active !== false)
      const totalSubCost = activeSubs.reduce((s, sub) => s + (sub.amount || 0), 0)

      if (totalSubCost > 0 && activeSubs.length > 0) {
        const cheapestSubs = [...activeSubs].sort((a, b) => (a.amount || 0) - (b.amount || 0))
        let subSaving = 0
        const subsToCancel = []

        for (const sub of cheapestSubs) {
          if (accumulatedSaving + subSaving >= target) break
          subSaving += sub.amount || 0
          subsToCancel.push(sub.name)
        }

        if (subSaving > 0) {
          categorySuggestions.push({
            category: 'assinatura',
            label: 'Assinaturas',
            icon: 'CreditCard',
            color: '#6366f1',
            currentSpending: totalSubCost,
            suggestedReduction: Math.round((subSaving / totalSubCost) * 100),
            savingAmount: subSaving,
            newSpending: totalSubCost - subSaving,
            tip: `Considere cancelar: ${subsToCancel.join(', ')}. Avalie quais assinaturas voce realmente usa.`,
            priority: 'medium'
          })
          accumulatedSaving += subSaving
        }
      }
    }

    // Sort by priority then saving amount
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    categorySuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.savingAmount - a.savingAmount)

    // Financial strategy
    const strategies = []

    // Emergency fund check
    if (!health.hasEmergencyFund) {
      strategies.push({
        icon: 'Shield',
        title: 'Crie uma reserva de emergencia',
        description: `Meta: ${formatCurrency(health.emergencyTarget)} (3 meses de gastos). Priorize isso antes de outras metas.`,
        priority: 'high'
      })
    }

    // Debt strategy
    if (debts.length > 0) {
      const highInterestDebts = debts.filter(d => (d.annualRate || 0) > 12)
      if (highInterestDebts.length > 0) {
        strategies.push({
          icon: 'TrendingDown',
          title: 'Priorize dividas com juros altos',
          description: `Voce tem ${highInterestDebts.length} divida(s) com taxa acima de 12% a.a. Quite essas primeiro para economizar em juros.`,
          priority: 'high'
        })
      }
    }

    // Savings rate strategy
    if (currentSavingsRate < 10) {
      strategies.push({
        icon: 'PiggyBank',
        title: 'Aumente sua taxa de poupanca',
        description: `Atual: ${Math.round(currentSavingsRate)}%. Meta ideal: pelo menos 20% da renda. Comece com o que for possivel e aumente gradualmente.`,
        priority: 'high'
      })
    } else if (currentSavingsRate < 20) {
      strategies.push({
        icon: 'TrendingUp',
        title: 'Melhore sua taxa de poupanca',
        description: `Voce ja poupa ${Math.round(currentSavingsRate)}% da renda. Tente chegar a 20% para alcancar metas mais rapido.`,
        priority: 'medium'
      })
    }

    // Fixed expense check
    if (health.fixedRatio > 50) {
      strategies.push({
        icon: 'AlertTriangle',
        title: 'Reduza despesas fixas',
        description: `${health.fixedRatio}% da renda vai para gastos fixos (ideal: ate 50%). Renegocie contratos, mude de plano ou busque alternativas mais baratas.`,
        priority: 'medium'
      })
    }

    // Income diversification
    if (monthlyIncome > 0 && target > maxPossible) {
      strategies.push({
        icon: 'Zap',
        title: 'Considere aumentar sua renda',
        description: 'Sua meta de economia e ambiciosa. Alem de cortar gastos, considere freelances, vendas online ou uma renda extra.',
        priority: 'low'
      })
    }

    // Automation
    strategies.push({
      icon: 'Target',
      title: 'Automatize suas economias',
      description: 'Programe transferencias automaticas no dia do pagamento. O que nao esta na conta, nao sera gasto.',
      priority: 'low'
    })

    strategies.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    // Score projections
    const projectedSavingsRate = monthlyIncome > 0 ? Math.round(((monthlySavings + Math.min(accumulatedSaving, target)) / monthlyIncome) * 100) : 0
    let projectedScore = 50
    projectedScore += Math.min(projectedSavingsRate, 30)
    projectedScore -= Math.max(0, health.fixedRatio - 50) * 0.5
    projectedScore -= Math.min(health.debtRatio, 40) * 0.5
    if (health.hasEmergencyFund) projectedScore += 10
    projectedScore = Math.max(0, Math.min(100, Math.round(projectedScore)))

    return {
      target,
      accumulatedSaving,
      isFullyAchievable: accumulatedSaving >= target,
      achievablePercent: Math.min(100, Math.round((accumulatedSaving / target) * 100)),
      currentSavingsRate: Math.round(currentSavingsRate),
      targetSavingsRate: Math.round(targetSavingsRate),
      projectedSavingsRate,
      projectedScore,
      scoreImprovement: projectedScore - health.score,
      isFeasible,
      freeIncome,
      categorySuggestions,
      strategies,
      monthlyIncome: health.monthlyIncome,
      monthlyExpenses: health.monthlyExpenses,
      monthlySavings: health.monthlySavings
    }
  }, [targetSavings, spendingAnalysis, health, subscriptions, debts])

  const handleAnalyze = () => {
    if (!targetSavings || parseFloat(targetSavings) <= 0) return
    setShowAnalysis(true)
  }

  const handleCreateGoal = async (suggestion) => {
    if (!coupleId || creatingGoal) return
    setCreatingGoal(suggestion.category)
    try {
      await addGoal(coupleId, {
        name: `Economizar em ${suggestion.label}`,
        type: 'expense_limit',
        category: suggestion.category,
        targetAmount: Math.round(suggestion.newSpending),
        period: 'monthly',
        icon: suggestion.icon
      })
      setSavedGoals(prev => [...prev, suggestion.category])
    } catch (err) {
      console.error('Erro ao criar meta:', err)
    } finally {
      setCreatingGoal(null)
    }
  }

  const handleReset = () => {
    setTargetSavings('')
    setShowAnalysis(false)
    setShowStrategy(false)
    setSavedGoals([])
  }

  const itemV = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  }

  // Get Lucide icon by name
  const getIcon = (name) => LucideIcons[name] || LucideIcons.MoreHorizontal

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader title="Metas Inteligentes" />

      <motion.div
        className="px-5 pb-32 space-y-5 mt-2"
        initial="hidden"
        animate="visible"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
      >
        {/* Header */}
        <motion.div variants={itemV}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Sugestao de Metas</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Analise inteligente baseada nos seus gastos reais</p>
            </div>
          </div>
        </motion.div>

        {/* Current spending overview */}
        <motion.div variants={itemV}>
          <Card>
            <SectionHeader title="Visao geral dos gastos" />
            <div className="grid grid-cols-3 gap-2 mb-3">
              <StatBox label="Renda">
                <p className="text-sm font-bold text-emerald-500">{hide(health.monthlyIncome)}</p>
              </StatBox>
              <StatBox label="Gastos">
                <p className="text-sm font-bold text-red-500">{hide(health.monthlyExpenses)}</p>
              </StatBox>
              <StatBox label="Poupanca">
                <p className="text-sm font-bold text-violet-500">{hide(health.monthlySavings)}</p>
              </StatBox>
            </div>

            {/* Top spending categories */}
            {spendingAnalysis.categories.length > 0 && (
              <div className="space-y-2">
                {spendingAnalysis.categories.slice(0, 5).map(cat => {
                  const CatIcon = getIcon(cat.icon)
                  const percent = spendingAnalysis.totalMonthlyExpense > 0
                    ? Math.round((cat.monthlyAvg / spendingAnalysis.totalMonthlyExpense) * 100) : 0
                  return (
                    <div key={cat.key} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + '20' }}>
                        <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{cat.label}</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white">{hide(cat.monthlyAvg)}/mes</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${percent}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 w-8 text-right">{percent}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Target input */}
        <motion.div variants={itemV}>
          <Card>
            <SectionHeader title="Quanto voce quer economizar?" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Informe o valor mensal que gostaria de economizar. Analisaremos seus gastos e sugeriremos metas especificas.
            </p>
            <Input
              icon={DollarSign}
              type="number"
              placeholder="Ex: 500"
              value={targetSavings}
              onChange={e => setTargetSavings(e.target.value)}
              label="Economia mensal desejada"
            />

            {/* Quick presets */}
            <div className="mt-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Sugestoes rapidas:</p>
              <div className="flex gap-2 flex-wrap">
                {health.monthlyIncome > 0 ? (
                  [5, 10, 15, 20, 30].map(pct => {
                    const val = Math.round(health.monthlyIncome * pct / 100)
                    return (
                      <button
                        key={pct}
                        onClick={() => setTargetSavings(String(val))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          targetSavings === String(val)
                            ? 'bg-violet-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {pct}% ({hide(val)})
                      </button>
                    )
                  })
                ) : (
                  [200, 500, 1000, 1500, 2000].map(val => (
                    <button
                      key={val}
                      onClick={() => setTargetSavings(String(val))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        targetSavings === String(val)
                          ? 'bg-violet-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {hide(val)}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <Button fullWidth icon={Sparkles} onClick={handleAnalyze} disabled={!targetSavings || parseFloat(targetSavings) <= 0}
                className="!bg-gradient-to-r !from-violet-500 !to-purple-600 !shadow-violet-500/25">
                Analisar e Sugerir Metas
              </Button>
              {showAnalysis && (
                <Button variant="ghost" onClick={handleReset} className="shrink-0">Limpar</Button>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Analysis results */}
        {showAnalysis && suggestions && (
          <>
            {/* Feasibility card */}
            <motion.div
              variants={itemV}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className={suggestions.isFullyAchievable
                ? 'border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-900/10'
                : suggestions.achievablePercent >= 50
                  ? 'border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10'
                  : 'border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-900/10'
              }>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    suggestions.isFullyAchievable ? 'bg-emerald-100 dark:bg-emerald-800/30' :
                    suggestions.achievablePercent >= 50 ? 'bg-amber-100 dark:bg-amber-800/30' :
                    'bg-red-100 dark:bg-red-800/30'
                  }`}>
                    {suggestions.isFullyAchievable
                      ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      : suggestions.achievablePercent >= 50
                        ? <Target className="w-6 h-6 text-amber-500" />
                        : <AlertTriangle className="w-6 h-6 text-red-500" />
                    }
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${
                      suggestions.isFullyAchievable ? 'text-emerald-700 dark:text-emerald-300' :
                      suggestions.achievablePercent >= 50 ? 'text-amber-700 dark:text-amber-300' :
                      'text-red-700 dark:text-red-300'
                    }`}>
                      {suggestions.isFullyAchievable
                        ? 'Meta atingivel! Veja como chegar la'
                        : suggestions.achievablePercent >= 50
                          ? `Parcialmente atingivel (${suggestions.achievablePercent}%)`
                          : 'Meta ambiciosa - sera um desafio'
                      }
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Economia possivel: {hide(suggestions.accumulatedSaving)} de {hide(suggestions.target)}
                    </p>
                  </div>
                </div>

                {/* Progress towards goal */}
                <ProgressBar
                  value={suggestions.accumulatedSaving}
                  max={suggestions.target}
                  size="md"
                  color={suggestions.isFullyAchievable ? 'bg-emerald-500' : 'bg-amber-500'}
                  showLabel
                />

                {/* Impact preview */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <StatBox label="Taxa poupanca">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">{suggestions.currentSavingsRate}%</span>
                      <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                      <span className="text-sm font-bold text-emerald-500">{suggestions.projectedSavingsRate}%</span>
                    </div>
                  </StatBox>
                  <StatBox label="Score">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">{health.score}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                      <span className="text-sm font-bold text-emerald-500">{suggestions.projectedScore}</span>
                    </div>
                  </StatBox>
                  <StatBox label="Melhoria">
                    <p className={`text-sm font-bold ${suggestions.scoreImprovement > 0 ? 'text-emerald-500' : 'text-slate-500'}`}>
                      {suggestions.scoreImprovement > 0 ? '+' : ''}{suggestions.scoreImprovement} pts
                    </p>
                  </StatBox>
                </div>
              </Card>
            </motion.div>

            {/* Category suggestions */}
            {suggestions.categorySuggestions.length > 0 && (
              <motion.div variants={itemV}>
                <Card>
                  <SectionHeader title="Metas sugeridas por categoria" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Baseado na analise dos seus ultimos 3 meses de gastos:
                  </p>

                  <div className="space-y-4">
                    {suggestions.categorySuggestions.map((sug, i) => {
                      const CatIcon = getIcon(sug.icon)
                      const pCfg = PRIORITY_CONFIG[sug.priority]
                      const isGoalSaved = savedGoals.includes(sug.category)
                      const isCreating = creatingGoal === sug.category

                      return (
                        <motion.div
                          key={sug.category}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="border border-slate-100 dark:border-slate-700/50 rounded-xl p-3.5"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: sug.color + '20' }}>
                              <CatIcon className="w-5 h-5" style={{ color: sug.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{sug.label}</p>
                                <Badge variant={pCfg.badge}>{pCfg.label}</Badge>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Reducao de {sug.suggestedReduction}% sugerida
                              </p>
                            </div>
                          </div>

                          {/* Current vs suggested */}
                          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2.5 mb-2">
                            <div className="text-center flex-1">
                              <p className="text-[10px] text-slate-400 uppercase">Atual</p>
                              <p className="text-sm font-bold text-red-500">{hide(sug.currentSpending)}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 mx-2" />
                            <div className="text-center flex-1">
                              <p className="text-[10px] text-slate-400 uppercase">Sugerido</p>
                              <p className="text-sm font-bold text-emerald-500">{hide(sug.newSpending)}</p>
                            </div>
                            <div className="text-center flex-1 ml-2">
                              <p className="text-[10px] text-slate-400 uppercase">Economia</p>
                              <p className="text-sm font-bold text-violet-500">{hide(sug.savingAmount)}</p>
                            </div>
                          </div>

                          {/* Tip */}
                          <div className="flex items-start gap-2 mb-3">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{sug.tip}</p>
                          </div>

                          {/* Create goal button */}
                          {coupleId && (
                            <Button
                              size="sm"
                              fullWidth
                              variant={isGoalSaved ? 'success' : 'outline'}
                              icon={isGoalSaved ? CheckCircle2 : Plus}
                              loading={isCreating}
                              disabled={isGoalSaved}
                              onClick={() => handleCreateGoal(sug)}
                            >
                              {isGoalSaved ? 'Meta criada!' : `Criar meta: limite de ${hide(sug.newSpending)}/mes`}
                            </Button>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Financial strategy */}
            <motion.div variants={itemV}>
              <Card>
                <button
                  onClick={() => setShowStrategy(!showStrategy)}
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-violet-500" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Estrategia financeira
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="brand">{suggestions.strategies.length} acoes</Badge>
                    {showStrategy ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                <AnimatePresence>
                  {showStrategy && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 space-y-3"
                    >
                      {suggestions.strategies.map((strategy, i) => {
                        const StratIcon = getIcon(strategy.icon)
                        const pCfg = PRIORITY_CONFIG[strategy.priority]

                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className={`rounded-xl p-3 ${pCfg.bg}`}
                          >
                            <div className="flex items-start gap-3">
                              <StratIcon className={`w-5 h-5 ${pCfg.color} mt-0.5 shrink-0`} />
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{strategy.title}</p>
                                  <Badge variant={pCfg.badge} className="!text-[9px]">{pCfg.label}</Badge>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{strategy.description}</p>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}

                      {/* Annual projection */}
                      <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-4 text-center">
                        <Award className="w-8 h-8 text-violet-500 mx-auto mb-2" />
                        <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold mb-1">
                          Projecao em 12 meses
                        </p>
                        <p className="text-2xl font-bold text-violet-600 dark:text-violet-300">
                          {hide(Math.min(suggestions.accumulatedSaving, suggestions.target) * 12)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          economizados se seguir todas as sugestoes
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>

            {/* Existing goals */}
            {goalsWithProgress.length > 0 && (
              <motion.div variants={itemV}>
                <Card>
                  <SectionHeader title="Suas metas atuais" action="Ver todas" onAction={() => navigate('/app/budgets')} />
                  <div className="space-y-2">
                    {goalsWithProgress.slice(0, 4).map(goal => {
                      const GoalIcon = getIcon(goal.icon || 'Target')
                      return (
                        <div key={goal.id} className="flex items-center gap-3 py-2">
                          <GoalIcon className="w-5 h-5 text-brand-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{goal.name}</p>
                            <ProgressBar value={goal.percent} max={100} size="sm" className="mt-1" />
                          </div>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{goal.percent}%</span>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </motion.div>
            )}
          </>
        )}

        {/* Empty state if no transactions */}
        {spendingAnalysis.categories.length === 0 && (
          <motion.div variants={itemV}>
            <EmptyState
              icon={BarChart3}
              title="Dados insuficientes"
              description="Cadastre transacoes para que possamos analisar seus gastos e sugerir metas personalizadas."
              action="Adicionar Transacao"
              onAction={() => useStore.getState().setShowAddTransaction(true)}
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
