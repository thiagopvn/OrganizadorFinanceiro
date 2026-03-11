import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Sparkles, ArrowUpRight, ArrowDownRight, Lightbulb, BarChart3, Users } from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Card, TabBar, SectionHeader, Badge, EmptyState, Avatar, ProgressBar } from '../../components/ui'
import { DonutChart, BarChart, LineChart } from '../../components/charts'
import useStore from '../../lib/store'
import { formatCurrency, formatCurrencyShort, CATEGORIES, CATEGORY_LIST, toDate } from '../../lib/utils'

export default function Analytics() {
  const { transactions, getCategoryTotals, getNetWorth, getTotalIncome, getTotalExpenses, privacyMode, user, partner } = useStore()
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { key: 'overview', label: 'Visão Geral' },
    { key: 'income', label: 'Receitas' },
    { key: 'expenses', label: 'Despesas' }
  ]

  // KPI calculations
  const totalIncome = getTotalIncome()
  const totalExpenses = getTotalExpenses()
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0
  const netFlow = totalIncome - totalExpenses

  // Build monthly chart data from real transactions
  const monthlyData = useMemo(() => {
    if (transactions.length === 0) return null

    const monthMap = {}
    transactions.forEach(t => {
      const d = toDate(t.date || t.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!monthMap[key]) monthMap[key] = { income: 0, expenses: 0 }
      if (t.amount > 0) monthMap[key].income += t.amount
      else monthMap[key].expenses += Math.abs(t.amount)
    })

    const sortedKeys = Object.keys(monthMap).sort().slice(-6)
    if (sortedKeys.length === 0) return null

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return {
      labels: sortedKeys.map(k => monthNames[parseInt(k.split('-')[1]) - 1]),
      income: sortedKeys.map(k => monthMap[k].income),
      expenses: sortedKeys.map(k => monthMap[k].expenses),
    }
  }, [transactions])

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

  // Net worth from real data
  const netWorth = getNetWorth()

  // Per-person spending breakdown
  const perPersonData = useMemo(() => {
    const userUid = user?.uid
    const partnerUid = partner?.uid
    const userName = user?.displayName || 'Você'
    const partnerName = partner?.displayName || 'Parceiro(a)'

    let userExpenses = 0
    let userIncome = 0
    let partnerExpenses = 0
    let partnerIncome = 0

    transactions.forEach(t => {
      if (t.paidBy === userUid) {
        if (t.amount < 0) userExpenses += Math.abs(t.amount)
        else userIncome += t.amount
      } else if (t.paidBy === partnerUid) {
        if (t.amount < 0) partnerExpenses += Math.abs(t.amount)
        else partnerIncome += t.amount
      } else if (t.paidByName) {
        // Fallback: match by name
        if (t.paidByName === userName || t.paidByName === user?.displayName) {
          if (t.amount < 0) userExpenses += Math.abs(t.amount)
          else userIncome += t.amount
        } else {
          if (t.amount < 0) partnerExpenses += Math.abs(t.amount)
          else partnerIncome += t.amount
        }
      }
    })

    const totalExpensesAll = userExpenses + partnerExpenses
    return {
      user: { name: userName, expenses: userExpenses, income: userIncome },
      partner: { name: partnerName, expenses: partnerExpenses, income: partnerIncome },
      totalExpenses: totalExpensesAll
    }
  }, [transactions, user, partner])

  const hasData = transactions.length > 0

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

        {!hasData ? (
          <motion.div variants={itemVariants}>
            <EmptyState
              icon={BarChart3}
              title="Sem dados para análise"
              description="Adicione transações para visualizar seus relatórios e gráficos financeiros."
            />
          </motion.div>
        ) : (
          <>
            {/* KPI Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
              <Card>
                <div className="flex items-start justify-between mb-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Taxa de Economia</p>
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">
                  {privacyMode ? '••' : `${savingsRate}%`}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">Este mês</p>
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
                  </div>
                </div>
                <p className={`text-2xl font-bold ${netFlow >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {privacyMode ? '••••' : formatCurrencyShort(netFlow)}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">Este mês</p>
              </Card>
            </motion.div>

            {/* Revenue vs Expenses Chart */}
            {monthlyData && (activeTab === 'overview' || activeTab === 'expenses' || activeTab === 'income') && (
              <motion.div variants={itemVariants}>
                <Card>
                  <SectionHeader title="Receitas vs Despesas" />
                  <BarChart
                    labels={monthlyData.labels}
                    datasets={[
                      {
                        label: 'Receitas',
                        data: monthlyData.income,
                        backgroundColor: '#f97316'
                      },
                      {
                        label: 'Despesas',
                        data: monthlyData.expenses,
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

            {/* Net Worth */}
            {(activeTab === 'overview' || activeTab === 'income') && (
              <motion.div variants={itemVariants}>
                <Card>
                  <SectionHeader title="Patrimônio Atual" />
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                      {privacyMode ? '••••••' : formatCurrency(netWorth)}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Baseado nas suas transações registradas
                  </p>
                </Card>
              </motion.div>
            )}

            {/* Per-Person Spending */}
            {(activeTab === 'overview' || activeTab === 'expenses') && (
              <motion.div variants={itemVariants}>
                <Card>
                  <SectionHeader title="Gastos por Pessoa" />
                  <div className="space-y-4">
                    {/* User */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={perPersonData.user.name} size="sm" />
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">
                            {perPersonData.user.name}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-red-500">
                          {privacyMode ? '••••' : formatCurrency(-perPersonData.user.expenses)}
                        </p>
                      </div>
                      {perPersonData.totalExpenses > 0 && (
                        <div className="relative h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-brand-500 rounded-full transition-all"
                            style={{ width: `${Math.round((perPersonData.user.expenses / perPersonData.totalExpenses) * 100)}%` }}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {perPersonData.totalExpenses > 0
                            ? `${Math.round((perPersonData.user.expenses / perPersonData.totalExpenses) * 100)}% do total`
                            : '0%'}
                        </p>
                        {perPersonData.user.income > 0 && (
                          <p className="text-xs text-emerald-500 font-medium">
                            Receita: {privacyMode ? '••••' : formatCurrency(perPersonData.user.income)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 dark:border-slate-700/50" />

                    {/* Partner */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={perPersonData.partner.name} size="sm" />
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">
                            {perPersonData.partner.name}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-red-500">
                          {privacyMode ? '••••' : formatCurrency(-perPersonData.partner.expenses)}
                        </p>
                      </div>
                      {perPersonData.totalExpenses > 0 && (
                        <div className="relative h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-violet-500 rounded-full transition-all"
                            style={{ width: `${Math.round((perPersonData.partner.expenses / perPersonData.totalExpenses) * 100)}%` }}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {perPersonData.totalExpenses > 0
                            ? `${Math.round((perPersonData.partner.expenses / perPersonData.totalExpenses) * 100)}% do total`
                            : '0%'}
                        </p>
                        {perPersonData.partner.income > 0 && (
                          <p className="text-xs text-emerald-500 font-medium">
                            Receita: {privacyMode ? '••••' : formatCurrency(perPersonData.partner.income)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Total */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total do Casal</p>
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                          {privacyMode ? '••••' : formatCurrency(-perPersonData.totalExpenses)}
                        </p>
                      </div>
                    </div>
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
