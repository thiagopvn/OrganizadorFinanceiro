import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreVertical, ArrowRight, CreditCard, TrendingUp,
  Tv, Music, Dumbbell, Cloud, Plus, Users, DollarSign, X, Check
} from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Button, Card, Badge, Toggle, SectionHeader, ListItem, EmptyState } from '../../components/ui'
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
  const { subscriptions, setSubscriptions, user, partner } = useStore()
  const [proportionalEnabled, setProportionalEnabled] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSub, setNewSub] = useState({ name: '', amount: '', billingDate: '', splitType: 'equal' })

  const partnerAName = user?.displayName || 'Você'
  const partnerBName = partner?.displayName || 'Parceiro(a)'
  const hasPartner = !!partner

  const activeSubscriptions = subscriptions.filter(s => s.active)
  const totalMonthly = activeSubscriptions.reduce((sum, s) => sum + s.amount, 0)

  const handleAddSubscription = () => {
    if (!newSub.name || !newSub.amount) return

    const subscription = {
      id: `sub_${Date.now()}`,
      name: newSub.name,
      amount: parseFloat(newSub.amount),
      category: 'assinatura',
      billingDate: parseInt(newSub.billingDate) || 1,
      splitType: newSub.splitType,
      active: true,
    }

    setSubscriptions([...subscriptions, subscription])
    setNewSub({ name: '', amount: '', billingDate: '', splitType: 'equal' })
    setShowAddModal(false)
  }

  return (
    <div className="pb-8">
      <PageHeader
        title="Divisão e Assinaturas"
        actions={
          <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
            <MoreVertical className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        }
      />

      <div className="px-5 space-y-6 mt-4">
        {/* Assinaturas Ativas */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <SectionHeader
            title="Assinaturas Ativas"
            action={activeSubscriptions.length > 0 ? `Total: ${formatCurrency(totalMonthly)}/mês` : undefined}
          />

          {activeSubscriptions.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Nenhuma assinatura cadastrada"
              description="Adicione suas assinaturas para acompanhar os gastos recorrentes e dividir com seu parceiro(a)."
              action="Adicionar Assinatura"
              onAction={() => setShowAddModal(true)}
            />
          ) : (
            <Card padding="p-2">
              {activeSubscriptions.map((sub, index) => {
                const SubIcon = SUBSCRIPTION_ICONS[sub.name] || CreditCard
                const splitLabel = sub.splitType === 'equal' ? '50/50' : 'Proporcional'
                const splitVariant = sub.splitType === 'equal' ? 'info' : 'brand'
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
          )}
        </motion.div>

        {/* Configuração de Divisão */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <SectionHeader title="Divisão Proporcional" />
          <Card>
            <Toggle
              checked={proportionalEnabled}
              onChange={setProportionalEnabled}
              label="Divisão Proporcional Ativa"
              description="Dividir despesas com base na renda de cada parceiro"
            />

            {proportionalEnabled && hasPartner && (
              <div className="mt-4 space-y-3">
                <div className="border-t border-slate-100 dark:border-slate-700/50 pt-3" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure a proporção na tela de{' '}
                  <button
                    onClick={() => navigate('/app/split/config')}
                    className="text-brand-500 font-semibold hover:underline"
                  >
                    Regras Financeiras
                  </button>
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
        onClick={() => setShowAddModal(true)}
      >
        <Plus className="w-7 h-7" strokeWidth={2.5} />
      </motion.button>

      {/* Add Subscription Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white dark:bg-slate-800 rounded-t-3xl p-6 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Nova Assinatura
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Nome da assinatura
                </label>
                <input
                  type="text"
                  value={newSub.name}
                  onChange={e => setNewSub({ ...newSub, name: e.target.value })}
                  placeholder="Ex: Netflix, Spotify..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    value={newSub.amount}
                    onChange={e => setNewSub({ ...newSub, amount: e.target.value })}
                    placeholder="0,00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Dia de cobrança
                  </label>
                  <input
                    type="number"
                    value={newSub.billingDate}
                    onChange={e => setNewSub({ ...newSub, billingDate: e.target.value })}
                    placeholder="15"
                    min="1"
                    max="31"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Tipo de divisão
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewSub({ ...newSub, splitType: 'equal' })}
                    className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      newSub.splitType === 'equal'
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    50/50
                  </button>
                  <button
                    onClick={() => setNewSub({ ...newSub, splitType: 'proportional' })}
                    className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      newSub.splitType === 'proportional'
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Proporcional
                  </button>
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                icon={Check}
                onClick={handleAddSubscription}
                disabled={!newSub.name || !newSub.amount}
              >
                Adicionar Assinatura
              </Button>

              {/* Bottom safe area */}
              <div className="h-2" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
