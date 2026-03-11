import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Snowflake, Eye, KeyRound, AlertTriangle,
  ShoppingBag, Globe, CreditCard, Wifi, ChevronRight
} from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Button, Card, TabBar, Toggle, ListItem, ProgressBar, SectionHeader } from '../../components/ui'
import { formatCurrency } from '../../lib/utils'

const MOCK_CARDS = [
  {
    id: 1,
    type: 'JOINT SPENDING',
    brand: 'Visa Signature',
    lastFour: '4821',
    holderNames: 'JOAO & MARIA SILVA',
    expiry: '12/28',
    gradient: 'from-slate-800 to-slate-600',
    tab: 'virtual',
  },
  {
    id: 2,
    type: 'PESSOAL',
    brand: 'Mastercard Black',
    lastFour: '7193',
    holderNames: 'JOAO R SILVA',
    expiry: '08/27',
    gradient: 'from-brand-600 to-brand-400',
    tab: 'virtual',
  },
  {
    id: 3,
    type: 'JOINT SPENDING',
    brand: 'Visa Platinum',
    lastFour: '3056',
    holderNames: 'JOAO & MARIA SILVA',
    expiry: '03/29',
    gradient: 'from-indigo-800 to-indigo-500',
    tab: 'fisico',
  },
]

export default function Cards() {
  const navigate = useNavigate()
  const scrollRef = useRef(null)
  const [activeTab, setActiveTab] = useState('virtual')
  const [frozenCard, setFrozenCard] = useState(false)
  const [onlinePurchases, setOnlinePurchases] = useState(true)
  const [internationalPurchases, setInternationalPurchases] = useState(false)
  const [monthlyLimit, setMonthlyLimit] = useState(6000)

  const filteredCards = MOCK_CARDS.filter(c => c.tab === activeTab)

  const availableBalance = 4250
  const spendLimit = 6000
  const spent = spendLimit - 1750
  const remaining = 1750

  return (
    <div className="pb-8">
      <PageHeader
        title="Carteira e Cartoes"
        actions={
          <button
            onClick={() => alert('Adicionar cartao em breve!')}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Plus className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        }
      />

      <div className="px-5 space-y-6 mt-4">
        {/* Tab Bar */}
        <TabBar
          tabs={[
            { key: 'virtual', label: 'Virtual' },
            { key: 'fisico', label: 'Fisico' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {/* Card Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-5 px-5 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {filteredCards.map((card, index) => (
            <motion.div
              key={card.id}
              className="snap-center shrink-0 w-[300px]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 h-[185px] flex flex-col justify-between shadow-lg relative overflow-hidden`}
              >
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />

                {/* Top row */}
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <p className="text-[10px] font-bold text-white/60 tracking-widest uppercase">
                      {card.type}
                    </p>
                    <p className="text-xs text-white/80 mt-0.5">{card.brand}</p>
                  </div>
                  <Wifi className="w-6 h-6 text-white/40 rotate-90" />
                </div>

                {/* Card number */}
                <div className="relative z-10">
                  <p className="text-lg font-mono text-white tracking-[0.2em]">
                    **** **** **** {card.lastFour}
                  </p>
                </div>

                {/* Bottom row */}
                <div className="flex items-end justify-between relative z-10">
                  <div>
                    <p className="text-[10px] text-white/50 uppercase">Titular</p>
                    <p className="text-xs text-white font-medium">{card.holderNames}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/50 uppercase">Validade</p>
                    <p className="text-xs text-white font-medium">{card.expiry}</p>
                  </div>
                </div>

                {/* Frozen overlay */}
                {frozenCard && card.id === 1 && (
                  <div className="absolute inset-0 bg-blue-900/70 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
                    <div className="text-center">
                      <Snowflake className="w-8 h-8 text-blue-200 mx-auto mb-1" />
                      <p className="text-sm font-semibold text-blue-200">Cartao Congelado</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* KPI Cards */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <p className="text-xs text-slate-500 dark:text-slate-400">Saldo Disponivel</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">
              {formatCurrency(availableBalance)}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500 dark:text-slate-400">Limite Mensal</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">
              {formatCurrency(spendLimit)}
            </p>
          </Card>
        </motion.div>

        {/* Configuracoes do Cartao */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SectionHeader title="Configuracoes do Cartao" />
          <Card padding="p-3">
            <div className="px-1">
              <Toggle
                checked={frozenCard}
                onChange={setFrozenCard}
                label="Congelar Cartao"
                description="Desativa todas as transacoes instantaneamente"
              />
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700/50 my-1" />

            {/* Spending limit with progress */}
            <div className="px-2 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Limite de Gastos
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Restante: {formatCurrency(remaining)}
                  </p>
                </div>
                <button className="text-xs font-semibold text-brand-500 hover:text-brand-600">
                  Ajustar
                </button>
              </div>
              <ProgressBar value={spent} max={spendLimit} size="sm" />
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700/50 my-1" />

            <ListItem
              icon={Eye}
              iconColor="bg-blue-50 dark:bg-blue-900/20 text-blue-500"
              title="Mostrar detalhes do cartao"
              onClick={() => {}}
            />

            <ListItem
              icon={KeyRound}
              iconColor="bg-slate-100 dark:bg-slate-700/50 text-slate-500"
              title="Alterar PIN"
              onClick={() => {}}
            />

            <ListItem
              icon={AlertTriangle}
              iconColor="bg-red-50 dark:bg-red-900/20 text-red-500"
              title="Reportar perda ou roubo"
              onClick={() => {}}
            />
          </Card>
        </motion.div>

        {/* Limites e Seguranca */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <SectionHeader title="Limites e Seguranca" />
          <Card>
            <Toggle
              checked={onlinePurchases}
              onChange={setOnlinePurchases}
              label="Compras Online"
              description="Permitir transacoes em e-commerce"
            />
            <div className="border-t border-slate-100 dark:border-slate-700/50 my-1" />
            <Toggle
              checked={internationalPurchases}
              onChange={setInternationalPurchases}
              label="Internacional"
              description="Permitir compras em moeda estrangeira"
            />
            <div className="border-t border-slate-100 dark:border-slate-700/50 my-2" />

            {/* Monthly limit slider */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Limite Mensal
                </p>
                <p className="text-sm font-bold text-brand-500">
                  {formatCurrency(monthlyLimit)}
                </p>
              </div>
              <input
                type="range"
                min={500}
                max={10000}
                step={100}
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-brand-500"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-400">R$ 500</span>
                <span className="text-[10px] text-slate-400">R$ 10.000</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-3 pt-2"
        >
          <Button
            variant="outline"
            fullWidth
            icon={Snowflake}
            onClick={() => setFrozenCard(!frozenCard)}
          >
            {frozenCard ? 'Descongelar' : 'Congelar Cartao'}
          </Button>
          <Button
            variant="danger"
            fullWidth
            icon={AlertTriangle}
            onClick={() => alert('Funcionalidade em breve!')}
          >
            Cartao Perdido
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
