import { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Share2, Send, Smile, MessageCircle, Trash2 } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PageHeader } from '../../components/layout'
import { Card, Badge, Avatar } from '../../components/ui'
import useStore from '../../lib/store'
import { formatCurrency, formatDateTime, CATEGORIES, toDate } from '../../lib/utils'
import { deleteTransaction } from '../../lib/firebase'

export default function TransactionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { transactions, privacyMode, user, partner, coupleId } = useStore()
  const [commentText, setCommentText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const commentsEndRef = useRef(null)

  const transaction = useMemo(() => {
    return transactions.find(t => t.id === id)
  }, [transactions, id])

  const userName = user?.displayName || 'Você'
  const partnerName = partner?.displayName || 'Parceiro(a)'

  const [comments, setComments] = useState([])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  if (!transaction) {
    return (
      <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
        <PageHeader title="Detalhe da Transação" />
        <div className="px-5 py-12 text-center">
          <MessageCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Transação não encontrada</p>
        </div>
      </div>
    )
  }

  const cat = CATEGORIES[transaction.category] || CATEGORIES.outros
  const IconComponent = LucideIcons[cat.icon] || LucideIcons.MoreHorizontal
  const isExpense = transaction.amount < 0
  const transactionDate = toDate(transaction.date || transaction.createdAt)

  const handleDelete = async () => {
    if (!coupleId) return
    setDeleting(true)
    try {
      await deleteTransaction(coupleId, transaction.id)
      navigate(-1)
    } catch (e) {
      console.error('Erro ao deletar transação:', e)
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSendComment = () => {
    if (!commentText.trim()) return
    setComments(prev => [...prev, {
      id: `c${Date.now()}`,
      userId: user?.uid,
      name: userName,
      message: commentText.trim(),
      timestamp: new Date(),
      isOwn: true
    }])
    setCommentText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendComment()
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  }

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900 flex flex-col">
      <PageHeader
        title="Detalhe da Transação"
        actions={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
              aria-label="Excluir transação"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: transaction.description,
                    text: `${transaction.description}: ${formatCurrency(transaction.amount)}`
                  }).catch(() => {})
                }
              }}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <motion.div
        className="flex-1 px-5 pb-24 space-y-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Transaction Header */}
        <motion.div variants={itemVariants} className="pt-4">
          <Card>
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: `${cat.color}15` }}
              >
                <IconComponent className="w-7 h-7" style={{ color: cat.color }} />
              </div>
              <p className="text-base font-semibold text-slate-800 dark:text-white mb-1">
                {transaction.description}
              </p>
              {transaction.merchant && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  {transaction.merchant}
                </p>
              )}
              <p className={`text-3xl font-bold ${isExpense ? 'text-red-500' : 'text-emerald-500'}`}>
                {privacyMode ? '••••••' : formatCurrency(transaction.amount)}
              </p>
              <div className="mt-3">
                <Badge variant={isExpense ? 'danger' : 'success'}>
                  {cat.label}
                </Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Detail Rows */}
        <motion.div variants={itemVariants}>
          <Card padding="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {/* Data */}
              <div className="flex items-center justify-between px-5 py-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Data</p>
                <p className="text-sm font-medium text-slate-800 dark:text-white">
                  {formatDateTime(transactionDate)}
                </p>
              </div>

              {/* Categoria */}
              <div className="flex items-center justify-between px-5 py-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Categoria</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    <IconComponent className="w-3.5 h-3.5" style={{ color: cat.color }} />
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{cat.label}</p>
                </div>
              </div>

              {/* Pago por */}
              <div className="flex items-center justify-between px-5 py-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Pago por</p>
                <div className="flex items-center gap-2">
                  <Avatar
                    name={transaction.paidBy === user?.uid ? userName : partnerName}
                    size="sm"
                  />
                  <p className="text-sm font-medium text-slate-800 dark:text-white">
                    {transaction.paidBy === user?.uid ? userName : partnerName}
                  </p>
                </div>
              </div>

              {/* Conta */}
              <div className="flex items-center justify-between px-5 py-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Conta</p>
                <p className="text-sm font-medium text-slate-800 dark:text-white">
                  {transaction.isShared ? 'Conta Conjunta' : 'Conta Pessoal'}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Divider */}
        <motion.div variants={itemVariants}>
          <div className="border-t border-slate-200 dark:border-slate-700" />
        </motion.div>

        {/* Activity & Comments */}
        <motion.div variants={itemVariants}>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            Atividade e Comentários
          </p>

          <div className="space-y-4">
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${comment.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2.5 max-w-[85%] ${comment.isOwn ? 'flex-row-reverse' : ''}`}>
                  <Avatar
                    name={comment.name}
                    size="sm"
                    className="shrink-0 mt-1"
                  />
                  <div>
                    <div className={`flex items-baseline gap-2 mb-1 ${comment.isOwn ? 'justify-end' : ''}`}>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {comment.name}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {format(comment.timestamp, 'HH:mm')}
                      </p>
                    </div>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        comment.isOwn
                          ? 'bg-brand-500 text-white rounded-br-md'
                          : 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-bl-md'
                      }`}
                    >
                      {comment.message}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={commentsEndRef} />
          </div>
        </motion.div>
      </motion.div>

      {/* Comment Input */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3 z-30">
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors shrink-0">
            <Smile className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreva um comentário..."
            className="flex-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-full px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSendComment}
            disabled={!commentText.trim()}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              commentText.trim()
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
            }`}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl"
          >
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white text-center mb-2">
              Excluir transação?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
              "{transaction.description}" de {formatCurrency(transaction.amount)} será removida permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
