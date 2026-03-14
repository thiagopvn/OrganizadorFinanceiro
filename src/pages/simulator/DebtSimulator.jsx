import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Calculator, AlertTriangle, CheckCircle2, XCircle, TrendingDown, TrendingUp,
  ShoppingCart, Percent, Calendar, DollarSign, ArrowRight, Info, Shield,
  Target, Zap, ChevronDown, ChevronUp, BarChart3
} from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Card, Button, Input, Badge, ProgressBar, SectionHeader } from '../../components/ui'
import { BarChart } from '../../components/charts'
import useStore from '../../lib/store'
import { formatCurrency, CATEGORIES } from '../../lib/utils'

function StatBox({ label, children, className = '' }) {
  return (
    <div className={`bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 ${className}`}>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-0.5">{label}</p>
      {children}
    </div>
  )
}

export default function DebtSimulator() {
  const { transactions, debts, subscriptions, recurringTransactions, privacyMode, goals } = useStore()
  const health = useStore(s => s.getFinancialHealth())

  const [productName, setProductName] = useState('')
  const [totalValue, setTotalValue] = useState('')
  const [installments, setInstallments] = useState('')
  const [annualRate, setAnnualRate] = useState('')
  const [entryValue, setEntryValue] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const hide = (v) => privacyMode ? '••••' : formatCurrency(v)

  // Compute simulation results
  const simulation = useMemo(() => {
    const total = parseFloat(totalValue) || 0
    const nInstallments = parseInt(installments) || 1
    const rate = parseFloat(annualRate) || 0
    const entry = parseFloat(entryValue) || 0

    if (total <= 0) return null

    const financed = Math.max(0, total - entry)
    let monthlyPayment, totalPaid, totalInterest

    if (rate > 0) {
      const monthlyRate = rate / 100 / 12
      monthlyPayment = financed * (monthlyRate * Math.pow(1 + monthlyRate, nInstallments)) / (Math.pow(1 + monthlyRate, nInstallments) - 1)
      totalPaid = monthlyPayment * nInstallments + entry
      totalInterest = totalPaid - total
    } else {
      monthlyPayment = financed / nInstallments
      totalPaid = total
      totalInterest = 0
    }

    // Financial impact analysis
    const { monthlyIncome, monthlyExpenses, monthlySavings, monthlyDebtPayment, fixedExpenses } = health

    const currentFreeIncome = monthlyIncome - monthlyExpenses - monthlySavings - monthlyDebtPayment
    const newFreeIncome = currentFreeIncome - monthlyPayment
    const newTotalExpenses = monthlyExpenses + monthlyPayment
    const newExpenseRatio = monthlyIncome > 0 ? Math.round((newTotalExpenses / monthlyIncome) * 100) : 0
    const currentExpenseRatio = monthlyIncome > 0 ? Math.round((monthlyExpenses / monthlyIncome) * 100) : 0
    const newDebtPayment = monthlyDebtPayment + monthlyPayment
    const newDebtRatio = monthlyIncome > 0 ? Math.round((newDebtPayment / monthlyIncome) * 100) : 0
    const currentDebtRatio = monthlyIncome > 0 ? Math.round((monthlyDebtPayment / monthlyIncome) * 100) : 0

    // Savings impact
    const currentSavingsRate = health.savingsRate
    const newSavingsAmount = Math.max(0, monthlySavings - (newFreeIncome < 0 ? Math.abs(newFreeIncome) : 0))
    const newSavingsRate = monthlyIncome > 0 ? Math.round((newSavingsAmount / monthlyIncome) * 100) : 0

    // Score impact - recalculate financial score with new values
    const newFixedRatio = monthlyIncome > 0 ? Math.round(((fixedExpenses + monthlyPayment) / monthlyIncome) * 100) : 0
    let newScore = 50
    newScore += Math.min(newSavingsRate, 30)
    newScore -= Math.max(0, newFixedRatio - 50) * 0.5
    newScore -= Math.min(newDebtRatio, 40) * 0.5
    if (health.hasEmergencyFund) newScore += 10
    newScore = Math.max(0, Math.min(100, Math.round(newScore)))

    const scoreImpact = newScore - health.score

    // Viability verdict
    let verdict, verdictType, verdictIcon, tips
    if (monthlyIncome === 0) {
      verdict = 'Sem dados de renda'
      verdictType = 'warning'
      verdictIcon = Info
      tips = ['Cadastre suas receitas para uma analise precisa.']
    } else if (newFreeIncome < 0) {
      verdict = 'Inviavel - Renda insuficiente'
      verdictType = 'danger'
      verdictIcon = XCircle
      tips = [
        `Faltariam ${formatCurrency(Math.abs(newFreeIncome))} por mes para cobrir todos os gastos.`,
        'Considere reduzir o valor da compra, dar uma entrada maior ou aumentar o numero de parcelas.',
        'Avalie se e possivel cortar gastos em outras categorias antes.'
      ]
    } else if (newDebtRatio > 40) {
      verdict = 'Alto risco - Endividamento elevado'
      verdictType = 'danger'
      verdictIcon = AlertTriangle
      tips = [
        `Comprometimento de dividas seria de ${newDebtRatio}% da renda (ideal: abaixo de 30%).`,
        'Este nivel de endividamento pode dificultar futuras necessidades financeiras.',
        'Considere quitar dividas existentes antes de assumir novas.'
      ]
    } else if (newExpenseRatio > 90) {
      verdict = 'Arriscado - Margem apertada'
      verdictType = 'warning'
      verdictIcon = AlertTriangle
      tips = [
        `Seus gastos totais seriam ${newExpenseRatio}% da renda, deixando pouca margem.`,
        'Qualquer imprevisto pode comprometer o pagamento.',
        'Considere uma entrada maior para reduzir a parcela.'
      ]
    } else if (newSavingsRate < 10 && currentSavingsRate >= 10) {
      verdict = 'Possivel, mas afeta economia'
      verdictType = 'warning'
      verdictIcon = Info
      tips = [
        `Sua taxa de poupanca cairia de ${currentSavingsRate}% para ${newSavingsRate}%.`,
        'Voce consegue pagar, mas tera menos folga para economizar.',
        'Ideal e manter pelo menos 20% da renda para poupanca.'
      ]
    } else if (newFreeIncome > 0 && newDebtRatio <= 30) {
      verdict = 'Viavel - Compra segura'
      verdictType = 'success'
      verdictIcon = CheckCircle2
      tips = [
        `Sobraria ${formatCurrency(newFreeIncome)} por mes de renda livre.`,
        `Comprometimento de dividas ficaria em ${newDebtRatio}% da renda.`,
        totalInterest > 0 ? `Considere que voce pagara ${formatCurrency(totalInterest)} em juros.` : 'Sem juros — otimo negocio!'
      ]
    } else {
      verdict = 'Viavel com atencao'
      verdictType = 'warning'
      verdictIcon = Info
      tips = [
        `Comprometimento de dividas ficaria em ${newDebtRatio}%.`,
        'Fique atento a outros gastos para manter o equilibrio.',
        'Evite assumir novas dividas durante o periodo de parcelamento.'
      ]
    }

    // Monthly projection for chart
    const projectionMonths = Math.min(nInstallments, 12)
    const monthLabels = []
    const expenseProjection = []
    const incomeProjection = []
    const now = new Date()
    for (let i = 0; i < projectionMonths; i++) {
      const d = new Date(now)
      d.setMonth(d.getMonth() + i)
      monthLabels.push(d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''))
      expenseProjection.push(monthlyExpenses + monthlyPayment)
      incomeProjection.push(monthlyIncome)
    }

    return {
      financed, monthlyPayment, totalPaid, totalInterest,
      currentFreeIncome, newFreeIncome,
      currentExpenseRatio, newExpenseRatio,
      currentDebtRatio, newDebtRatio,
      currentSavingsRate, newSavingsRate,
      scoreImpact, newScore,
      verdict, verdictType, verdictIcon, tips,
      monthLabels, expenseProjection, incomeProjection,
      nInstallments
    }
  }, [totalValue, installments, annualRate, entryValue, health])

  const handleSimulate = () => {
    if (!totalValue || parseFloat(totalValue) <= 0) return
    setShowResult(true)
  }

  const handleReset = () => {
    setProductName('')
    setTotalValue('')
    setInstallments('')
    setAnnualRate('')
    setEntryValue('')
    setShowResult(false)
    setShowDetails(false)
  }

  const itemV = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  }

  const verdictColors = {
    success: 'border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-900/10',
    warning: 'border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10',
    danger: 'border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-900/10',
  }

  const verdictTextColors = {
    success: 'text-emerald-700 dark:text-emerald-300',
    warning: 'text-amber-700 dark:text-amber-300',
    danger: 'text-red-700 dark:text-red-300',
  }

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader title="Simulador de Impacto" />

      <motion.div
        className="px-5 pb-32 space-y-5 mt-2"
        initial="hidden"
        animate="visible"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
      >
        {/* Header info */}
        <motion.div variants={itemV}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Antes de comprar, simule!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Analise o impacto de compras parceladas no seu orcamento</p>
            </div>
          </div>
        </motion.div>

        {/* Current financial snapshot */}
        <motion.div variants={itemV}>
          <Card>
            <SectionHeader title="Sua situacao atual" />
            <div className="grid grid-cols-3 gap-2">
              <StatBox label="Renda">
                <p className="text-sm font-bold text-emerald-500">{hide(health.monthlyIncome)}</p>
              </StatBox>
              <StatBox label="Gastos">
                <p className="text-sm font-bold text-red-500">{hide(health.monthlyExpenses)}</p>
              </StatBox>
              <StatBox label="Score">
                <p className={`text-sm font-bold ${health.score >= 60 ? 'text-emerald-500' : health.score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                  {health.score}/100
                </p>
              </StatBox>
            </div>
          </Card>
        </motion.div>

        {/* Simulation form */}
        <motion.div variants={itemV}>
          <Card>
            <SectionHeader title="Dados da compra" />
            <div className="space-y-3">
              <Input
                label="O que voce quer comprar?"
                icon={ShoppingCart}
                placeholder="Ex: iPhone 16, Sofa, TV..."
                value={productName}
                onChange={e => setProductName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Valor total"
                  icon={DollarSign}
                  type="number"
                  placeholder="5000"
                  value={totalValue}
                  onChange={e => setTotalValue(e.target.value)}
                />
                <Input
                  label="Entrada (opcional)"
                  icon={DollarSign}
                  type="number"
                  placeholder="500"
                  value={entryValue}
                  onChange={e => setEntryValue(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Parcelas"
                  icon={Calendar}
                  type="number"
                  placeholder="12"
                  value={installments}
                  onChange={e => setInstallments(e.target.value)}
                />
                <Input
                  label="Taxa anual (%)"
                  icon={Percent}
                  type="number"
                  placeholder="0"
                  value={annualRate}
                  onChange={e => setAnnualRate(e.target.value)}
                />
              </div>

              {/* Quick installment presets */}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Parcelas rapidas:</p>
                <div className="flex gap-2 flex-wrap">
                  {[3, 6, 10, 12, 18, 24].map(n => (
                    <button
                      key={n}
                      onClick={() => setInstallments(String(n))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        installments === String(n)
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button fullWidth icon={Calculator} onClick={handleSimulate} disabled={!totalValue || parseFloat(totalValue) <= 0}>
                  Simular Impacto
                </Button>
                {showResult && (
                  <Button variant="ghost" onClick={handleReset} className="shrink-0">
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Results */}
        {showResult && simulation && (
          <>
            {/* Verdict card */}
            <motion.div
              variants={itemV}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card className={verdictColors[simulation.verdictType]}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    simulation.verdictType === 'success' ? 'bg-emerald-100 dark:bg-emerald-800/30' :
                    simulation.verdictType === 'warning' ? 'bg-amber-100 dark:bg-amber-800/30' :
                    'bg-red-100 dark:bg-red-800/30'
                  }`}>
                    <simulation.verdictIcon className={`w-6 h-6 ${
                      simulation.verdictType === 'success' ? 'text-emerald-500' :
                      simulation.verdictType === 'warning' ? 'text-amber-500' :
                      'text-red-500'
                    }`} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${verdictTextColors[simulation.verdictType]}`}>
                      {simulation.verdict}
                    </p>
                    {productName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{productName}</p>
                    )}
                  </div>
                </div>

                {/* Tips */}
                <div className="space-y-2">
                  {simulation.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* Payment summary */}
            <motion.div variants={itemV}>
              <Card>
                <SectionHeader title="Resumo do parcelamento" />
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <StatBox label="Parcela mensal">
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{hide(simulation.monthlyPayment)}</p>
                  </StatBox>
                  <StatBox label="Total a pagar">
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{hide(simulation.totalPaid)}</p>
                  </StatBox>
                </div>
                {simulation.totalInterest > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Custo dos juros</p>
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-300">{hide(simulation.totalInterest)}</p>
                      <p className="text-[10px] text-amber-500 dark:text-amber-400/70">
                        Voce pagaria {Math.round((simulation.totalInterest / parseFloat(totalValue)) * 100)}% a mais sobre o valor do produto
                      </p>
                    </div>
                  </div>
                )}
                {simulation.financed < parseFloat(totalValue) && (
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Entrada: {hide(parseFloat(entryValue))}</span>
                    <span>Financiado: {hide(simulation.financed)}</span>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Impact comparison */}
            <motion.div variants={itemV}>
              <Card>
                <SectionHeader title="Impacto no orcamento" />
                <div className="space-y-4">
                  {/* Free income impact */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Renda livre mensal</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{hide(simulation.currentFreeIncome)}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span className={`text-xs font-bold ${simulation.newFreeIncome >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {hide(simulation.newFreeIncome)}
                        </span>
                      </div>
                    </div>
                    <ProgressBar
                      value={Math.max(0, simulation.newFreeIncome)}
                      max={health.monthlyIncome || 1}
                      size="sm"
                      color={simulation.newFreeIncome >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
                    />
                  </div>

                  {/* Expense ratio */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Gastos / Renda</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{simulation.currentExpenseRatio}%</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span className={`text-xs font-bold ${simulation.newExpenseRatio <= 80 ? 'text-emerald-500' : simulation.newExpenseRatio <= 95 ? 'text-amber-500' : 'text-red-500'}`}>
                          {simulation.newExpenseRatio}%
                        </span>
                      </div>
                    </div>
                    <ProgressBar value={simulation.newExpenseRatio} max={100} size="sm" />
                  </div>

                  {/* Debt ratio */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Dividas / Renda</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{simulation.currentDebtRatio}%</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span className={`text-xs font-bold ${simulation.newDebtRatio <= 30 ? 'text-emerald-500' : simulation.newDebtRatio <= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                          {simulation.newDebtRatio}%
                        </span>
                      </div>
                    </div>
                    <ProgressBar value={simulation.newDebtRatio} max={50} size="sm" />
                  </div>

                  {/* Savings rate */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Taxa de poupanca</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{simulation.currentSavingsRate}%</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span className={`text-xs font-bold ${simulation.newSavingsRate >= 20 ? 'text-emerald-500' : simulation.newSavingsRate >= 10 ? 'text-amber-500' : 'text-red-500'}`}>
                          {simulation.newSavingsRate}%
                        </span>
                      </div>
                    </div>
                    <ProgressBar value={simulation.newSavingsRate} max={30} size="sm" color={simulation.newSavingsRate >= 20 ? 'bg-emerald-500' : simulation.newSavingsRate >= 10 ? 'bg-amber-500' : 'bg-red-500'} />
                  </div>

                  {/* Score impact */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-5 h-5 ${simulation.scoreImpact >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Score financeiro</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">{health.score}</span>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                      <span className={`text-sm font-bold ${simulation.newScore >= 60 ? 'text-emerald-500' : simulation.newScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                        {simulation.newScore}
                      </span>
                      {simulation.scoreImpact !== 0 && (
                        <Badge variant={simulation.scoreImpact > 0 ? 'success' : 'danger'}>
                          {simulation.scoreImpact > 0 ? '+' : ''}{simulation.scoreImpact}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Detailed chart - collapsible */}
            <motion.div variants={itemV}>
              <Card>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-brand-500" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Projecao mensal
                    </span>
                  </div>
                  {showDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="mt-4"
                  >
                    <BarChart
                      labels={simulation.monthLabels}
                      datasets={[
                        { label: 'Gastos + Parcela', data: simulation.expenseProjection, backgroundColor: '#ef4444' },
                        { label: 'Renda', data: simulation.incomeProjection, backgroundColor: '#10b981' }
                      ]}
                    />
                    <div className="flex items-center justify-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-red-500" />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Gastos + Parcela</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-emerald-500" />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Renda</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>

            {/* Comparison scenarios */}
            {simulation.nInstallments > 1 && (
              <motion.div variants={itemV}>
                <Card>
                  <SectionHeader title="Cenarios alternativos" />
                  <div className="space-y-2">
                    {(() => {
                      const total = parseFloat(totalValue)
                      const entry = parseFloat(entryValue) || 0
                      const financed = Math.max(0, total - entry)
                      const rate = parseFloat(annualRate) || 0
                      const scenarios = []

                      // A vista
                      scenarios.push({
                        label: 'A vista',
                        installments: 1,
                        monthly: financed,
                        total: total,
                        interest: 0,
                        saving: simulation.totalPaid - total
                      })

                      // Half installments
                      const half = Math.max(2, Math.floor(simulation.nInstallments / 2))
                      if (half !== simulation.nInstallments && half > 1) {
                        let halfMonthly, halfTotal
                        if (rate > 0) {
                          const mr = rate / 100 / 12
                          halfMonthly = financed * (mr * Math.pow(1 + mr, half)) / (Math.pow(1 + mr, half) - 1)
                          halfTotal = halfMonthly * half + entry
                        } else {
                          halfMonthly = financed / half
                          halfTotal = total
                        }
                        scenarios.push({
                          label: `${half}x`,
                          installments: half,
                          monthly: halfMonthly,
                          total: halfTotal,
                          interest: halfTotal - total,
                          saving: simulation.totalPaid - halfTotal
                        })
                      }

                      return scenarios.filter(s => s.saving > 0).map((s, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.label}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {s.installments === 1 ? hide(s.total) : `${s.installments}x de ${hide(s.monthly)}`}
                            </p>
                          </div>
                          <Badge variant="success">
                            Economia de {hide(s.saving)}
                          </Badge>
                        </div>
                      ))
                    })()}
                  </div>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}
