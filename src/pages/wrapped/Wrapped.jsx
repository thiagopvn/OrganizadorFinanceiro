import { useState } from 'react'
import { Button, Card, Badge } from '../../components/ui'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  X,
  Share2,
  TrendingUp,
  Plane,
  Trophy,
  Coffee,
  Home,
  CheckCircle2,
  Sparkles,
  Heart,
  ArrowRight,
  Star,
  Users,
} from 'lucide-react'

const HIGHLIGHTS = [
  {
    id: 1,
    icon: Coffee,
    iconColor: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
    title: 'Primeira Compra Juntos',
    description: 'M\u00e1quina de Espresso em Mar\u00e7o',
    value: '-R$ 450',
    valueColor: 'text-red-500',
  },
  {
    id: 2,
    icon: Home,
    iconColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    title: 'Meta dos Sonhos',
    description: 'Atingiram 50% da meta da Casa Pr\u00f3pria',
    value: null,
    isCheck: true,
  },
]

export default function Wrapped() {
  const navigate = useNavigate()

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
          <button className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 transition-colors">
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
                Unity Wrapped 2024
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-4"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/20 border border-yellow-400/30 mb-5">
                <Users className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-bold text-yellow-200 uppercase tracking-wider">
                  The Power Duo
                </span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-5xl font-extrabold text-white mb-3 leading-tight"
            >
              Better
              <br />
              Together.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-base text-white/70 max-w-xs mx-auto leading-relaxed"
            >
              Alex & Jordan, voc\u00eas arrasaram nas metas financeiras este ano!
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
                Total Economizado Juntos
              </p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-4xl font-extrabold text-white">R$ 18.420</p>
                <Badge className="!bg-emerald-400/20 !text-emerald-200 border border-emerald-400/30">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +22%
                </Badge>
              </div>
              <p className="text-sm text-white/50 mt-2">
                R$ 3.200 a mais que o ano passado!
              </p>
            </div>

            <div className="h-px bg-white/10 my-4" />

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-2xl p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-blue-400/20 flex items-center justify-center mx-auto mb-2">
                  <Plane className="w-5 h-5 text-blue-300" />
                </div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Top Categoria</p>
                <p className="text-sm font-bold text-white mt-0.5">Viagem</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center mx-auto mb-2">
                  <Trophy className="w-5 h-5 text-yellow-300" />
                </div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Conquistas</p>
                <p className="text-sm font-bold text-white mt-0.5">12 Alcan\u00e7adas</p>
              </div>
            </div>
          </motion.div>

          {/* Financial Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.85 }}
            className="mb-5"
          >
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3 px-1">
              Destaques Financeiros
            </p>

            <div className="space-y-2.5">
              {HIGHLIGHTS.map((item, idx) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.9 + idx * 0.1 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-3"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-white/50 mt-0.5">{item.description}</p>
                    </div>
                    {item.value && (
                      <p className={`text-sm font-bold shrink-0 ${item.valueColor}`}>
                        {item.value}
                      </p>
                    )}
                    {item.isCheck && (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    )}
                  </motion.div>
                )
              })}
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
              Pronto para 2025?
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

              <button className="w-full py-3.5 rounded-xl border-2 border-white/30 text-white font-semibold text-sm hover:bg-white/10 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
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
