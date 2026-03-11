import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Handshake, Check, CheckCircle, Clock, Scissors
} from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Button, Card, Badge, EmptyState } from '../../components/ui'
import useStore from '../../lib/store'
import { db, doc, updateDoc } from '../../lib/firebase'
import { formatCurrency } from '../../lib/utils'

export default function Settlement() {
  const navigate = useNavigate()
  const { settlements, coupleId, user, partner } = useStore()
  const [settling, setSettling] = useState(null)

  const partnerName = partner?.displayName || 'Parceiro(a)'
  const userName = user?.displayName || 'Você'
  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long' })

  const pendingSettlements = settlements.filter(s => s.status === 'pending')
  const completedSettlements = settlements.filter(s => s.status === 'completed')

  const handleSettle = async (settlement) => {
    if (!coupleId || settling) return
    setSettling(settlement.id)
    try {
      const settleRef = doc(db, 'couples', coupleId, 'settlements', settlement.id)
      await updateDoc(settleRef, {
        status: 'completed',
        settledAt: new Date()
      })
    } catch (err) {
      console.error('Erro ao confirmar acerto:', err)
      alert('Erro ao confirmar. Tente novamente.')
    } finally {
      setSettling(null)
    }
  }

  const getPartnerName = (uid) => {
    if (uid === user?.uid) return userName
    return partnerName
  }

  if (pendingSettlements.length === 0 && completedSettlements.length === 0) {
    return (
      <div className="pb-8">
        <PageHeader title="Acerto Mensal" />
        <div className="px-5 space-y-6 mt-4">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
          >
            <EmptyState
              icon={Scissors}
              title="Nenhum acerto pendente"
              description={`Não há despesas compartilhadas pendentes para ${currentMonth}. Quando houver, você poderá acertar por aqui.`}
            />
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <PageHeader title="Acerto Mensal" />

      <div className="px-5 space-y-6 mt-4">
        {/* Pending Settlements */}
        {pendingSettlements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Pendentes
            </p>
            <div className="space-y-3">
              {pendingSettlements.map((settlement) => (
                <Card key={settlement.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">
                        Acerto de {settlement.period}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {getPartnerName(settlement.fromUser)} deve a {getPartnerName(settlement.toUser)}
                      </p>
                    </div>
                    <Badge variant="warning">Pendente</Badge>
                  </div>

                  <div className="text-center py-3 mb-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                    <p className="text-2xl font-bold text-brand-500">
                      {formatCurrency(settlement.amount)}
                    </p>
                  </div>

                  {/* Breakdown */}
                  {settlement.breakdown && settlement.breakdown.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {settlement.breakdown.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 capitalize">{item.category}</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {formatCurrency(item.totalAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    fullWidth
                    size="md"
                    icon={Check}
                    onClick={() => handleSettle(settlement)}
                    loading={settling === settlement.id}
                    disabled={settling === settlement.id}
                  >
                    Confirmar Acerto
                  </Button>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Completed Settlements */}
        {completedSettlements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Concluídos
            </p>
            <div className="space-y-3">
              {completedSettlements.slice(0, 5).map((settlement) => (
                <Card key={settlement.id} padding="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">
                        Acerto de {settlement.period}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatCurrency(settlement.amount)}
                      </p>
                    </div>
                    <Badge variant="success">Pago</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
