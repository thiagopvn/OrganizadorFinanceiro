import { useState } from 'react'
import { Card, Badge, ProgressBar, SectionHeader, ListItem } from '../../components/ui'
import { PageHeader } from '../../components/layout'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Settings,
  Plane,
  TrendingUp,
  TrendingDown,
  UtensilsCrossed,
  Train,
  ShoppingBag,
  MapPin,
  ArrowRight,
  ChevronRight,
  Globe,
} from 'lucide-react'

const EXPENSES = [
  {
    id: 1,
    icon: UtensilsCrossed,
    iconColor: 'bg-red-50 dark:bg-red-900/20 text-red-500',
    title: 'Le Petit Bistro',
    location: 'Paris, Fran\u00e7a',
    time: '2h atr\u00e1s',
    amountEUR: -68.50,
    amountBRL: -376.75,
  },
  {
    id: 2,
    icon: Train,
    iconColor: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500',
    title: 'TGV Paris \u2192 Lyon',
    location: 'Lyon, Fran\u00e7a',
    time: '5h atr\u00e1s',
    amountEUR: -142.00,
    amountBRL: -781.00,
  },
  {
    id: 3,
    icon: ShoppingBag,
    iconColor: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500',
    title: 'Galeries Lafayette',
    location: 'Paris, Fran\u00e7a',
    time: 'Ontem',
    amountEUR: -235.80,
    amountBRL: -1296.90,
  },
]

export default function TravelMode() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader
        title="Europa 2024"
        actions={
          <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
            <Settings className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-5 pb-32 space-y-5 mt-2">
        {/* Travel Mode Active Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center"
        >
          <Badge variant="brand" className="!px-4 !py-1.5 gap-1.5">
            <Plane className="w-3.5 h-3.5" />
            TRAVEL MODE ATIVO
          </Badge>
        </motion.div>

        {/* Current Balance EUR */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="gradient-brand rounded-2xl p-5 text-white shadow-lg shadow-brand-500/25"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/80 font-medium">Saldo Atual (EUR)</p>
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-lg">
              <span role="img" aria-label="EU flag">&#127466;&#127482;</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-3xl font-bold tracking-tight">&euro;1.240,50</p>
            <Badge className="!bg-emerald-400/20 !text-emerald-100 border border-emerald-400/30">
              <TrendingUp className="w-3 h-3 mr-1" />
              +2,5%
            </Badge>
          </div>
        </motion.div>

        {/* Converted Balance BRL */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Convertido (BRL)</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">1 EUR = 5,50 BRL</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-lg">
                <span role="img" aria-label="BR flag">&#127463;&#127479;</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-2xl font-bold text-slate-800 dark:text-white">R$ 6.822,75</p>
              <Badge variant="danger" className="gap-1">
                <TrendingDown className="w-3 h-3" />
                -1,2%
              </Badge>
            </div>
          </Card>
        </motion.div>

        {/* Trip Budget Progress */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Progresso do Or\u00e7amento</p>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">65%</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              &euro;2.259,50 gastos de &euro;3.500
            </p>
            <ProgressBar value={65} max={100} color="bg-blue-500" size="md" />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-slate-400">Restante: &euro;1.240,50</p>
              <p className="text-[10px] text-slate-400">7 dias restantes</p>
            </div>
          </Card>
        </motion.div>

        {/* Recent Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <SectionHeader title="Despesas Recentes" action="Ver Todas" onAction={() => {}} />
          <Card padding="p-2">
            {EXPENSES.map((expense) => (
              <ListItem
                key={expense.id}
                icon={expense.icon}
                iconColor={expense.iconColor}
                title={expense.title}
                subtitle={
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {expense.location} &middot; {expense.time}
                  </span>
                }
                right={
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      &euro;{Math.abs(expense.amountEUR).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      R$ {Math.abs(expense.amountBRL).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                }
              />
            ))}
          </Card>
        </motion.div>

        {/* Next Stop Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <SectionHeader title="Pr\u00f3xima Parada" />
          <div className="relative rounded-2xl overflow-hidden bg-slate-800 dark:bg-slate-700 p-6 shadow-lg">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4">
                <Globe className="w-32 h-32 text-white" />
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-brand-400" />
                </div>
                <p className="text-xs font-bold text-brand-400 uppercase tracking-widest">Next Stop</p>
              </div>

              <h3 className="text-2xl font-bold text-white mb-1">Berlin</h3>
              <p className="text-sm text-slate-400">Alemanha &middot; Em 3 dias</p>

              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-600/50">
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 uppercase">Or\u00e7amento previsto</p>
                  <p className="text-sm font-semibold text-white">&euro;800,00</p>
                </div>
                <button className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors">
                  Ver detalhes
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
