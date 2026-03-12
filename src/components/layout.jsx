import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Home, Clock, BarChart3, User, Plus, Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../lib/store'
import { OfflineBanner } from './ui'

// Main app layout with bottom navigation
export function AppLayout() {
  const { isOffline, showAddTransaction, setShowAddTransaction, notifications } = useStore()
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto relative bg-orange-50/50 dark:bg-slate-900">
      <AnimatePresence>
        {isOffline && <OfflineBanner />}
      </AnimatePresence>

      <main className="flex-1 overflow-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-700/50 safe-bottom z-40">
        <div className="flex items-center justify-around px-2 pt-2 pb-2">
          <NavTab to="/app/home" icon={Home} label="Início" />
          <NavTab to="/app/history" icon={Clock} label="Histórico" />

          {/* FAB */}
          <div className="relative -mt-8">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowAddTransaction(true)}
              className="w-14 h-14 rounded-full gradient-brand shadow-lg shadow-brand-500/30 flex items-center justify-center text-white"
            >
              <Plus className="w-7 h-7" strokeWidth={2.5} />
            </motion.button>
          </div>

          <NavTab to="/app/analytics" icon={BarChart3} label="Análises" />
          <NavTab to="/app/profile" icon={User} label="Perfil" badge={unreadCount} />
        </div>
      </nav>
    </div>
  )
}

function NavTab({ to, icon: Icon, label, badge }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-3 py-1 relative transition-colors ${
          isActive ? 'text-brand-500' : 'text-slate-400 dark:text-slate-500'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
          <span className="text-[10px] font-medium">{label}</span>
          {badge > 0 && (
            <span className="absolute -top-0.5 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

// Header component for sub-pages
export function PageHeader({ title, onBack, actions }) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 glass border-b border-slate-200/50 dark:border-slate-700/50">
      <div className="flex items-center justify-between px-4 py-3">
        {onBack !== false && (
          <button
            onClick={onBack || (() => navigate(-1))}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="text-lg font-bold text-slate-800 dark:text-white flex-1 text-center">{title}</h1>
        <div className="flex items-center gap-1">
          {actions || <div className="w-10" />}
        </div>
      </div>
    </header>
  )
}

// Page transition wrapper
export function PageTransition({ children }) {
  const location = useLocation()

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )
}
