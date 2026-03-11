import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Camera, Delete, Check } from 'lucide-react'
import {
  ShoppingCart, UtensilsCrossed, Car, Home, Gamepad2,
  Heart, GraduationCap, ShoppingBag, CreditCard, TrendingUp,
  Wallet, Briefcase, Gift, Plane, MoreHorizontal
} from 'lucide-react'
import { Button, Toggle, TabBar } from '../../components/ui'
import useStore from '../../lib/store'
import { addTransaction } from '../../lib/firebase'
import { CATEGORY_LIST, CATEGORIES, formatCurrency } from '../../lib/utils'

const ICON_MAP = {
  ShoppingCart, UtensilsCrossed, Car, Home, Gamepad2,
  Heart, GraduationCap, ShoppingBag, CreditCard, TrendingUp,
  Wallet, Briefcase, Gift, Plane, MoreHorizontal
}

const NUM_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'del']
]

export default function AddTransaction({ onClose }) {
  const { user, coupleId, setShowSuccess } = useStore()
  const [amountStr, setAmountStr] = useState('0')
  const [category, setCategory] = useState('mercado')
  const [isShared, setIsShared] = useState(true)
  const [tab, setTab] = useState('expense')
  const [saving, setSaving] = useState(false)

  const parsedAmount = parseFloat(amountStr) || 0
  const displayAmount = formatCurrency(parsedAmount / 100)

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

  const handleConfirm = async () => {
    if (parsedAmount === 0 || !coupleId || saving) return
    setSaving(true)

    const finalAmount = parsedAmount / 100
    const signedAmount = tab === 'expense' ? -Math.abs(finalAmount) : Math.abs(finalAmount)
    const cat = CATEGORIES[category]

    try {
      await addTransaction(coupleId, {
        description: cat?.label || 'Transação',
        amount: signedAmount,
        category,
        date: new Date(),
        paidBy: user.uid,
        paidByName: user.displayName || 'Eu',
        isShared,
        splitType: 'equal',
        merchant: '',
        tags: [],
        comments: []
      })

      onClose()
      setShowSuccess({ amount: signedAmount, category })

      // Reset form
      setAmountStr('0')
      setCategory('mercado')
      setIsShared(true)
      setTab('expense')
    } catch (err) {
      console.error('Erro ao salvar transação:', err)
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Amount Display + Camera */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
            {tab === 'expense' ? 'Valor da Despesa' : 'Valor da Receita'}
          </p>
          <motion.p
            key={amountStr}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            className={`text-3xl font-bold ${tab === 'expense' ? 'text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}`}
          >
            {displayAmount}
          </motion.p>
        </div>
        <button className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
          <Camera className="w-5 h-5" />
        </button>
      </div>

      {/* Expense / Income Tab */}
      <TabBar
        tabs={[
          { key: 'expense', label: 'Despesa' },
          { key: 'income', label: 'Receita' }
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Category Pills */}
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">Categoria</p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 hide-scrollbar">
          {CATEGORY_LIST.map((cat) => {
            const IconComp = ICON_MAP[cat.icon] || MoreHorizontal
            const isSelected = category === cat.key
            return (
              <motion.button
                key={cat.key}
                whileTap={{ scale: 0.93 }}
                onClick={() => setCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  isSelected
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                {cat.label}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Shared toggle */}
      <Toggle
        checked={isShared}
        onChange={setIsShared}
        label="Despesa Conjunta"
        description="Dividir entre o casal"
      />

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
        icon={Check}
      >
        Confirmar
      </Button>
    </div>
  )
}
