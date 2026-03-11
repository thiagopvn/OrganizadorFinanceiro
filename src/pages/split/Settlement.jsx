import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Handshake, Check, CheckCircle, Clock, Scissors
} from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Button, Card, Badge, EmptyState } from '../../components/ui'
import useStore from '../../lib/store'
import { formatCurrency } from '../../lib/utils'

export default function Settlement() {
  const navigate = useNavigate()
  const { partner } = useStore()
  const [isSettled, setIsSettled] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const partnerName = partner?.displayName || 'Parceiro(a)'
  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long' })

  // No hardcoded data - show empty state
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
