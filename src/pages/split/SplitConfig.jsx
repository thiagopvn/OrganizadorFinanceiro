import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Scale, Equal, Sliders, Home, ShoppingCart, PiggyBank, Check
} from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Button, Card, SectionHeader } from '../../components/ui'
import { formatCurrency } from '../../lib/utils'

const SPLIT_OPTIONS = [
  {
    id: 'proportional',
    icon: Scale,
    title: 'Divisao Proporcional',
    description: 'Contribuicoes baseadas na renda individual (ex: 60/40)',
  },
  {
    id: 'equal',
    icon: Equal,
    title: 'Divisao 50/50',
    description: 'Ambos contribuem igualmente todo mes',
  },
  {
    id: 'custom',
    icon: Sliders,
    title: 'Contribuicao Personalizada',
    description: 'Defina valores fixos para cada parceiro',
  },
]

const SHARED_CATEGORIES = [
  { id: 'rent', label: 'Aluguel', icon: Home, total: 2500 },
  { id: 'groceries', label: 'Mercado', icon: ShoppingCart, total: 1200 },
  { id: 'savings', label: 'Poupanca Conjunta', icon: PiggyBank, total: 1000 },
]

export default function SplitConfig() {
  const navigate = useNavigate()
  const [selectedOption, setSelectedOption] = useState('proportional')
  const [sliderValue, setSliderValue] = useState(60)

  const partnerAName = 'Joao'
  const partnerBName = 'Maria'
  const partnerAIncome = 6000
  const partnerBIncome = 4000

  const partnerAPercent = selectedOption === 'equal' ? 50 : sliderValue
  const partnerBPercent = 100 - partnerAPercent

  const handleConfirm = () => {
    navigate(-1)
  }

  return (
    <div className="pb-8">
      <PageHeader title="Regras Financeiras" />

      <div className="px-5 space-y-6 mt-4">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            Filosofia Financeira
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Decida como voce e seu parceiro vao contribuir para as despesas compartilhadas.
          </p>
        </motion.div>

        {/* Radio Options */}
        <div className="space-y-3">
          {SPLIT_OPTIONS.map((option, index) => {
            const isSelected = selectedOption === option.id
            const Icon = option.icon

            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.05 }}
              >
                <button
                  onClick={() => setSelectedOption(option.id)}
                  className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-brand-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-sm font-semibold ${
                            isSelected
                              ? 'text-brand-600 dark:text-brand-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {option.title}
                        </p>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* Slider Section (when proportional or custom) */}
        {selectedOption !== 'equal' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SectionHeader title="Ajustar Contribuicao" />
            <Card>
              {/* Slider */}
              <div className="mb-4">
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={sliderValue}
                  onChange={(e) => setSliderValue(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-brand-500"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs font-semibold text-brand-500">
                    {partnerAName}: {partnerAPercent}%
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {partnerBName}: {partnerBPercent}%
                  </span>
                </div>
              </div>

              {/* Visual split bar */}
              <div className="flex rounded-full overflow-hidden h-3 mb-4">
                <div
                  className="bg-brand-500 transition-all duration-300"
                  style={{ width: `${partnerAPercent}%` }}
                />
                <div
                  className="bg-brand-200 dark:bg-brand-700 transition-all duration-300"
                  style={{ width: `${partnerBPercent}%` }}
                />
              </div>

              {/* Income display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-brand-500" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{partnerAName}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Renda: {formatCurrency(partnerAIncome)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-brand-200 dark:bg-brand-700" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{partnerBName}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Renda: {formatCurrency(partnerBIncome)}
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Impacto no Orcamento */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <SectionHeader title="Impacto no Orcamento Compartilhado" />
          <Card>
            <div className="space-y-3">
              {SHARED_CATEGORIES.map((cat, index) => {
                const Icon = cat.icon
                const amountA = (cat.total * partnerAPercent) / 100
                const amountB = (cat.total * partnerBPercent) / 100

                return (
                  <div key={cat.id}>
                    {index > 0 && (
                      <div className="border-t border-slate-100 dark:border-slate-700/50 mb-3" />
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-brand-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {cat.label}
                          </p>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {formatCurrency(cat.total)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-slate-500">
                            {partnerAName}: {formatCurrency(amountA)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {partnerBName}: {formatCurrency(amountB)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </motion.div>

        {/* Confirm Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3 pt-2"
        >
          <Button
            fullWidth
            size="lg"
            icon={Check}
            onClick={handleConfirm}
          >
            Confirmar e Aplicar
          </Button>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
            Alteracoes entram em vigor no proximo ciclo de cobranca.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
