import { useState, useMemo } from 'react'
import { Button, Card, Badge, EmptyState } from '../../components/ui'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  X,
  Share2,
  TrendingUp,
  Trophy,
  CheckCircle2,
  Sparkles,
  Heart,
  ArrowRight,
  Star,
  Users,
  Calendar,
} from 'lucide-react'
import useStore from '../../lib/store'
import { formatCurrency } from '../../lib/utils'

export default function Wrapped() {
  const navigate = useNavigate()
  const { transactions, goals, user, partner } = useStore()

  const currentYear = new Date().getFullYear()
  const userName = user?.displayName || 'Você'
  const partnerName = partner?.displayName || 'Parceiro(a)'
  const hasPartner = !!partner

  // Calculate real stats from transactions
  const stats = useMemo(() => {
    const yearTransactions = transactions.filter(t => {
      const d = new Date(t.date)
      return d.getFullYear() === currentYear
    })

    const totalSaved = yearTransactions.reduce((sum, t) => sum + t.amount, 0)
    const totalExpenses = yearTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const goalsAchieved = goals.filter(g => g.currentAmount >= g.targetAmount).length

    return {
      totalSaved: Math.max(0, totalSaved),
      totalExpenses,
      goalsAchieved,
      transactionCount: yearTransactions.length,
    }
  }, [transactions, goals, currentYear])

  const hasData = transactions.length > 0

  if (!hasData) {
    return (
      <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
        <div className="flex items-center justify-between px-5 pt-4 pb-2 safe-top">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 pt-10">
          <EmptyState
            icon={Calendar}
            title="Retrospectiva indisponível"
            description="Adicione transações ao longo do ano para gerar sua retrospectiva financeira."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero Gradient Background */}
      <div className="bg-gradient-to-b from-orange-500 via-orange-600 to-orange-800 dark:from-orange-600 dark:via-orange-700 dark:to-orange-900 min-h-screen">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute top-60 right-0 w-56 h-56 rounded-full bg-yellow-400/10 blur-3xl" />
          <div className="absolute bottom-40 -left-20 w-64 h-64 rounded-full bg-orange-300/10 blur-3xl" />
        </div>

        {/* Header Actions */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2 safe-top">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Unity Wrapped ${currentYear}`,
                  text: `${userName}${hasPartner ? ` & ${partnerName}` : ''} economizaram ${formatCurrency(stats.totalSaved)} juntos em ${currentYear}!`
                }).catch(() => {})
              }
            }}
            className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 px-5 pb-12">
          {/* Title Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mt-6 mb-8"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span className="text-xs font-bold text-white/90 uppercase tracking-widest">
                Retrospectiva {currentYear}
              </span>
            </motion.div>

            {hasPartner && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mb-4"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/20 border border-yellow-400/30 mb-5">
                  <Users className="w-4 h-4 text-yellow-300" />
                  <span className="text-sm font-bold text-yellow-200 uppercase tracking-wider">
                    A Dupla Poderosa
                  </span>
                </div>
              </motion.div>
            )}

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-5xl font-extrabold text-white mb-3 leading-tight"
            >
              Melhor
              <br />
              Juntos.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-base text-white/70 max-w-xs mx-auto leading-relaxed"
            >
              {hasPartner
                ? `${userName} & ${partnerName}, vejam como foi o ano financeiro de vocês!`
                : `${userName}, veja como foi seu ano financeiro!`}
            </motion.p>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/15 p-6 mb-5"
          >
            <div className="text-center mb-4">
              <p className="text-xs text-white/60 font-medium uppercase tracking-wider mb-1">
                Total Economizado {hasPartner ? 'Juntos' : ''}
              </p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-4xl font-extrabold text-white">{formatCurrency(stats.totalSaved)}</p>
              </div>
            </div>

            <div className="h-px bg-white/10 my-4" />

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-2xl p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-blue-400/20 flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-300" />
                </div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Transações</p>
                <p className="text-sm font-bold text-white mt-0.5">{stats.transactionCount}</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center mx-auto mb-2">
                  <Trophy className="w-5 h-5 text-yellow-300" />
                </div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Metas Alcançadas</p>
                <p className="text-sm font-bold text-white mt-0.5">{stats.goalsAchieved}</p>
              </div>
            </div>
          </motion.div>

          {/* Ready for Next Year */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
            className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/15 p-6 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-yellow-400/20 flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-yellow-300" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              Pronto para {currentYear + 1}?
            </h3>
            <p className="text-sm text-white/60 mb-6 max-w-xs mx-auto">
              Defina novas metas e continuem o ritmo juntos.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => navigate('/app/budgets/new')}
                className="w-full py-3.5 rounded-xl bg-white text-orange-600 font-bold text-sm shadow-lg shadow-black/10 hover:bg-white/90 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                Definir Nova Meta
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `Unity Wrapped ${currentYear}`,
                      text: `Nosso Unity Wrapped ${currentYear} está pronto! Economizamos ${formatCurrency(stats.totalSaved)} juntos e completamos ${stats.goalsAchieved} metas!`
                    }).catch(() => {})
                  }
                }}
                className="w-full py-3.5 rounded-xl border-2 border-white/30 text-white font-semibold text-sm hover:bg-white/10 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <Heart className="w-4 h-4" />
                Compartilhar com Parceiro
              </button>
            </div>
          </motion.div>

          {/* Bottom spacer */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  )
}
