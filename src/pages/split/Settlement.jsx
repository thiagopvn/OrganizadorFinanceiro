import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Handshake, Check, Home, UtensilsCrossed, ShoppingCart,
  ArrowRight, CheckCircle, Clock
} from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Button, Card, Badge } from '../../components/ui'
import { formatCurrency } from '../../lib/utils'

const SETTLEMENT_ITEMS = [
  {
    id: 1,
    label: 'Aluguel & Condominio',
    icon: Home,
    splitType: 'Split 50/50',
    amount: 950.0,
    status: 'pending',
  },
  {
    id: 2,
    label: 'Jantares e Lazer',
    icon: UtensilsCrossed,
    splitType: '4 transacoes',
    amount: 215.5,
    status: 'pending',
  },
  {
    id: 3,
    label: 'Mercado Mensal',
    icon: ShoppingCart,
    splitType: 'Reembolso pendente',
    amount: 84.5,
    status: 'pending',
  },
]

export default function Settlement() {
  const navigate = useNavigate()
  const [isSettled, setIsSettled] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const partnerName = 'Maria'
  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long' })
  const totalAmount = SETTLEMENT_ITEMS.reduce((sum, item) => sum + item.amount, 0)

  const handleConfirm = async () => {
    setConfirming(true)
    // Simulate confirmation delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSettled(true)
    setConfirming(false)
  }

  return (
    <div className="pb-8">
      <PageHeader title="Acerto Mensal" />

      <div className="px-5 space-y-6 mt-4">
        {/* Status Icon & Title */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex justify-center mb-4">
            <motion.div
              className={`w-20 h-20 rounded-full flex items-center justify-center ${
                isSettled
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : 'bg-brand-100 dark:bg-brand-900/30'
              }`}
              animate={isSettled ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              {isSettled ? (
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              ) : (
                <Handshake className="w-10 h-10 text-brand-500" />
              )}
            </motion.div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            {isSettled ? (
              <Badge variant="success">Concluido</Badge>
            ) : (
              <Badge variant="warning">Pendente</Badge>
            )}
          </div>

          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {isSettled
              ? `Split de ${currentMonth} concluido`
              : `Split de ${currentMonth} pendente`}
          </h2>
        </motion.div>

        {/* Amount */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">
            Valor a Transferir
          </p>
          <p className={`text-4xl font-bold ${isSettled ? 'text-emerald-500' : 'text-slate-800 dark:text-white'}`}>
            {formatCurrency(totalAmount)}
          </p>
          {!isSettled && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Voce deve enviar para{' '}
              <span className="font-semibold text-brand-500">{partnerName}</span>
            </p>
          )}
        </motion.div>

        {/* Resumo do Periodo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">
              Resumo do Periodo
            </h3>
            <div className="space-y-1">
              {SETTLEMENT_ITEMS.map((item, index) => {
                const Icon = item.icon
                return (
                  <div key={item.id}>
                    {index > 0 && (
                      <div className="border-t border-slate-100 dark:border-slate-700/50 my-2" />
                    )}
                    <div className="flex items-center gap-3 py-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {item.label}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {isSettled ? (
                            <span className="text-xs text-emerald-500 flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Quitado
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" /> {item.splitType}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 shrink-0">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Total */}
            <div className="border-t-2 border-slate-200 dark:border-slate-600 mt-3 pt-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  Total
                </p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Confirm Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3 pt-2"
        >
          {isSettled ? (
            <Button
              variant="success"
              fullWidth
              size="lg"
              icon={CheckCircle}
              onClick={() => navigate('/app/split')}
            >
              Pagamento Confirmado
            </Button>
          ) : (
            <Button
              variant="success"
              fullWidth
              size="lg"
              icon={Check}
              loading={confirming}
              onClick={handleConfirm}
            >
              Confirmar Pagamento
            </Button>
          )}

          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
            Ao confirmar, o status das despesas sera alterado para "Quitado" para ambos.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
