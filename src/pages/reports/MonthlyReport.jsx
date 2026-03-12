import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, PiggyBank, Target, Award, AlertTriangle, Share2, ArrowUpRight, ArrowDownRight, Percent, Receipt } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Card, Badge, ProgressBar, SectionHeader, Avatar } from '../../components/ui'
import { DonutChart } from '../../components/charts'
import useStore from '../../lib/store'
import { formatCurrency, CATEGORIES } from '../../lib/utils'
import { format, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

const CHART_COLORS = [
  '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444',
  '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'
]

export default function MonthlyReport() {
  const navigate = useNavigate()
  const { user, partner, privacyMode, getMonthlyReport } = useStore()

  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const report = useMemo(() => getMonthlyReport(year, month), [year, month, getMonthlyReport])
  const monthLabel = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })

  const prevMonth = () => setCurrentDate(prev => subMonths(prev, 1))
  const nextMonth = () => setCurrentDate(prev => addMonths(prev, 1))

  const masked = (value) => privacyMode ? '***' : formatCurrency(value)

  // Donut chart data from top categories
  const donutData = useMemo(() => {
    return report.topCategories.map((cat, i) => ({
      label: CATEGORIES[cat.category]?.label || cat.category,
      value: cat.amount,
      color: CATEGORIES[cat.category]?.color || CHART_COLORS[i % CHART_COLORS.length]
    }))
  }, [report.topCategories])

  // Determine max for horizontal bars
  const maxCategoryAmount = report.topCategories.length > 0
    ? report.topCategories[0].amount
    : 1

  // Person entries
  const personEntries = useMemo(() => {
    return Object.entries(report.byPerson).map(([id, data]) => {
      const isUser = id === user?.uid
      const name = isUser ? (user?.displayName || 'Eu') : (partner?.displayName || partner?.name || 'Parceiro(a)')
      const photo = isUser ? user?.photoURL : partner?.photoURL
      return { id, name, photo, ...data }
    })
  }, [report.byPerson, user, partner])

  const handleShare = async () => {
    const text = [
      `Relatorio Financeiro - ${monthLabel}`,
      `Receitas: ${formatCurrency(report.income)}`,
      `Despesas: ${formatCurrency(report.expenses)}`,
      `Economia: ${formatCurrency(report.savings)}`,
      `Saldo: ${formatCurrency(report.balance)}`,
      `Taxa de economia: ${report.savingsRate}%`,
      `${report.txCount} transacoes registradas`
    ].join('\n')

    if (navigator.share) {
      try {
        await navigator.share({ title: `Relatorio - ${monthLabel}`, text })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text)
      alert('Relatorio copiado!')
    }
  }

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader title="Relatorio Mensal" onBack={() => navigate(-1)} actions={
        <button onClick={handleShare} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          <Share2 className="w-5 h-5" />
        </button>
      } />

      <motion.div
        className="px-4 pb-28 space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Month Selector */}
        <motion.div variants={itemVariants} className="flex items-center justify-between pt-2">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </button>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
            {monthLabel}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>
        </motion.div>

        {/* Summary Hero Card */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-2 gap-4">
              <SummaryItem
                label="Receitas"
                value={report.income}
                change={report.incomeChange}
                icon={ArrowUpRight}
                color="text-emerald-500"
                bgColor="bg-emerald-50 dark:bg-emerald-900/20"
                masked={privacyMode}
              />
              <SummaryItem
                label="Despesas"
                value={report.expenses}
                change={report.expenseChange}
                icon={ArrowDownRight}
                color="text-red-500"
                bgColor="bg-red-50 dark:bg-red-900/20"
                masked={privacyMode}
                invertChange
              />
              <SummaryItem
                label="Economia"
                value={report.savings}
                icon={PiggyBank}
                color="text-blue-500"
                bgColor="bg-blue-50 dark:bg-blue-900/20"
                masked={privacyMode}
              />
              <SummaryItem
                label="Saldo"
                value={report.balance}
                icon={report.balance >= 0 ? TrendingUp : TrendingDown}
                color={report.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}
                bgColor={report.balance >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}
                masked={privacyMode}
              />
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Receipt className="w-3.5 h-3.5" />
                <span>{report.txCount} transacoes</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Percent className="w-3.5 h-3.5" />
                <span>Taxa de economia: {privacyMode ? '***' : `${report.savingsRate}%`}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* DRE Simplificado */}
        <motion.div variants={itemVariants}>
          <SectionHeader title="DRE Simplificado" />
          <Card>
            <div className="space-y-0">
              <DRERow
                label="Receitas"
                value={report.income}
                masked={privacyMode}
                isPositive
                isFirst
              />
              <DRERow
                label="(-) Despesas"
                value={report.expenses}
                masked={privacyMode}
                isNegative
              />
              <DRERow
                label="(-) Economia"
                value={report.savings}
                masked={privacyMode}
                isNegative
              />
              <div className="border-t-2 border-slate-300 dark:border-slate-500 my-1" />
              <DRERow
                label="(=) Saldo"
                value={report.balance}
                masked={privacyMode}
                isResult
              />
            </div>
          </Card>
        </motion.div>

        {/* Donut Chart - Expense Breakdown */}
        {donutData.length > 0 && (
          <motion.div variants={itemVariants}>
            <SectionHeader title="Despesas por Categoria" />
            <Card>
              <div className="h-52">
                <DonutChart
                  data={donutData}
                  centerLabel="Total"
                  centerValue={masked(report.expenses)}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {donutData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Top 5 Categories */}
        {report.topCategories.length > 0 && (
          <motion.div variants={itemVariants}>
            <SectionHeader title="Top 5 Categorias" />
            <Card>
              <div className="space-y-3">
                {report.topCategories.map((cat, i) => {
                  const catInfo = CATEGORIES[cat.category]
                  const IconComp = catInfo?.icon ? (LucideIcons[catInfo.icon] || LucideIcons.MoreHorizontal) : LucideIcons.MoreHorizontal
                  const barWidth = (cat.amount / maxCategoryAmount) * 100

                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: (catInfo?.color || CHART_COLORS[i]) + '18' }}
                          >
                            <IconComp className="w-4 h-4" style={{ color: catInfo?.color || CHART_COLORS[i] }} />
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {catInfo?.label || cat.category}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {masked(cat.amount)}
                          </span>
                          <span className="text-xs text-slate-400 ml-1.5">{cat.percent}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: catInfo?.color || CHART_COLORS[i] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Who Spent What */}
        {personEntries.length > 0 && (
          <motion.div variants={itemVariants}>
            <SectionHeader title="Quem gastou o que" />
            <Card>
              <div className="space-y-4">
                {personEntries.map((person) => {
                  const total = person.income + person.expenses
                  const expensePercent = total > 0 ? Math.round((person.expenses / report.expenses) * 100) : 0

                  return (
                    <div key={person.id} className="flex items-start gap-3">
                      <Avatar src={person.photo} name={person.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {person.name}
                          </span>
                          <Badge variant={expensePercent > 50 ? 'warning' : 'info'}>
                            {expensePercent}% das despesas
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <div>
                            <span className="text-slate-400">Receitas: </span>
                            <span className="text-emerald-500 font-semibold">{masked(person.income)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Despesas: </span>
                            <span className="text-red-500 font-semibold">{masked(person.expenses)}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <ProgressBar
                            value={expensePercent}
                            max={100}
                            size="sm"
                            color={expensePercent > 60 ? 'bg-orange-500' : 'bg-blue-500'}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Goals & Budget Summary */}
        <motion.div variants={itemVariants}>
          <SectionHeader title="Metas e Limites" />
          <Card>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-2">
                  <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {report.goalsHit}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {report.goalsHit === 1 ? 'Meta atingida' : 'Metas atingidas'}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {report.limitsExceeded}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {report.limitsExceeded === 1 ? 'Limite excedido' : 'Limites excedidos'}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Comparison vs Previous Month */}
        <motion.div variants={itemVariants}>
          <SectionHeader title="Comparativo com mes anterior" />
          <Card>
            <div className="space-y-3">
              <ComparisonRow
                label="Receitas"
                change={report.incomeChange}
                positive
              />
              <ComparisonRow
                label="Despesas"
                change={report.expenseChange}
                positive={false}
              />
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  {report.incomeChange > 0 && report.expenseChange <= 0 ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                        Otimo mes! Receitas subiram e despesas cairam.
                      </p>
                    </>
                  ) : report.expenseChange > 10 ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      </div>
                      <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                        Atencao: despesas aumentaram {report.expenseChange}% em relacao ao mes anterior.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <Target className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                        Mes estavel. Continue acompanhando seus gastos!
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Share Button */}
        <motion.div variants={itemVariants}>
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-lg shadow-brand-500/25 transition-colors active:scale-[0.97]"
          >
            <Share2 className="w-5 h-5" />
            Compartilhar Relatorio
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────

function SummaryItem({ label, value, change, icon: Icon, color, bgColor, masked, invertChange }) {
  const changeColor = invertChange
    ? (change > 0 ? 'text-red-500' : 'text-emerald-500')
    : (change > 0 ? 'text-emerald-500' : change < 0 ? 'text-red-500' : 'text-slate-400')

  return (
    <div className="flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4.5 h-4.5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
          {masked ? '***' : formatCurrency(value)}
        </p>
        {change !== undefined && change !== 0 && (
          <div className={`flex items-center gap-0.5 ${changeColor}`}>
            {(invertChange ? change < 0 : change > 0)
              ? <ArrowUpRight className="w-3 h-3" />
              : <ArrowDownRight className="w-3 h-3" />}
            <span className="text-[10px] font-semibold">{Math.abs(change)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

function DRERow({ label, value, masked, isPositive, isNegative, isResult, isFirst }) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${!isFirst ? 'border-t border-slate-100 dark:border-slate-700/50' : ''} ${isResult ? 'pt-3' : ''}`}>
      <span className={`text-sm ${isResult ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
        {label}
      </span>
      <span className={`text-sm font-mono tabular-nums ${
        isResult
          ? value >= 0
            ? 'font-bold text-emerald-600 dark:text-emerald-400'
            : 'font-bold text-red-600 dark:text-red-400'
          : isPositive
            ? 'text-emerald-600 dark:text-emerald-400'
            : isNegative
              ? 'text-red-600 dark:text-red-400'
              : 'text-slate-900 dark:text-white'
      }`}>
        {masked ? '***' : (
          isResult
            ? formatCurrency(value)
            : isNegative
              ? `- ${formatCurrency(value)}`
              : formatCurrency(value)
        )}
      </span>
    </div>
  )
}

function ComparisonRow({ label, change, positive }) {
  const isGood = positive ? change > 0 : change < 0
  const isBad = positive ? change < 0 : change > 0
  const color = isGood ? 'text-emerald-500' : isBad ? 'text-red-500' : 'text-slate-400'
  const bgColor = isGood ? 'bg-emerald-50 dark:bg-emerald-900/20' : isBad ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-800'

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${bgColor}`}>
        {change > 0 ? (
          <ArrowUpRight className={`w-3.5 h-3.5 ${color}`} />
        ) : change < 0 ? (
          <ArrowDownRight className={`w-3.5 h-3.5 ${color}`} />
        ) : null}
        <span className={`text-xs font-semibold ${color}`}>
          {change === 0 ? 'Sem alteracao' : `${Math.abs(change)}%`}
        </span>
      </div>
    </div>
  )
}
