import { useState } from 'react'
import { Card, Badge, EmptyState } from '../../components/ui'
import { Button } from '../../components/ui'
import { PageHeader } from '../../components/layout'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, TrendingUp, Trash2, X, Check, Landmark, PiggyBank, BarChart3, Coins } from 'lucide-react'
import useStore from '../../lib/store'
import { addInvestment, deleteInvestment } from '../../lib/firebase'
import { formatCurrency } from '../../lib/utils'

const INVESTMENT_TYPES = [
  { id: 'renda_fixa', label: 'Renda Fixa', icon: Landmark, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' },
  { id: 'acoes', label: 'Ações', icon: BarChart3, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' },
  { id: 'fundos', label: 'Fundos', icon: PiggyBank, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500' },
  { id: 'cripto', label: 'Cripto', icon: Coins, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' },
]

export default function Investments() {
  const navigate = useNavigate()
  const { investments, coupleId, privacyMode } = useStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newInvestment, setNewInvestment] = useState({
    name: '', type: 'renda_fixa', amount: '', returnRate: ''
  })

  const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0)

  const handleAdd = async () => {
    if (!newInvestment.name || !newInvestment.amount || !coupleId || saving) return
    setSaving(true)
    try {
      await addInvestment(coupleId, {
        name: newInvestment.name,
        type: newInvestment.type,
        amount: parseFloat(newInvestment.amount),
        returnRate: parseFloat(newInvestment.returnRate) || 0,
      })
      setNewInvestment({ name: '', type: 'renda_fixa', amount: '', returnRate: '' })
      setShowAddModal(false)
    } catch (err) {
      console.error('Erro ao adicionar investimento:', err)
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (investmentId) => {
    if (!coupleId) return
    try {
      await deleteInvestment(coupleId, investmentId)
    } catch (err) {
      console.error('Erro ao remover investimento:', err)
    }
  }

  const getTypeConfig = (typeId) => INVESTMENT_TYPES.find(t => t.id === typeId) || INVESTMENT_TYPES[0]

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader
        title="Investimentos do Casal"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-brand-500"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-5 pb-32 space-y-6 mt-4">
        {/* Total Card */}
        {investments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-brand-100 dark:border-brand-800/30">
              <div className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                  Total Investido
                </p>
                <p className="text-2xl font-bold text-brand-500">
                  {privacyMode ? 'R$ ••••••' : formatCurrency(totalInvested)}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {investments.length} {investments.length === 1 ? 'investimento' : 'investimentos'}
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {investments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <EmptyState
              icon={TrendingUp}
              title="Nenhum investimento cadastrado"
              description="Adicione seus investimentos para acompanhar a evolução patrimonial do casal."
              action="Adicionar Investimento"
              onAction={() => setShowAddModal(true)}
            />
          </motion.div>
        ) : (
          <div className="space-y-3">
            {investments.map((inv, index) => {
              const typeConfig = getTypeConfig(inv.type)
              const TypeIcon = typeConfig.icon

              return (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card padding="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeConfig.color}`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                          {inv.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {typeConfig.label}
                          {inv.returnRate > 0 && ` · ${inv.returnRate}% a.a.`}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                          {privacyMode ? '••••' : formatCurrency(inv.amount)}
                        </p>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Investment Modal */}
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
                  Novo Investimento
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
                  Nome
                </label>
                <input
                  type="text"
                  value={newInvestment.name}
                  onChange={e => setNewInvestment({ ...newInvestment, name: e.target.value })}
                  placeholder="Ex: Tesouro Selic, PETR4..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {INVESTMENT_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setNewInvestment({ ...newInvestment, type: type.id })}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        newInvestment.type === type.id
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                          : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    value={newInvestment.amount}
                    onChange={e => setNewInvestment({ ...newInvestment, amount: e.target.value })}
                    placeholder="10000"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Retorno (% a.a.)
                  </label>
                  <input
                    type="number"
                    value={newInvestment.returnRate}
                    onChange={e => setNewInvestment({ ...newInvestment, returnRate: e.target.value })}
                    placeholder="12.5"
                    step="0.1"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                icon={Check}
                onClick={handleAdd}
                disabled={!newInvestment.name || !newInvestment.amount || saving}
                loading={saving}
              >
                Adicionar Investimento
              </Button>

              <div className="h-2" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
