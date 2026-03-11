import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, CreditCard,
} from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Button, Card, TabBar, EmptyState } from '../../components/ui'

export default function Cards() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('virtual')

  return (
    <div className="pb-8">
      <PageHeader
        title="Carteira e Cartões"
        actions={
          <button
            onClick={() => alert('Adicionar cartão em breve!')}
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
            { key: 'fisico', label: 'Físico' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {/* Empty State */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <EmptyState
            icon={CreditCard}
            title="Nenhum cartão cadastrado"
            description="Adicione seus cartões para gerenciar limites, congelar cartões e acompanhar seus gastos."
          />
        </motion.div>
      </div>
    </div>
  )
}
