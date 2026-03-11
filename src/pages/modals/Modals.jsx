import { motion, AnimatePresence } from 'framer-motion'
import { Check, Trophy, Share2, ArrowRight, Sparkles, Plus } from 'lucide-react'
import { Modal, Button } from '../../components/ui'
import { formatCurrency, CATEGORIES } from '../../lib/utils'
import useStore from '../../lib/store'

// SuccessModal - Transaction success confirmation
export function SuccessModal({ data, onClose }) {
  if (!data) return null

  const cat = CATEGORIES[data.category] || CATEGORIES.outros
  const isIncome = data.amount > 0

  const handleAddAnother = () => {
    onClose()
    setTimeout(() => {
      useStore.getState().setShowAddTransaction(true)
    }, 300)
  }

  return (
    <Modal isOpen={!!data} onClose={onClose}>
      <div className="flex flex-col items-center text-center py-4">
        {/* Green checkmark with pulse */}
        <div className="relative mb-6">
          <motion.div
            className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
            >
              <Check className="w-10 h-10 text-emerald-500" strokeWidth={3} />
            </motion.div>
          </motion.div>
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 w-20 h-20 rounded-full border-2 border-emerald-400"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
          />
        </div>

        {/* Title */}
        <motion.h3
          className="text-xl font-bold text-slate-900 dark:text-white mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Transação Adicionada!
        </motion.h3>

        {/* Amount and category */}
        <motion.div
          className="space-y-1 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <p className={`text-2xl font-bold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {(isIncome ? '+' : '') + formatCurrency(data.amount)}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {cat.label}
          </p>
        </motion.div>

        {/* Buttons */}
        <motion.div
          className="flex flex-col gap-3 w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button fullWidth size="lg" variant="success" onClick={onClose}>
            Concluído
          </Button>
          <Button fullWidth size="md" variant="ghost" icon={Plus} onClick={handleAddAnother}>
            Adicionar Outra
          </Button>
        </motion.div>
      </div>
    </Modal>
  )
}

// AchievementModal - Goal celebration
export function AchievementModal({ data, onClose }) {
  if (!data) return null

  const stats = data.stats || {}

  const handleDashboard = () => {
    onClose()
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: data.title || 'Meta Atingida!',
        text: data.description || 'Atingimos uma meta financeira no Unity Finance!'
      }).catch(() => {})
    }
  }

  return (
    <Modal isOpen={!!data} onClose={onClose}>
      <div className="flex flex-col items-center text-center py-4">
        {/* Trophy with celebration animation */}
        <div className="relative mb-6">
          {/* Sparkle particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-amber-400 rounded-full"
              style={{
                top: '50%',
                left: '50%'
              }}
              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
              animate={{
                scale: [0, 1, 0],
                x: Math.cos((i * 60 * Math.PI) / 180) * 50,
                y: Math.sin((i * 60 * Math.PI) / 180) * 50,
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 1.2, delay: 0.3 + i * 0.08, repeat: Infinity, repeatDelay: 2 }}
            />
          ))}

          <motion.div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
            >
              <Trophy className="w-10 h-10 text-amber-500" strokeWidth={2} />
            </motion.div>
          </motion.div>

          {/* Glow ring */}
          <motion.div
            className="absolute inset-0 w-20 h-20 rounded-full border-2 border-amber-400/50"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
          />
        </div>

        {/* Title */}
        <motion.div
          className="flex items-center gap-2 mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {data.title || 'Meta Atingida!'}
          </h3>
          <Sparkles className="w-5 h-5 text-amber-500" />
        </motion.div>

        {/* Description */}
        <motion.p
          className="text-sm text-slate-500 dark:text-slate-400 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {data.description || 'Parabéns! Vocês alcançaram esta conquista juntos.'}
        </motion.p>

        {/* Stats cards */}
        {(stats.extraSavings || stats.daysAhead) && (
          <motion.div
            className="grid grid-cols-2 gap-3 w-full mb-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {stats.extraSavings && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">+{stats.extraSavings}%</p>
                <p className="text-xs text-amber-700/70 dark:text-amber-400/70 font-medium mt-1">Economia extra</p>
              </div>
            )}
            {stats.daysAhead && (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.daysAhead}</p>
                <p className="text-xs text-orange-700/70 dark:text-orange-400/70 font-medium mt-1">Dias adiantado</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Buttons */}
        <motion.div
          className="flex flex-col gap-3 w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button fullWidth size="lg" onClick={handleDashboard} icon={ArrowRight}>
            Ver Dashboard
          </Button>
          <Button fullWidth size="md" variant="outline" icon={Share2} onClick={handleShare}>
            Compartilhar
          </Button>
        </motion.div>
      </div>
    </Modal>
  )
}
