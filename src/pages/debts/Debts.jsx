import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, CreditCard, Building2, Car, Home, GraduationCap, AlertTriangle, TrendingDown, Check, X, Percent, Calendar } from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Card, Badge, Button, Input, Modal, EmptyState, ProgressBar, SectionHeader } from '../../components/ui'
import useStore from '../../lib/store'
import { addDebt, deleteDebt, updateDebt } from '../../lib/firebase'
import { formatCurrency, calculateMonthlyPayment, calculateTotalInterest } from '../../lib/utils'

const DEBT_TYPES = [
  { id: 'cartao_credito', label: 'Cartão de Crédito', icon: CreditCard, color: 'bg-red-50 dark:bg-red-900/20 text-red-500' },
  { id: 'financiamento', label: 'Financiamento', icon: Home, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' },
  { id: 'emprestimo_pessoal', label: 'Empréstimo Pessoal', icon: Building2, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500' },
  { id: 'estudantil', label: 'Estudantil', icon: GraduationCap, color: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-500' },
  { id: 'veicular', label: 'Veicular', icon: Car, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' },
  { id: 'outro', label: 'Outro', icon: TrendingDown, color: 'bg-slate-100 dark:bg-slate-700/50 text-slate-500' },
]

const getTypeConfig = (typeId) => DEBT_TYPES.find(t => t.id === typeId) || DEBT_TYPES[5]
const EMPTY_FORM = { name: '', type: 'emprestimo_pessoal', totalAmount: '', remainingAmount: '', annualRate: '', termMonths: '', monthlyPayment: '', isShared: true }

function StatBox({ label, children }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold mb-0.5">{label}</p>
      {children}
    </div>
  )
}

export default function Debts() {
  const navigate = useNavigate()
  const { debts, coupleId, privacyMode } = useStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showSimulation, setShowSimulation] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const hide = (v) => privacyMode ? '••••' : formatCurrency(v)

  const summary = useMemo(() => {
    const totalDebt = debts.reduce((s, d) => s + (d.remainingAmount || 0), 0)
    const totalMonthly = debts.reduce((s, d) => s + (d.monthlyPayment || 0), 0)
    let maxMonths = 0
    debts.forEach(d => {
      if (d.monthlyPayment > 0 && d.remainingAmount > 0)
        maxMonths = Math.max(maxMonths, Math.ceil(d.remainingAmount / d.monthlyPayment))
    })
    const projDate = new Date()
    projDate.setMonth(projDate.getMonth() + maxMonths)
    return { totalDebt, totalMonthly, maxMonths, projDate }
  }, [debts])

  const simData = useMemo(() => {
    if (!selectedDebt?.remainingAmount || !selectedDebt?.monthlyPayment) return null
    const monthsLeft = Math.ceil(selectedDebt.remainingAmount / selectedDebt.monthlyPayment)
    const totalWithInterest = selectedDebt.monthlyPayment * monthsLeft
    const interestCost = totalWithInterest - selectedDebt.remainingAmount
    return { monthsLeft, totalWithInterest, interestCost }
  }, [selectedDebt])

  const handleFormChange = (field, value) => {
    const u = { ...form, [field]: value }
    if (['totalAmount', 'annualRate', 'termMonths'].includes(field)) {
      const total = parseFloat(u.totalAmount), rate = parseFloat(u.annualRate), months = parseInt(u.termMonths)
      if (total > 0 && months > 0) {
        u.monthlyPayment = rate > 0
          ? ((total * (rate / 100 / 12)) / (1 - Math.pow(1 + rate / 100 / 12, -months))).toFixed(2)
          : (total / months).toFixed(2)
      }
    }
    setForm(u)
  }

  const handleAddDebt = async () => {
    if (!form.name || !form.totalAmount || !coupleId || saving) return
    setSaving(true)
    try {
      const totalAmount = parseFloat(form.totalAmount)
      await addDebt(coupleId, {
        name: form.name,
        type: form.type,
        totalAmount,
        remainingAmount: parseFloat(form.remainingAmount) || totalAmount,
        annualRate: parseFloat(form.annualRate) || 0,
        termMonths: parseInt(form.termMonths) || 0,
        monthlyPayment: parseFloat(form.monthlyPayment) || 0,
        startDate: new Date(),
        isShared: form.isShared,
      })
      setForm(EMPTY_FORM)
      setShowAddModal(false)
    } catch (err) {
      console.error('Erro ao adicionar divida:', err)
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDebt = async (id) => {
    if (!coupleId) return
    try {
      await deleteDebt(coupleId, id)
      setSelectedDebt(null)
    } catch (err) {
      console.error('Erro ao remover divida:', err)
    }
  }

  const handlePayment = async () => {
    const amt = parseFloat(paymentAmount)
    if (!amt || amt <= 0 || !selectedDebt || !coupleId || saving) return
    setSaving(true)
    try {
      const newRem = Math.max(0, selectedDebt.remainingAmount - amt)
      await updateDebt(coupleId, selectedDebt.id, { remainingAmount: newRem })
      setSelectedDebt({ ...selectedDebt, remainingAmount: newRem })
      setPaymentAmount('')
      setShowPaymentModal(false)
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err)
    } finally {
      setSaving(false)
    }
  }

  const monthsLeft = (d) => d.monthlyPayment > 0 ? Math.ceil(d.remainingAmount / d.monthlyPayment) : 0
  const fmtDate = (d) => d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const itemV = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  }

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader title="Dividas e Emprestimos" actions={
        <button onClick={() => setShowAddModal(true)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-brand-500">
          <Plus className="w-5 h-5" />
        </button>
      } />

      <motion.div className="px-5 pb-32 space-y-5 mt-2" initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}>
        {/* Summary */}
        {debts.length > 0 && (
          <motion.div variants={itemV}>
            <Card className="border-red-100 dark:border-red-800/30">
              <div className="text-center mb-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Divida Total</p>
                <p className="text-2xl font-bold text-red-500">{privacyMode ? 'R$ ••••••' : formatCurrency(summary.totalDebt)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Parcela Mensal"><p className="text-sm font-bold text-slate-800 dark:text-white">{hide(summary.totalMonthly)}</p></StatBox>
                <StatBox label="Previsao de Quitacao"><p className="text-sm font-bold text-slate-800 dark:text-white">{summary.maxMonths > 0 ? fmtDate(summary.projDate) : '--'}</p></StatBox>
              </div>
            </Card>
          </motion.div>
        )}

        {debts.length === 0 && (
          <motion.div variants={itemV}>
            <EmptyState icon={TrendingDown} title="Nenhuma divida cadastrada" description="Adicione seus emprestimos e financiamentos para acompanhar o progresso de quitacao." action="Adicionar Divida" onAction={() => setShowAddModal(true)} />
          </motion.div>
        )}

        {/* Debt List */}
        {debts.length > 0 && (
          <motion.div variants={itemV}>
            <SectionHeader title={`${debts.length} ${debts.length === 1 ? 'divida' : 'dividas'}`} />
            <div className="space-y-3">
              {debts.map(debt => {
                const cfg = getTypeConfig(debt.type), Icon = cfg.icon
                const paid = debt.totalAmount - debt.remainingAmount
                const pct = debt.totalAmount > 0 ? Math.round((paid / debt.totalAmount) * 100) : 0
                return (
                  <motion.div key={debt.id} variants={itemV}>
                    <Card padding="p-4" onClick={() => setSelectedDebt(debt)}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}><Icon className="w-5 h-5" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{debt.name}</p>
                            {debt.isShared && <Badge variant="brand" className="!text-[9px] !px-1.5 !py-0 shrink-0">Casal</Badge>}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {hide(debt.monthlyPayment)}/mes{debt.annualRate > 0 && ` · ${debt.annualRate}% a.a.`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{hide(debt.remainingAmount)}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{monthsLeft(debt) > 0 ? `${monthsLeft(debt)} meses restantes` : 'Quitado'}</p>
                        </div>
                      </div>
                      <ProgressBar value={paid} max={debt.totalAmount} size="sm" color="bg-emerald-500" />
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] text-slate-400">{pct}% pago</span>
                        <span className="text-[10px] text-slate-400">{hide(paid)} de {hide(debt.totalAmount)}</span>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Add Debt Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Nova Divida">
        <div className="space-y-4">
          <Input label="Nome" placeholder="Ex: Financiamento do Carro" value={form.name} onChange={e => handleFormChange('name', e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {DEBT_TYPES.map(t => {
                const TIcon = t.icon, active = form.type === t.id
                return (
                  <button key={t.id} onClick={() => handleFormChange('type', t.id)} className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-center ${active ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'}`}>
                    <TIcon className={`w-4 h-4 ${active ? 'text-brand-500' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-medium leading-tight ${active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}>{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor Total" icon={TrendingDown} type="number" placeholder="50000" value={form.totalAmount} onChange={e => handleFormChange('totalAmount', e.target.value)} />
            <Input label="Saldo Devedor" icon={AlertTriangle} type="number" placeholder="35000" value={form.remainingAmount} onChange={e => handleFormChange('remainingAmount', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Taxa Anual (%)" icon={Percent} type="number" placeholder="12.5" value={form.annualRate} onChange={e => handleFormChange('annualRate', e.target.value)} />
            <Input label="Prazo (meses)" icon={Calendar} type="number" placeholder="48" value={form.termMonths} onChange={e => handleFormChange('termMonths', e.target.value)} />
          </div>
          <Input label="Parcela Mensal (auto-calculada)" type="number" placeholder="1320" value={form.monthlyPayment} onChange={e => handleFormChange('monthlyPayment', e.target.value)} />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Divida compartilhada</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ambos sao responsaveis</p>
            </div>
            <button onClick={() => handleFormChange('isShared', !form.isShared)} className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${form.isShared ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <motion.div className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md" animate={{ left: form.isShared ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            </button>
          </div>
          <Button fullWidth icon={Plus} loading={saving} onClick={handleAddDebt} disabled={!form.name || !form.totalAmount}>Adicionar Divida</Button>
        </div>
      </Modal>

      {/* Debt Detail Modal */}
      <Modal isOpen={!!selectedDebt && !showPaymentModal && !showSimulation} onClose={() => setSelectedDebt(null)} title={selectedDebt?.name || 'Detalhes'}>
        {selectedDebt && (() => {
          const cfg = getTypeConfig(selectedDebt.type), Icon = cfg.icon
          const paid = selectedDebt.totalAmount - selectedDebt.remainingAmount
          const pct = selectedDebt.totalAmount > 0 ? Math.round((paid / selectedDebt.totalAmount) * 100) : 0
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cfg.color}`}><Icon className="w-6 h-6" /></div>
                <div>
                  <Badge variant={pct >= 100 ? 'success' : 'warning'}>{pct >= 100 ? 'Quitado' : `${pct}% pago`}</Badge>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{cfg.label}</p>
                </div>
              </div>
              <div>
                <ProgressBar value={paid} max={selectedDebt.totalAmount} size="lg" color="bg-emerald-500" showLabel />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-slate-500">Pago: {hide(paid)}</span>
                  <span className="text-xs text-slate-500">Total: {hide(selectedDebt.totalAmount)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Saldo Devedor"><p className="text-sm font-bold text-red-500">{hide(selectedDebt.remainingAmount)}</p></StatBox>
                <StatBox label="Parcela Mensal"><p className="text-sm font-bold text-slate-800 dark:text-white">{hide(selectedDebt.monthlyPayment)}</p></StatBox>
                <StatBox label="Taxa Anual"><p className="text-sm font-bold text-slate-800 dark:text-white">{selectedDebt.annualRate}% a.a.</p></StatBox>
                <StatBox label="Meses Restantes"><p className="text-sm font-bold text-slate-800 dark:text-white">{monthsLeft(selectedDebt)}</p></StatBox>
              </div>
              {simData && simData.interestCost > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Custo total de juros</p>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-300">{hide(simData.interestCost)}</p>
                  </div>
                </div>
              )}
              <Button fullWidth icon={Check} onClick={() => setShowPaymentModal(true)}>Registrar Pagamento</Button>
              <Button fullWidth variant="outline" icon={TrendingDown} onClick={() => setShowSimulation(true)}>Simular Quitacao</Button>
              <button onClick={() => handleDeleteDebt(selectedDebt.id)} className="flex items-center justify-center gap-2 w-full py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-sm font-semibold">
                <Trash2 className="w-4 h-4" /> Excluir Divida
              </button>
            </div>
          )
        })()}
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => { setShowPaymentModal(false); setPaymentAmount('') }} title="Registrar Pagamento">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Informe o valor pago para atualizar o saldo devedor de <strong className="text-slate-800 dark:text-white">{selectedDebt?.name}</strong>.
          </p>
          {selectedDebt && (
            <StatBox label="Saldo Atual"><p className="text-lg font-bold text-red-500">{hide(selectedDebt.remainingAmount)}</p></StatBox>
          )}
          <Input label="Valor do Pagamento" type="number" placeholder="1320" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <Button fullWidth variant="ghost" onClick={() => { setShowPaymentModal(false); setPaymentAmount('') }}>Cancelar</Button>
            <Button fullWidth icon={Check} loading={saving} onClick={handlePayment} disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}>Confirmar</Button>
          </div>
        </div>
      </Modal>

      {/* Early Payoff Simulation Modal */}
      <Modal isOpen={showSimulation} onClose={() => setShowSimulation(false)} title="Simulacao de Quitacao">
        {selectedDebt && simData ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1">Economia ao quitar agora</p>
              <p className="text-2xl font-bold text-emerald-500">{hide(simData.interestCost)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">em juros que voce deixaria de pagar</p>
            </div>
            <div className="space-y-3">
              {[
                ['Saldo devedor atual', hide(selectedDebt.remainingAmount), 'text-slate-800 dark:text-white'],
                ['Total restante com juros', hide(simData.totalWithInterest), 'text-red-500'],
                ['Juros restantes', hide(simData.interestCost), 'text-amber-500'],
                ['Meses ate quitacao', `${simData.monthsLeft} meses`, 'text-slate-800 dark:text-white'],
              ].map(([label, val, cls], i, arr) => (
                <div key={label} className={`flex justify-between py-2 ${i < arr.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''}`}>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
                  <span className={`text-sm font-semibold ${cls}`}>{val}</span>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Se voce quitar essa divida hoje, pagara apenas <strong>{hide(selectedDebt.remainingAmount)}</strong> ao inves de <strong>{hide(simData.totalWithInterest)}</strong>, economizando <strong>{hide(simData.interestCost)}</strong> em juros.
              </p>
            </div>
            <Button fullWidth variant="outline" onClick={() => setShowSimulation(false)}>Fechar</Button>
          </div>
        ) : selectedDebt && (
          <div className="text-center py-6">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Dados insuficientes para simular. Verifique o valor da parcela e saldo devedor.</p>
            <Button variant="ghost" className="mt-4" onClick={() => setShowSimulation(false)}>Fechar</Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
