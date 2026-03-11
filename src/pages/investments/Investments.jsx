import { useState } from 'react'
import { Card, Badge, TabBar, ListItem, SectionHeader } from '../../components/ui'
import { DonutChart, LineChart } from '../../components/charts'
import { PageHeader } from '../../components/layout'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, TrendingUp, DollarSign, Building2, Bitcoin, Landmark, BarChart3 } from 'lucide-react'

const ALLOCATION_DATA = [
  { label: 'Ações', value: 45, color: '#3b82f6' },
  { label: 'FIIs', value: 30, color: '#10b981' },
  { label: 'Tesouro', value: 15, color: '#f59e0b' },
  { label: 'Cripto', value: 10, color: '#8b5cf6' },
]

const EVOLUTION_6M = {
  labels: ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  data: [380000, 395000, 410000, 432000, 458000, 482930],
}

const EVOLUTION_1A = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  data: [340000, 348000, 355000, 362000, 370000, 375000, 380000, 395000, 410000, 432000, 458000, 482930],
}

const BROKERS = [
  { name: 'XP Investimentos', value: 254120.00, initials: 'XP', color: 'bg-slate-900 text-white dark:bg-slate-600' },
  { name: 'BTG Pactual', value: 185810.42, initials: 'BTG', color: 'bg-blue-600 text-white' },
  { name: 'Binance (Cripto)', value: 43000.00, initials: 'BN', color: 'bg-amber-500 text-white' },
]

const ALLOCATION_ICONS = {
  'Ações': BarChart3,
  'FIIs': Building2,
  'Tesouro': Landmark,
  'Cripto': Bitcoin,
}

export default function Investments() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('6m')

  const chartData = activeTab === '6m' ? EVOLUTION_6M : EVOLUTION_1A

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader
        title="Investimentos do Casal"
        actions={
          <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-brand-500">
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-5 pb-32 space-y-6 mt-4">
        {/* Total Invested Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="gradient-brand rounded-2xl p-5 text-white shadow-lg shadow-brand-500/25"
        >
          <p className="text-sm text-white/80 font-medium">Total Investido</p>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-3xl font-bold tracking-tight">R$ 482.930,42</p>
            <Badge className="!bg-emerald-400/20 !text-emerald-100 border border-emerald-400/30">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12,4%
            </Badge>
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
            <div className="flex-1">
              <p className="text-xs text-white/60">Rendimento Mensal</p>
              <p className="text-sm font-semibold mt-0.5">R$ 5.420,15</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="flex-1">
              <p className="text-xs text-white/60">Dividendos Previstos</p>
              <p className="text-sm font-semibold mt-0.5">R$ 1.280,00</p>
            </div>
          </div>
        </motion.div>

        {/* Asset Allocation */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <SectionHeader title="Alocação de Ativos" />
          <Card>
            <DonutChart
              data={ALLOCATION_DATA}
              centerLabel="Diversificação"
              centerValue="5 Ativos"
            />

            {/* Legend 2x2 grid */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {ALLOCATION_DATA.map((item) => {
                const Icon = ALLOCATION_ICONS[item.label] || BarChart3
                return (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 ml-auto">
                      {item.value}%
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        </motion.div>

        {/* Patrimony Evolution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <SectionHeader title="Evolução Patrimonial" />
          <Card>
            <div className="mb-4">
              <TabBar
                tabs={[
                  { key: '6m', label: '6M' },
                  { key: '1a', label: '1A' },
                ]}
                active={activeTab}
                onChange={setActiveTab}
              />
            </div>
            <LineChart
              labels={chartData.labels}
              data={chartData.data}
              gradient
            />
            <div className="flex items-center justify-between mt-3 px-1">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Início</p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  R$ {(chartData.data[0] / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Atual</p>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  R$ {(chartData.data[chartData.data.length - 1] / 1000).toFixed(0)}K
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Broker Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <SectionHeader title="Divisão por Corretora" />
          <Card padding="p-2">
            {BROKERS.map((broker, idx) => (
              <ListItem
                key={broker.name}
                icon={() => (
                  <span className="text-[10px] font-bold">{broker.initials}</span>
                )}
                iconColor={broker.color}
                title={broker.name}
                subtitle={`${((broker.value / 482930.42) * 100).toFixed(0)}% do portfólio`}
                right={
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    R$ {broker.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                }
              />
            ))}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
