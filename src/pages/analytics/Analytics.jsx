import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Sparkles, ArrowUpRight, ArrowDownRight, Lightbulb } from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Card, TabBar, SectionHeader, Badge } from '../../components/ui'
import { DonutChart, BarChart, LineChart } from '../../components/charts'
import useStore from '../../lib/store'
import { formatCurrency, formatCurrencyShort, CATEGORIES, CATEGORY_LIST } from '../../lib/utils'

export default function Analytics() {
  const { transactions, getCategoryTotals, getNetWorth, getTotalIncome, getTotalExpenses, privacyMode } = useStore()
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { key: 'overview', label: 'Visão Geral' },
    { key: 'income', label: 'Receitas' },
    { key: 'expenses', label: 'Despesas' }
  ]

  // Demo data for charts
  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']
  const incomeData = [3200, 3800, 4100, 3900, 4200, 5100]
  const expenseData = [2800, 3200, 3500, 3100, 3400, 3900]

  // KPI calculations
  const totalIncome = getTotalIncome()
  const totalExpenses = getTotalExpenses()
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0
  const netFlow = totalIncome - totalExpenses

  // Category totals for donut chart
  const categoryTotals = getCategoryTotals()
  const donutData = useMemo(() => {
    return Object.entries(categoryTotals)
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({
        label: CATEGORIES[key]?.label || key,
        value,
        color: CATEGORIES[key]?.color || '#64748b'
      }))
  }, [categoryTotals])

  const totalCategorySpend = donutData.reduce((sum, d) => sum + d.value, 0)

  // Net worth data
  const netWorthLabels = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar']
  const netWorthData = [95000, 102000, 108000, 115000, 125000, 135000, 142450]
  const netWorthCurrent = 142450
  const netWorthGrowth = 4.2

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  }

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader title="Relatórios" onBack={false} />

      <motion.div
        className="px-5 pb-8 space-y-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Subtitle */}
        <motion.div variants={itemVariants} className="pt-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">Visão geral financeira</p>
        </motion.div>

        {/* Tab Bar */}
        <motion.div variants={itemVariants}>
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </motion.div>

        {/* KPI Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          <Card>
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">Taxa de Economia</p>
              <div className="flex items-center gap-0.5 text-emerald-500">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">+3%</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {privacyMode ? '••' : `${savingsRate}%`}
            </p>
            <p className="text-[10px] text-emerald-500 font-medium mt-1">Melhor que mês passado</p>
          </Card>

          <Card>
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">Fluxo Líquido</p>
              <div className={`flex items-center gap-0.5 ${netFlow >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {netFlow >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                <span className="text-[10px] font-bold">
                  {netFlow >= 0 ? '+12%' : '-8%'}
                </span>
              </div>
            </div>
            <p className={`text-2xl font-bold ${netFlow >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {privacyMode ? '••••' : formatCurrencyShort(netFlow)}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">Este mês</p>
          </Card>
        </motion.div>

        {/* Revenue vs Expenses Chart */}
        {(activeTab === 'overview' || activeTab === 'expenses' || activeTab === 'income') && (
          <motion.div variants={itemVariants}>
            <Card>
              <SectionHeader title="Receitas vs Despesas" />
              <BarChart
                labels={monthLabels}
                datasets={[
                  {
                    label: 'Receitas',
                    data: incomeData,
                    backgroundColor: '#f97316'
                  },
                  {
                    label: 'Despesas',
                    data: expenseData,
                    backgroundColor: '#cbd5e1'
                  }
                ]}
              />
              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-brand-500" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Receitas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Despesas</span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Spending Distribution */}
        {(activeTab === 'overview' || activeTab === 'expenses') && (
          <motion.div variants={itemVariants}>
            <Card>
              <SectionHeader title="Distribuição de Gastos" />
              {donutData.length > 0 ? (
                <>
                  <DonutChart
                    data={donutData}
                    centerLabel="Total"
                    centerValue={privacyMode ? '••••' : formatCurrencyShort(totalCategorySpend)}
                  />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-4">
                    {donutData.map((item, i) => {
                      const percent = totalCategorySpend > 0
                        ? Math.round((item.value / totalCategorySpend) * 100)
                        : 0
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate flex-1">
                            {item.label}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                            {percent}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-sm text-slate-400">
                  Sem dados de gastos disponíveis
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Net Worth Evolution */}
        {(activeTab === 'overview' || activeTab === 'income') && (
          <motion.div variants={itemVariants}>
            <Card>
              <SectionHeader title="Evolução do Patrimônio" />
              <div className="flex items-baseline gap-2 mb-4">
                <p className="text-2xl font-bold text-slate-800 dark:text-white">
                  {privacyMode ? '••••••' : formatCurrency(netWorthCurrent)}
                </p>
                <div className="flex items-center gap-1 text-emerald-500">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-bold">+{netWorthGrowth}%</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                +{netWorthGrowth}% em relação ao mês anterior
              </p>
              <LineChart
                labels={netWorthLabels}
                data={netWorthData}
              />
            </Card>
          </motion.div>
        )}

        {/* Monthly Insights */}
        <motion.div variants={itemVariants}>
          <Card className="border-emerald-100 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-900/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                  Insights do Mês
                </p>
                <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  <span className="font-semibold">15% menos gastos em Lazer</span> comparado ao mês anterior.
                  Vocês economizaram R$ 180,00 nesta categoria. Continue assim!
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-xs font-semibold">Restaurantes: -22%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-red-500">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-semibold">Transporte: +8%</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
