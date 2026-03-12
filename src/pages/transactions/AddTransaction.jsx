import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Delete, Check, Plus, X, Clock } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import {
  ShoppingCart, UtensilsCrossed, Car, Home, Gamepad2,
  Heart, GraduationCap, ShoppingBag, CreditCard, TrendingUp,
  Wallet, Briefcase, Gift, Plane, MoreHorizontal, PiggyBank
} from 'lucide-react'
import { Button, Toggle, TabBar, Avatar, Input } from '../../components/ui'
import useStore from '../../lib/store'
import { addTransaction, addInstallmentTransactions } from '../../lib/firebase'
import { getCategoryList, CATEGORIES, formatCurrency, addCustomCategory, CUSTOM_CATEGORY_COLORS, CUSTOM_CATEGORY_ICONS } from '../../lib/utils'
import { endOfMonth, subMonths, addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ICON_MAP = {
  ShoppingCart, UtensilsCrossed, Car, Home, Gamepad2,
  Heart, GraduationCap, ShoppingBag, CreditCard, TrendingUp,
  Wallet, Briefcase, Gift, Plane, MoreHorizontal, PiggyBank
}

const NUM_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'del']
]

// Compute smart default date based on globalFilters.period
function getSmartDate(period) {
  if (period === 'last_month') {
    return endOfMonth(subMonths(new Date(), 1))
  }
  return new Date()
}

export default function AddTransaction({ onClose }) {
  const { user, partner, coupleId, setShowSuccess, addTransactionContext, setAddTransactionContext, globalFilters } = useStore()
  const smartDate = getSmartDate(globalFilters.period)
  const [amountStr, setAmountStr] = useState('0')
  const [category, setCategory] = useState(addTransactionContext?.category || 'mercado')
  const [isShared, setIsShared] = useState(true)
  const [tab, setTab] = useState('expense')
  const [paidBy, setPaidBy] = useState('user') // 'user' or 'partner'
  const [installments, setInstallments] = useState(1) // number of installments
  const [saving, setSaving] = useState(false)

  // Custom category form
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(CUSTOM_CATEGORY_COLORS[0])
  const [newCatIcon, setNewCatIcon] = useState('ShoppingCart')
  const [catRefresh, setCatRefresh] = useState(0)

  const userName = user?.displayName || 'Eu'
  const partnerName = partner?.displayName || 'Parceiro(a)'

  const parsedAmount = parseFloat(amountStr) || 0
  const displayAmount = formatCurrency(parsedAmount / 100)

  // Refresh category list when custom categories change
  const categories = getCategoryList()

  const handleKey = useCallback((key) => {
    if (key === 'del') {
      setAmountStr(prev => prev.length <= 1 ? '0' : prev.slice(0, -1))
    } else if (key === '.') {
      return
    } else {
      setAmountStr(prev => {
        if (prev === '0') return key
        if (prev.length >= 10) return prev
        return prev + key
      })
    }
  }, [])

  const handleAddCustomCategory = () => {
    if (!newCatName.trim()) return
    const key = newCatName.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    if (!key) return

    addCustomCategory(key, {
      label: newCatName.trim(),
      icon: newCatIcon,
      color: newCatColor
    })

    setCategory(key)
    setShowNewCategory(false)
    setNewCatName('')
    setCatRefresh(prev => prev + 1) // trigger re-render
  }

  const handleConfirm = async () => {
    if (parsedAmount === 0 || !coupleId || saving) return
    setSaving(true)

    const finalAmount = parsedAmount / 100
    const isSavings = tab === 'savings'
    const signedAmount = tab === 'income' ? Math.abs(finalAmount) : -Math.abs(finalAmount)
    const cat = CATEGORIES[category]

    const selectedUid = paidBy === 'partner' && partner ? partner.uid : user.uid
    const selectedName = paidBy === 'partner' && partner ? (partner.displayName || 'Parceiro(a)') : (user.displayName || 'Eu')

    try {
      const txData = {
        description: isSavings ? `Economia: ${cat?.label || 'Poupança'}` : (cat?.label || 'Transação'),
        amount: signedAmount,
        category,
        transactionType: isSavings ? 'savings' : (tab === 'income' ? 'income' : 'expense'),
        date: smartDate,
        paidBy: selectedUid,
        paidByName: selectedName,
        isShared,
        splitType: 'equal',
        merchant: '',
        tags: [],
        comments: []
      }

      if (tab === 'expense' && installments > 1) {
        await addInstallmentTransactions(coupleId, txData, installments)
      } else {
        await addTransaction(coupleId, txData)
      }

      onClose()
      setShowSuccess({ amount: signedAmount, category, transactionType: isSavings ? 'savings' : undefined })
      setAddTransactionContext(null)

      // Reset form
      setAmountStr('0')
      setCategory('mercado')
      setIsShared(true)
      setTab('expense')
      setPaidBy('user')
      setInstallments(1)
    } catch (err) {
      console.error('Erro ao salvar transação:', err)
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const amountLabel = tab === 'expense' ? 'Valor da Despesa' : tab === 'income' ? 'Valor da Receita' : 'Valor da Economia'
  const amountColor = tab === 'expense'
    ? 'text-slate-900 dark:text-white'
    : tab === 'income'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-violet-600 dark:text-violet-400'

  return (
    <div className="space-y-5">
      {/* Amount Display + Camera */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
            {amountLabel}
          </p>
          <motion.p
            key={amountStr + tab}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            className={`text-3xl font-bold ${amountColor}`}
          >
            {displayAmount}
          </motion.p>
        </div>
        <button className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
          <Camera className="w-5 h-5" />
        </button>
      </div>

      {/* Smart date indicator */}
      {globalFilters.period === 'last_month' && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
            Data: <span className="font-bold">{format(smartDate, "dd/MM/yyyy", { locale: ptBR })}</span> (mês filtrado)
          </p>
        </div>
      )}

      {/* Expense / Income / Savings Tab */}
      <TabBar
        tabs={[
          { key: 'expense', label: 'Despesa' },
          { key: 'income', label: 'Receita' },
          { key: 'savings', label: 'Economia' }
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Category Pills */}
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">Categoria</p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 hide-scrollbar">
          {categories.map((cat) => {
            const IconComp = ICON_MAP[cat.icon] || LucideIcons[cat.icon] || MoreHorizontal
            const isSelected = category === cat.key
            return (
              <motion.button
                key={cat.key}
                whileTap={{ scale: 0.93 }}
                onClick={() => setCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  isSelected
                    ? tab === 'savings'
                      ? 'bg-violet-500 text-white shadow-md shadow-violet-500/25'
                      : 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                {cat.label}
              </motion.button>
            )
          })}
          {/* Add custom category button */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setShowNewCategory(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-brand-400 hover:text-brand-500 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova
          </motion.button>
        </div>
      </div>

      {/* New Category Form */}
      <AnimatePresence>
        {showNewCategory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Nova Categoria</p>
                <button onClick={() => setShowNewCategory(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Nome da categoria"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              {/* Color picker */}
              <div>
                <p className="text-[10px] text-slate-500 mb-1.5 font-medium">Cor</p>
                <div className="flex gap-1.5 flex-wrap">
                  {CUSTOM_CATEGORY_COLORS.slice(0, 12).map(color => (
                    <button
                      key={color}
                      onClick={() => setNewCatColor(color)}
                      className={`w-7 h-7 rounded-full transition-all ${newCatColor === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              {/* Icon picker */}
              <div>
                <p className="text-[10px] text-slate-500 mb-1.5 font-medium">Icone</p>
                <div className="flex gap-1.5 flex-wrap">
                  {CUSTOM_CATEGORY_ICONS.slice(0, 15).map(iconName => {
                    const Ic = LucideIcons[iconName] || MoreHorizontal
                    return (
                      <button
                        key={iconName}
                        onClick={() => setNewCatIcon(iconName)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          newCatIcon === iconName
                            ? 'text-white shadow-sm'
                            : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                        style={newCatIcon === iconName ? { backgroundColor: newCatColor } : {}}
                      >
                        <Ic className="w-4 h-4" />
                      </button>
                    )
                  })}
                </div>
              </div>
              <button
                onClick={handleAddCustomCategory}
                disabled={!newCatName.trim()}
                className="w-full py-2 bg-brand-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-brand-600 transition-colors"
              >
                Adicionar Categoria
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Installment selector — only for expenses */}
      {tab === 'expense' && (
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">Parcelas</p>
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 hide-scrollbar">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
              <motion.button
                key={n}
                whileTap={{ scale: 0.93 }}
                onClick={() => setInstallments(n)}
                className={`min-w-[42px] px-2.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  installments === n
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {n}x
              </motion.button>
            ))}
          </div>
          {installments > 1 && (
            <p className="text-[11px] text-brand-500 font-medium mt-1">
              {installments}x de {formatCurrency(parsedAmount / 100)} = {formatCurrency((parsedAmount / 100) * installments)} total
            </p>
          )}
        </div>
      )}

      {/* Shared toggle */}
      <Toggle
        checked={isShared}
        onChange={setIsShared}
        label={tab === 'savings' ? 'Economia Conjunta' : 'Despesa Conjunta'}
        description={tab === 'savings' ? 'Economia compartilhada pelo casal' : 'Dividir entre o casal'}
      />

      {/* Who paid selector */}
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
          {tab === 'savings' ? 'Quem está economizando?' : 'Quem pagou?'}
        </p>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setPaidBy('user')}
            className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              paidBy === 'user'
                ? tab === 'savings'
                  ? 'bg-violet-500 text-white shadow-md shadow-violet-500/25'
                  : 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Avatar name={userName} size="sm" className={`w-6 h-6 text-[9px] ${paidBy === 'user' ? 'ring-2 ring-white/50' : ''}`} />
            {userName}
          </motion.button>
          {partner && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setPaidBy('partner')}
              className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                paidBy === 'partner'
                  ? 'bg-violet-500 text-white shadow-md shadow-violet-500/25'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Avatar name={partnerName} size="sm" className={`w-6 h-6 text-[9px] ${paidBy === 'partner' ? 'ring-2 ring-white/50' : ''}`} />
              {partnerName}
            </motion.button>
          )}
        </div>
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-2.5">
        {NUM_KEYS.flat().map((key) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleKey(key)}
            className={`h-14 rounded-xl text-lg font-bold flex items-center justify-center transition-colors ${
              key === 'del'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                : key === '.'
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {key === 'del' ? <Delete className="w-5 h-5" /> : key}
          </motion.button>
        ))}
      </div>

      {/* Confirm Button */}
      <Button
        fullWidth
        size="lg"
        onClick={handleConfirm}
        disabled={parsedAmount === 0 || saving}
        loading={saving}
        icon={tab === 'savings' ? PiggyBank : Check}
        className={tab === 'savings' ? '!bg-violet-500 hover:!bg-violet-600' : ''}
      >
        {tab === 'savings' ? 'Guardar' : 'Confirmar'}
      </Button>
    </div>
  )
}
