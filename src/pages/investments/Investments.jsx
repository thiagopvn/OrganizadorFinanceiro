import { useState } from 'react'
import { Card, Badge, TabBar, ListItem, SectionHeader, EmptyState } from '../../components/ui'
import { PageHeader } from '../../components/layout'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, TrendingUp } from 'lucide-react'

export default function Investments() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader
        title="Investimentos do Casal"
        actions={
          <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-brand-500">
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-5 pb-32 space-y-6 mt-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <EmptyState
            icon={TrendingUp}
            title="Nenhum investimento cadastrado"
            description="Adicione seus investimentos para acompanhar a evolução patrimonial, alocação de ativos e rendimentos do casal."
          />
        </motion.div>
      </div>
    </div>
  )
}
