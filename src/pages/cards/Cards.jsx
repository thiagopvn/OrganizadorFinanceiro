import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, CreditCard, Trash2, X, Check, Snowflake
} from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Button, Card, TabBar, EmptyState } from '../../components/ui'
import useStore from '../../lib/store'
import { addCard, deleteCard } from '../../lib/firebase'
import { formatCurrency } from '../../lib/utils'

const CARD_COLORS = [
  { id: 'slate', bg: 'bg-gradient-to-br from-slate-700 to-slate-900', label: 'Cinza' },
  { id: 'brand', bg: 'bg-gradient-to-br from-orange-500 to-orange-700', label: 'Laranja' },
  { id: 'blue', bg: 'bg-gradient-to-br from-blue-500 to-blue-700', label: 'Azul' },
  { id: 'emerald', bg: 'bg-gradient-to-br from-emerald-500 to-emerald-700', label: 'Verde' },
  { id: 'purple', bg: 'bg-gradient-to-br from-purple-500 to-purple-700', label: 'Roxo' },
]

export default function Cards() {
  const navigate = useNavigate()
  const { cards, coupleId } = useStore()
  const [activeTab, setActiveTab] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newCard, setNewCard] = useState({
    name: '', last4: '', type: 'credit', limit: '', color: 'slate'
  })

  const filteredCards = activeTab === 'all'
    ? cards
    : cards.filter(c => c.type === activeTab)

  const handleAddCard = async () => {
    if (!newCard.name || !newCard.last4 || !coupleId || saving) return
    setSaving(true)
    try {
      await addCard(coupleId, {
        name: newCard.name,
        last4: newCard.last4,
        type: newCard.type,
        limit: parseFloat(newCard.limit) || 0,
        color: newCard.color,
        frozen: false,
      })
      setNewCard({ name: '', last4: '', type: 'credit', limit: '', color: 'slate' })
      setShowAddModal(false)
    } catch (err) {
      console.error('Erro ao adicionar cartão:', err)
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCard = async (cardId) => {
    if (!coupleId) return
    try {
      await deleteCard(coupleId, cardId)
    } catch (err) {
      console.error('Erro ao remover cartão:', err)
    }
  }

  const getColorClass = (colorId) => {
    return CARD_COLORS.find(c => c.id === colorId)?.bg || CARD_COLORS[0].bg
  }

  return (
    <div className="pb-8">
      <PageHeader
        title="Carteira e Cartões"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Plus className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        }
      />

      <div className="px-5 space-y-6 mt-4">
        <TabBar
          tabs={[
            { key: 'all', label: 'Todos' },
            { key: 'credit', label: 'Crédito' },
            { key: 'debit', label: 'Débito' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {filteredCards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <EmptyState
              icon={CreditCard}
              title="Nenhum cartão cadastrado"
              description="Adicione seus cartões para gerenciar limites e acompanhar seus gastos."
              action="Adicionar Cartão"
              onAction={() => setShowAddModal(true)}
            />
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className={`${getColorClass(card.color)} rounded-2xl p-5 text-white relative overflow-hidden shadow-lg`}>
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
                  <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-sm font-semibold text-white/80">{card.name}</p>
                      <div className="flex items-center gap-2">
                        {card.frozen && (
                          <Snowflake className="w-4 h-4 text-blue-200" />
                        )}
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-lg font-mono tracking-widest mb-4">
                      •••• •••• •••• {card.last4}
                    </p>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-white/60 uppercase tracking-wider">Tipo</p>
                        <p className="text-sm font-semibold">
                          {card.type === 'credit' ? 'Crédito' : 'Débito'}
                        </p>
                      </div>
                      {card.limit > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] text-white/60 uppercase tracking-wider">Limite</p>
                          <p className="text-sm font-semibold">{formatCurrency(card.limit)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Card Modal */}
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
                  Novo Cartão
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
                  Nome do cartão
                </label>
                <input
                  type="text"
                  value={newCard.name}
                  onChange={e => setNewCard({ ...newCard, name: e.target.value })}
                  placeholder="Ex: Nubank, Itaú..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Últimos 4 dígitos
                  </label>
                  <input
                    type="text"
                    value={newCard.last4}
                    onChange={e => setNewCard({ ...newCard, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="1234"
                    maxLength={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                    Limite (R$)
                  </label>
                  <input
                    type="number"
                    value={newCard.limit}
                    onChange={e => setNewCard({ ...newCard, limit: e.target.value })}
                    placeholder="5000"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['credit', 'debit'].map(type => (
                    <button
                      key={type}
                      onClick={() => setNewCard({ ...newCard, type })}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        newCard.type === type
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                          : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {type === 'credit' ? 'Crédito' : 'Débito'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Cor
                </label>
                <div className="flex gap-2">
                  {CARD_COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setNewCard({ ...newCard, color: color.id })}
                      className={`w-10 h-10 rounded-xl ${color.bg} ${
                        newCard.color === color.id ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-800' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                icon={Check}
                onClick={handleAddCard}
                disabled={!newCard.name || !newCard.last4 || newCard.last4.length < 4 || saving}
                loading={saving}
              >
                Adicionar Cartão
              </Button>

              <div className="h-2" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
