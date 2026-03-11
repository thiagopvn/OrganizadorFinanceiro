import { useState } from 'react'
import { Card, Badge, ProgressBar, SectionHeader, ListItem, EmptyState } from '../../components/ui'
import { PageHeader } from '../../components/layout'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Settings,
  Plane,
  Globe,
} from 'lucide-react'

export default function TravelMode() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader
        title="Modo Viagem"
        actions={
          <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
            <Settings className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-5 pb-32 space-y-5 mt-2">
        {/* Travel Mode Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center"
        >
          <Badge variant="brand" className="!px-4 !py-1.5 gap-1.5">
            <Plane className="w-3.5 h-3.5" />
            MODO VIAGEM
          </Badge>
        </motion.div>

        {/* Empty State */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <EmptyState
            icon={Globe}
            title="Nenhuma viagem ativa"
            description="Configure uma viagem para acompanhar gastos em moeda estrangeira, orçamento da viagem e conversões em tempo real."
          />
        </motion.div>
      </div>
    </div>
  )
}
