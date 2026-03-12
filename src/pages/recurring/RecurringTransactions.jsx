import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar, Check, Trash2, RefreshCw, AlertCircle, X, Zap } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Card, Badge, Button, Modal, EmptyState, SectionHeader, Toggle } from '../../components/ui'
import useStore from '../../lib/store'
import { addRecurringTransaction, deleteRecurringTransaction, updateRecurringTransaction } from '../../lib/firebase'
import { formatCurrency, CATEGORIES, getCategoryList, RECURRENCE_OPTIONS } from '../../lib/utils'

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } }
const INITIAL_FORM = { name: '', amount: '', category: 'moradia', frequency: 'monthly', dayOfMonth: 5, type: 'expense', isShared: false }
const inputClass = 'w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm'
const selectClass = 'w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm appearance-none'

const getCatIcon = (key) => { const cat = CATEGORIES[key]; return LucideIcons[cat?.icon] || LucideIcons.MoreHorizontal }
const getCatColor = (key) => CATEGORIES[key]?.color || '#64748b'
const getFreqLabel = (key) => RECURRENCE_OPTIONS.find(o => o.key === key)?.label || key
const getDaysUntil = (day) => { const today = new Date().getDate(); return day >= today ? day - today : (day + 30) - today }

export default function RecurringTransactions() {
  const navigate = useNavigate()
  const { recurringTransactions = [], coupleId, user, partner, privacyMode } = useStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const categories = useMemo(() => getCategoryList(), [])

  const expenses = useMemo(() => recurringTransactions.filter(t => t.type === 'expense' && t.active), [recurringTransactions])
  const incomes = useMemo(() => recurringTransactions.filter(t => t.type === 'income' && t.active), [recurringTransactions])
  const inactive = useMemo(() => recurringTransactions.filter(t => !t.active), [recurringTransactions])

  const summary = useMemo(() => {
    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0)
    const totalIncome = incomes.reduce((s, t) => s + Math.abs(t.amount), 0)
    return { totalExpenses, totalIncome, net: totalIncome - totalExpenses }
  }, [expenses, incomes])

  const upcoming = useMemo(() => {
    const currentDay = new Date().getDate()
    return recurringTransactions
      .filter(t => t.active && t.frequency === 'monthly')
      .filter(t => { const d = getDaysUntil(t.dayOfMonth); return d >= 0 && d <= 7 })
      .sort((a, b) => getDaysUntil(a.dayOfMonth) - getDaysUntil(b.dayOfMonth))
  }, [recurringTransactions])

  const handleOpenAdd = () => { setForm(INITIAL_FORM); setShowAddModal(true) }

  const handleSave = async () => {
    if (!form.name.trim() || !form.amount || !coupleId) return
    setSaving(true)
    try {
      const amount = parseFloat(form.amount)
      await addRecurringTransaction(coupleId, {
        name: form.name.trim(),
        amount: form.type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        category: form.category, frequency: form.frequency,
        dayOfMonth: parseInt(form.dayOfMonth), type: form.type,
        isShared: form.isShared, paidBy: user?.uid || null, active: true,
      })
      setShowAddModal(false)
      setForm(INITIAL_FORM)
    } catch (err) { console.error('Erro ao salvar recorrente:', err) }
    finally { setSaving(false) }
  }

  const handleToggleActive = async (item) => {
    if (!coupleId) return
    try { await updateRecurringTransaction(coupleId, item.id, { active: !item.active }) }
    catch (err) { console.error('Erro ao atualizar status:', err) }
  }

  const handleDelete = async () => {
    if (!deleteId || !coupleId) return
    setDeleting(true)
    try { await deleteRecurringTransaction(coupleId, deleteId); setDeleteId(null) }
    catch (err) { console.error('Erro ao excluir recorrente:', err) }
    finally { setDeleting(false) }
  }

  const val = (v) => privacyMode ? '••••' : formatCurrency(v)

  const renderGroup = (title, items) => (
    <motion.div variants={itemVariants}>
      <SectionHeader title={`${title} (${items.length})`} />
      {items.length === 0 ? (
        <Card><p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">Nenhuma cadastrada</p></Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {items.map(item => (
              <RecurringItem key={item.id} item={item} privacyMode={privacyMode}
                onToggle={() => handleToggleActive(item)} onDelete={() => setDeleteId(item.id)}
                partner={partner} user={user} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader title="Contas Fixas" actions={
        <button onClick={handleOpenAdd} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-brand-500">
          <Plus className="w-5 h-5" />
        </button>
      } />

      <motion.div className="px-5 pb-8 space-y-5" variants={containerVariants} initial="hidden" animate="visible">
        {/* Summary */}
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-brand-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Resumo Mensal Fixo</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Despesas', value: summary.totalExpenses, cls: 'text-red-500' },
                { label: 'Receitas', value: summary.totalIncome, cls: 'text-emerald-500', border: true },
                { label: 'Saldo', value: summary.net, cls: summary.net >= 0 ? 'text-emerald-500' : 'text-red-500' },
              ].map(({ label, value, cls, border }) => (
                <div key={label} className={`text-center ${border ? 'border-x border-slate-100 dark:border-slate-700' : ''}`}>
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className={`text-sm font-bold ${cls}`}>{val(value)}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <motion.div variants={itemVariants}>
            <SectionHeader title="Proximos Vencimentos" />
            <Card className="border-amber-200 dark:border-amber-800/50">
              <div className="space-y-3">
                {upcoming.map(item => {
                  const Icon = getCatIcon(item.category)
                  const color = getCatColor(item.category)
                  const days = getDaysUntil(item.dayOfMonth)
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {days === 0 ? 'Vence hoje' : `Vence em ${days} dia${days > 1 ? 's' : ''}`} &middot; Dia {item.dayOfMonth}
                        </p>
                      </div>
                      <p className={`text-sm font-bold ${item.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                        {val(Math.abs(item.amount))}
                      </p>
                    </div>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {renderGroup('Despesas Fixas', expenses)}
        {renderGroup('Receitas Fixas', incomes)}

        {inactive.length > 0 && (
          <motion.div variants={itemVariants}>
            <SectionHeader title={`Pausadas (${inactive.length})`} />
            <div className="space-y-2 opacity-60">
              <AnimatePresence>
                {inactive.map(item => (
                  <RecurringItem key={item.id} item={item} privacyMode={privacyMode}
                    onToggle={() => handleToggleActive(item)} onDelete={() => setDeleteId(item.id)}
                    partner={partner} user={user} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {recurringTransactions.length === 0 && (
          <motion.div variants={itemVariants}>
            <EmptyState icon={RefreshCw} title="Nenhuma conta fixa"
              description="Cadastre suas despesas e receitas recorrentes para ter mais controle do seu planejamento mensal."
              action="Adicionar conta fixa" onAction={handleOpenAdd} />
          </motion.div>
        )}

        <motion.button whileTap={{ scale: 0.9 }} onClick={handleOpenAdd}
          className="fixed bottom-24 right-4 max-w-md w-14 h-14 rounded-full gradient-brand shadow-lg shadow-brand-500/30 flex items-center justify-center text-white z-30"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}>
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </motion.button>
      </motion.div>

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Nova Conta Fixa">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ key: 'expense', label: 'Despesa', active: 'bg-red-500 text-white shadow-lg shadow-red-500/25' },
                { key: 'income', label: 'Receita', active: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' }
              ].map(({ key, label, active }) => (
                <button key={key} onClick={() => setForm(f => ({ ...f, type: key }))}
                  className={`py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                    form.type === key ? active : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Nome</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Aluguel, Netflix, Salario..." className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Valor (R$)</label>
            <input type="number" inputMode="decimal" value={form.amount} min="0" step="0.01"
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Categoria</label>
            <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-1">
              {categories.map(cat => {
                const CatIcon = LucideIcons[cat.icon] || LucideIcons.MoreHorizontal
                const sel = form.category === cat.key
                return (
                  <button key={cat.key} onClick={() => setForm(f => ({ ...f, category: cat.key }))}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-medium transition-all ${
                      sel ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 ring-2 ring-brand-500/30'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}>
                    <CatIcon className="w-5 h-5" style={{ color: cat.color }} />
                    <span className="truncate w-full text-center">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Frequencia</label>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} className={selectClass}>
                {RECURRENCE_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Dia do mes</label>
              <select value={form.dayOfMonth} onChange={e => setForm(f => ({ ...f, dayOfMonth: e.target.value }))} className={selectClass}>
                {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
              </select>
            </div>
          </div>

          <Toggle checked={form.isShared} onChange={v => setForm(f => ({ ...f, isShared: v }))}
            label="Conta compartilhada" description="Dividida entre o casal" />

          <Button fullWidth loading={saving} disabled={!form.name.trim() || !form.amount} onClick={handleSave} icon={Check}>
            Salvar conta fixa
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Excluir conta fixa?">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          Essa conta fixa sera removida permanentemente. Isso nao afeta transacoes ja registradas.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" fullWidth loading={deleting} onClick={handleDelete} icon={Trash2}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}

function RecurringItem({ item, privacyMode, onToggle, onDelete, partner, user }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = getCatIcon(item.category)
  const color = getCatColor(item.category)
  const paidByName = useMemo(() => {
    if (!item.paidBy) return null
    if (item.paidBy === user?.uid) return user?.displayName?.split(' ')[0] || 'Voce'
    if (item.paidBy === partner?.uid) return partner?.displayName?.split(' ')[0] || 'Parceiro(a)'
    return null
  }, [item.paidBy, user, partner])

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.25 }}>
      <Card padding="p-0">
        <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setExpanded(!expanded)}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color + '18' }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
              {item.isShared && <Badge variant="brand">Compartilhada</Badge>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {getFreqLabel(item.frequency)} &middot; Dia {item.dayOfMonth}
              </span>
            </div>
          </div>
          <p className={`text-sm font-bold flex-shrink-0 ${item.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
            {privacyMode ? '••••' : formatCurrency(Math.abs(item.amount))}
          </p>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center justify-between pt-3">
                  {paidByName && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Pago por <span className="font-semibold text-slate-700 dark:text-slate-300">{paidByName}</span>
                    </span>
                  )}
                  <Toggle checked={item.active} onChange={onToggle} label={item.active ? 'Ativa' : 'Pausada'} />
                </div>
                <div className="flex justify-end mt-2">
                  <button onClick={e => { e.stopPropagation(); onDelete() }}
                    className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 py-1.5 px-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}
