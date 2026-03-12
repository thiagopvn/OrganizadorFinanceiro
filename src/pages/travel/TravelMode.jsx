import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader } from '../../components/layout'
import { Card, Badge, Button, Input, Modal, EmptyState, ProgressBar, SectionHeader } from '../../components/ui'
import useStore from '../../lib/store'
import { formatCurrency, CURRENCIES, convertCurrency } from '../../lib/utils'
import { updateCoupleSettings } from '../../lib/firebase'
import {
  Plane, Globe, Plus, MapPin, Wallet, TrendingUp, Calendar,
  Trash2, ArrowRightLeft, DollarSign, ShoppingBag, UtensilsCrossed,
  Car, Ticket, BedDouble, MoreHorizontal, StopCircle
} from 'lucide-react'
import { differenceInDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const EXPENSE_CATEGORIES = [
  { key: 'alimentacao', label: 'Alimentacao', icon: UtensilsCrossed, color: '#ef4444' },
  { key: 'transporte', label: 'Transporte', icon: Car, color: '#8b5cf6' },
  { key: 'hospedagem', label: 'Hospedagem', icon: BedDouble, color: '#3b82f6' },
  { key: 'passeios', label: 'Passeios', icon: Ticket, color: '#f97316' },
  { key: 'compras', label: 'Compras', icon: ShoppingBag, color: '#10b981' },
  { key: 'outros', label: 'Outros', icon: MoreHorizontal, color: '#64748b' },
]

export default function TravelMode() {
  const navigate = useNavigate()
  const { couple, coupleId, isDemo } = useStore()

  const travelMode = couple?.travelMode || null
  const isActive = travelMode?.active === true

  const [showSetup, setShowSetup] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [saving, setSaving] = useState(false)

  // Setup form state
  const [destination, setDestination] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [budget, setBudget] = useState('')

  // Add expense form state
  const [expAmount, setExpAmount] = useState('')
  const [expDescription, setExpDescription] = useState('')
  const [expCategory, setExpCategory] = useState('alimentacao')

  const expenses = travelMode?.expenses || []
  const currencyInfo = CURRENCIES[travelMode?.currency] || CURRENCIES.USD

  const stats = useMemo(() => {
    if (!isActive) return { total: 0, remaining: 0, dailyAvg: 0, days: 0, percent: 0, totalBRL: 0 }
    const total = expenses.reduce((sum, e) => sum + e.amount, 0)
    const remaining = (travelMode.budget || 0) - total
    const start = travelMode.startDate ? new Date(travelMode.startDate) : new Date()
    const days = Math.max(differenceInDays(new Date(), start), 1)
    const dailyAvg = total / days
    const percent = travelMode.budget > 0 ? (total / travelMode.budget) * 100 : 0
    const totalBRL = convertCurrency(total, travelMode.currency, 'BRL')
    return { total, remaining, dailyAvg, days, percent, totalBRL }
  }, [isActive, expenses, travelMode])

  const persist = async (data) => {
    if (isDemo || !coupleId) return
    setSaving(true)
    try {
      await updateCoupleSettings(coupleId, { travelMode: data })
    } catch (e) {
      console.error('Erro ao salvar modo viagem:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleStartTrip = async () => {
    if (!destination.trim() || !budget) return
    const data = {
      active: true,
      destination: destination.trim(),
      currency,
      budget: parseFloat(budget),
      startDate: new Date().toISOString(),
      expenses: [],
    }
    await persist(data)
    useStore.setState({ couple: { ...couple, travelMode: data } })
    setShowSetup(false)
    setDestination('')
    setBudget('')
  }

  const handleAddExpense = async () => {
    if (!expAmount || !expDescription.trim()) return
    const newExpense = {
      id: `exp_${Date.now()}`,
      amount: parseFloat(expAmount),
      description: expDescription.trim(),
      category: expCategory,
      date: new Date().toISOString(),
    }
    const updated = { ...travelMode, expenses: [...expenses, newExpense] }
    await persist(updated)
    useStore.setState({ couple: { ...couple, travelMode: updated } })
    setShowAddExpense(false)
    setExpAmount('')
    setExpDescription('')
    setExpCategory('alimentacao')
  }

  const handleDeleteExpense = async (id) => {
    const updated = { ...travelMode, expenses: expenses.filter(e => e.id !== id) }
    await persist(updated)
    useStore.setState({ couple: { ...couple, travelMode: updated } })
  }

  const handleEndTrip = async () => {
    const data = { active: false, destination: '', currency: 'USD', budget: 0, startDate: null, expenses: [] }
    await persist(data)
    useStore.setState({ couple: { ...couple, travelMode: data } })
  }

  const getCatInfo = (key) => EXPENSE_CATEGORIES.find(c => c.key === key) || EXPENSE_CATEGORIES[5]

  // ── No active trip ──
  if (!isActive) {
    return (
      <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
        <PageHeader title="Modo Viagem" />
        <div className="px-5 pb-32 space-y-5 mt-2">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-6 text-white shadow-lg">
              <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full" />
              <Plane className="w-10 h-10 mb-3 opacity-90" />
              <h2 className="text-xl font-bold mb-1">Modo Viagem</h2>
              <p className="text-sm text-white/80 mb-5">
                Acompanhe gastos em moeda estrangeira, controle seu orcamento e veja conversoes automaticas para BRL.
              </p>
              <Button
                variant="ghost"
                className="!bg-white/20 !text-white hover:!bg-white/30 w-full"
                icon={Plus}
                onClick={() => setShowSetup(true)}
              >
                Criar nova viagem
              </Button>
            </div>
          </motion.div>

          <EmptyState
            icon={Globe}
            title="Nenhuma viagem ativa"
            description="Crie uma viagem para comecar a acompanhar seus gastos em moeda estrangeira."
          />
        </div>

        {/* Setup Trip Modal */}
        <Modal isOpen={showSetup} onClose={() => setShowSetup(false)} title="Nova Viagem">
          <div className="space-y-4">
            <Input
              label="Destino"
              icon={MapPin}
              placeholder="Ex: Paris, Franca"
              value={destination}
              onChange={e => setDestination(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Moeda</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {Object.values(CURRENCIES).filter(c => c.code !== 'BRL').map(c => (
                  <button
                    key={c.code}
                    onClick={() => setCurrency(c.code)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all text-sm ${
                      currency === c.code
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-lg">{c.flag}</span>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{c.code}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{c.symbol}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label={`Orcamento (${CURRENCIES[currency]?.symbol || currency})`}
              icon={Wallet}
              type="number"
              placeholder="0,00"
              value={budget}
              onChange={e => setBudget(e.target.value)}
            />

            <div className="pt-2 flex gap-3">
              <Button variant="ghost" fullWidth onClick={() => setShowSetup(false)}>Cancelar</Button>
              <Button fullWidth icon={Plane} onClick={handleStartTrip} loading={saving}
                disabled={!destination.trim() || !budget}>
                Iniciar Viagem
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // ── Active trip dashboard ──
  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader title="Modo Viagem" />

      <div className="px-5 pb-32 space-y-5 mt-2">
        {/* Destination Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-5 text-white shadow-lg">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <h2 className="text-lg font-bold">{travelMode.destination}</h2>
              </div>
              <Badge variant="success" className="!bg-white/20 !text-white">
                {currencyInfo.flag} {travelMode.currency}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/80">
              <Calendar className="w-4 h-4" />
              <span>Dia {stats.days} de viagem</span>
              <span className="mx-1">|</span>
              <span>Inicio: {format(new Date(travelMode.startDate), "dd 'de' MMM", { locale: ptBR })}</span>
            </div>
          </div>
        </motion.div>

        {/* Budget Summary */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card animated>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Orcamento da Viagem</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {Math.round(stats.percent)}% usado
              </span>
            </div>
            <ProgressBar value={stats.total} max={travelMode.budget} className="mb-4" />

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Gasto</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {formatCurrency(stats.total, travelMode.currency)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {formatCurrency(stats.totalBRL, 'BRL')}
                </p>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Restante</p>
                <p className={`text-sm font-bold ${stats.remaining >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(stats.remaining, travelMode.currency)}
                </p>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Media/dia</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {formatCurrency(stats.dailyAvg, travelMode.currency)}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Conversion Info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card padding="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Taxa de conversao</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  1 {travelMode.currency} = {formatCurrency(currencyInfo.rateToBRL || 1, 'BRL')}
                </p>
              </div>
              <span className="text-lg">{currencyInfo.flag}</span>
            </div>
          </Card>
        </motion.div>

        {/* Add Expense Button */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Button fullWidth icon={Plus} onClick={() => setShowAddExpense(true)}>
            Adicionar Gasto
          </Button>
        </motion.div>

        {/* Expenses List */}
        <div>
          <SectionHeader title={`Gastos (${expenses.length})`} />

          {expenses.length === 0 ? (
            <Card animated>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                Nenhum gasto registrado ainda. Adicione seu primeiro gasto da viagem!
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {[...expenses].reverse().map((expense, i) => {
                  const cat = getCatInfo(expense.category)
                  const CatIcon = cat.icon
                  const brlValue = convertCurrency(expense.amount, travelMode.currency, 'BRL')
                  return (
                    <motion.div
                      key={expense.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -60 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Card padding="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '18' }}>
                            <CatIcon className="w-5 h-5" style={{ color: cat.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{expense.description}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {format(new Date(expense.date), "dd/MM 'as' HH:mm", { locale: ptBR })} &middot; {cat.label}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-white">
                              {formatCurrency(expense.amount, travelMode.currency)}
                            </p>
                            <p className="text-[10px] text-slate-400">{formatCurrency(brlValue, 'BRL')}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* End Trip */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Button variant="danger" fullWidth icon={StopCircle} onClick={handleEndTrip} loading={saving}>
            Encerrar Viagem
          </Button>
        </motion.div>
      </div>

      {/* Add Expense Modal */}
      <Modal isOpen={showAddExpense} onClose={() => setShowAddExpense(false)} title="Novo Gasto">
        <div className="space-y-4">
          <Input
            label={`Valor (${currencyInfo.symbol})`}
            icon={DollarSign}
            type="number"
            placeholder="0,00"
            value={expAmount}
            onChange={e => setExpAmount(e.target.value)}
          />

          {expAmount && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-xs text-slate-500 dark:text-slate-400 -mt-2 pl-1"
            >
              Equivale a {formatCurrency(convertCurrency(parseFloat(expAmount) || 0, travelMode.currency, 'BRL'), 'BRL')}
            </motion.p>
          )}

          <Input
            label="Descricao"
            icon={MapPin}
            placeholder="Ex: Jantar em restaurante"
            value={expDescription}
            onChange={e => setExpDescription(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Categoria</label>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map(cat => {
                const CatIcon = cat.icon
                return (
                  <button
                    key={cat.key}
                    onClick={() => setExpCategory(cat.key)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      expCategory === cat.key
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <CatIcon className="w-5 h-5" style={{ color: cat.color }} />
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setShowAddExpense(false)}>Cancelar</Button>
            <Button fullWidth icon={Plus} onClick={handleAddExpense} loading={saving}
              disabled={!expAmount || !expDescription.trim()}>
              Adicionar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
