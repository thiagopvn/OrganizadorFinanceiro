import { useState, useMemo } from 'react'
import { Card, Badge, TabBar, SectionHeader } from '../../components/ui'
import { PageHeader } from '../../components/layout'
import useStore from '../../lib/store'
import { formatRelative } from '../../lib/utils'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreVertical,
  Sparkles,
  ShoppingCart,
  Trophy,
  Target,
  Shield,
  Bell,
  CheckCheck,
} from 'lucide-react'
import { isToday, isYesterday } from 'date-fns'

const NOTIFICATION_CONFIG = {
  ai_alert: {
    icon: Sparkles,
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
  partner_expense: {
    icon: ShoppingCart,
    color: 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400',
  },
  achievement: {
    icon: Trophy,
    color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  },
  budget_set: {
    icon: Target,
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  security: {
    icon: Shield,
    color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  },
}

// Merge store notifications with additional demo data
function useDemoNotifications() {
  const { notifications: storeNotifications } = useStore()

  return useMemo(() => {
    const ids = new Set(storeNotifications.map((n) => n.id))

    const extraNotifications = [
      {
        id: 'n5',
        type: 'security',
        title: 'Novo Login Detectado',
        message: 'Login realizado via Chrome, Windows 11. Se n\u00e3o foi voc\u00ea, altere sua senha.',
        read: true,
        createdAt: new Date(Date.now() - 86400000),
      },
    ]

    const extra = extraNotifications.filter((n) => !ids.has(n.id))
    return [...storeNotifications, ...extra]
  }, [storeNotifications])
}

function groupNotifications(notifications) {
  const groups = { today: [], yesterday: [], older: [] }

  notifications.forEach((n) => {
    const date = n.createdAt instanceof Date ? n.createdAt : new Date(n.createdAt)
    if (isToday(date)) {
      groups.today.push(n)
    } else if (isYesterday(date)) {
      groups.yesterday.push(n)
    } else {
      groups.older.push(n)
    }
  })

  return groups
}

export default function Notifications() {
  const navigate = useNavigate()
  const { markNotificationRead } = useStore()
  const [activeTab, setActiveTab] = useState('all')

  const allNotifications = useDemoNotifications()

  const filtered = useMemo(() => {
    if (activeTab === 'ai') return allNotifications.filter((n) => n.type === 'ai_alert')
    if (activeTab === 'shared')
      return allNotifications.filter((n) => n.type === 'partner_expense' || n.type === 'achievement')
    return allNotifications
  }, [allNotifications, activeTab])

  const grouped = groupNotifications(filtered)

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markNotificationRead(notification.id)
    }
  }

  return (
    <div className="min-h-screen bg-orange-50/50 dark:bg-slate-900">
      <PageHeader
        title="Notifica\u00e7\u00f5es"
        actions={
          <button
            onClick={() => {
              allNotifications.filter(n => !n.read).forEach(n => markNotificationRead(n.id))
            }}
            className="px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-brand-500"
          >
            <CheckCheck className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-5 pb-32 space-y-5 mt-4">
        {/* Tab Filter */}
        <TabBar
          tabs={[
            { key: 'all', label: 'Todas' },
            { key: 'ai', label: 'IA Insights' },
            { key: 'shared', label: 'Compartilhadas' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {/* Notification Groups */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {grouped.today.length > 0 && (
              <NotificationGroup label="Hoje" notifications={grouped.today} onClick={handleNotificationClick} />
            )}

            {grouped.yesterday.length > 0 && (
              <NotificationGroup label="Ontem" notifications={grouped.yesterday} onClick={handleNotificationClick} />
            )}

            {grouped.older.length > 0 && (
              <NotificationGroup label="Anteriores" notifications={grouped.older} onClick={handleNotificationClick} />
            )}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Bell className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Nenhuma notifica\u00e7\u00e3o</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Voc\u00ea est\u00e1 em dia!</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function NotificationGroup({ label, notifications, onClick }) {
  return (
    <div>
      <SectionHeader title={label} />
      <div className="space-y-2">
        {notifications.map((notification, idx) => (
          <NotificationItem key={notification.id} notification={notification} onClick={onClick} index={idx} />
        ))}
      </div>
    </div>
  )
}

function NotificationItem({ notification, onClick, index }) {
  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.ai_alert
  const Icon = config.icon
  const isUnread = !notification.read

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
    >
      <button
        onClick={() => onClick(notification)}
        className={`w-full text-left rounded-2xl p-4 transition-all ${
          isUnread
            ? 'bg-white dark:bg-slate-800 border-l-[3px] border-l-brand-500 border border-slate-100 dark:border-slate-700/50 shadow-sm'
            : 'bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/30'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
            <Icon className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-semibold truncate ${isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                {notification.title}
              </p>
              {isUnread && <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
              {notification.message}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
              {formatRelative(notification.createdAt)}
            </p>
          </div>

          {/* Read indicator */}
          {!isUnread && (
            <CheckCheck className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mt-1" />
          )}
        </div>
      </button>
    </motion.div>
  )
}
