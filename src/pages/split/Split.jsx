import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MoreVertical, ArrowRight, CreditCard, TrendingUp,
  Tv, Music, Dumbbell, Cloud, Plus, Users, DollarSign
} from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Button, Card, Badge, Toggle, SectionHeader, ListItem } from '../../components/ui'
import useStore from '../../lib/store'
import { formatCurrency } from '../../lib/utils'

const SUBSCRIPTION_ICONS = {
  Netflix: Tv,
  'Spotify Family': Music,
  'SmartFit Casal': Dumbbell,
  'iCloud 200GB': Cloud,
}

export default function Split() {
  const navigate = useNavigate()
  const { subscriptions } = useStore()
  const [proportionalEnabled, setProportionalEnabled] = useState(true)

  const partnerAName = 'Joao'
  const partnerBName = 'Maria'
  const partnerAIncome = 6000
  const partnerBIncome = 4000
  const totalIncome = partnerAIncome + partnerBIncome
  const partnerAPercent = Math.round((partnerAIncome / totalIncome) * 100)
  const partnerBPercent = 100 - partnerAPercent
  const pendingAmount = 150.0

  return (
    <div className="pb-8">
      <PageHeader
        title="Split e Assinaturas"
        actions={
          <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
            <MoreVertical className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        }
      />

      <div className="px-5 space-y-6 mt-4">
        {/* Settlement Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="gradient-brand border-0 overflow-hidden" padding="p-0">
            <div className="p-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 opacity-80" />
                <p className="text-sm font-medium opacity-90">
                  {partnerAName} deve para {partnerBName}
                </p>
              </div>
              <p className="text-3xl font-bold mt-2">
                {formatCurrency(pendingAmount)}
              </p>
              <p className="text-sm opacity-75 mt-1">
                Pendente este mes
              </p>
              <div className="flex items-center justify-between mt-4">
                <Badge variant="brand" className="bg-white/20 text-white border-0">
                  Proporcional: {partnerAPercent}/{partnerBPercent}
                </Badge>
                <Button
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white shadow-none border-0"
                  icon={ArrowRight}
                  onClick={() => navigate('/app/split/settle')}
                >
                  Acertar Agora
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Assinaturas Ativas */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SectionHeader
            title="Assinaturas Ativas"
            action="Ver Todas"
            onAction={() => {}}
          />
          <Card padding="p-2">
            {subscriptions.filter(s => s.active).map((sub, index) => {
              const SubIcon = SUBSCRIPTION_ICONS[sub.name] || CreditCard
              const splitLabel = sub.splitType === 'equal' ? '50/50' : 'Proporcional'
              const splitVariant = sub.splitType === 'equal' ? 'info' : 'brand'
              const nextBilling = new Date()
              nextBilling.setDate(sub.billingDate)
              if (nextBilling < new Date()) nextBilling.setMonth(nextBilling.getMonth() + 1)
              const billingStr = `Dia ${sub.billingDate}`

              return (
                <div key={sub.id}>
                  {index > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-700/50 mx-2" />
                  )}
                  <ListItem
                    icon={SubIcon}
                    iconColor={
                      sub.name === 'Netflix'
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                        : sub.name === 'Spotify Family'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500'
                        : sub.name === 'SmartFit Casal'
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-500'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                    }
                    title={sub.name}
                    subtitle={billingStr}
                    chevron={false}
                    right={
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(sub.amount)}
                        </p>
                        <Badge variant={splitVariant}>{splitLabel}</Badge>
                      </div>
                    }
                  />
                </div>
              )
            })}
          </Card>
        </motion.div>

        {/* Divisao Proporcional */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <SectionHeader title="Divisao Proporcional" />
          <Card>
            <Toggle
              checked={proportionalEnabled}
              onChange={setProportionalEnabled}
              label="Divisao Proporcional Ativa"
              description="Dividir despesas com base na renda de cada parceiro"
            />

            {proportionalEnabled && (
              <div className="mt-4 space-y-3">
                <div className="border-t border-slate-100 dark:border-slate-700/50 pt-3" />

                {/* Visual split bar */}
                <div className="flex rounded-full overflow-hidden h-3">
                  <div
                    className="bg-brand-500 transition-all"
                    style={{ width: `${partnerAPercent}%` }}
                  />
                  <div
                    className="bg-brand-200 dark:bg-brand-700 transition-all"
                    style={{ width: `${partnerBPercent}%` }}
                  />
                </div>

                {/* Partner A */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-brand-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {partnerAName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Renda: {formatCurrency(partnerAIncome)}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-brand-500">
                    {partnerAPercent}%
                  </p>
                </div>

                {/* Partner B */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-brand-200 dark:bg-brand-700" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {partnerBName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Renda: {formatCurrency(partnerBIncome)}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-slate-500 dark:text-slate-400">
                    {partnerBPercent}%
                  </p>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                  Calculado com base nas despesas compartilhadas e renda mensal combinada.
                </p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* FAB - Add new subscription */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-28 right-6 w-14 h-14 rounded-full gradient-brand shadow-lg shadow-brand-500/30 flex items-center justify-center text-white z-30"
        onClick={() => alert('Adicionar nova assinatura em breve!')}
      >
        <Plus className="w-7 h-7" strokeWidth={2.5} />
      </motion.button>
    </div>
  )
}
