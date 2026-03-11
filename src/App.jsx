import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import useStore from './lib/store'
import { onAuthChange, db, doc, getDoc } from './lib/firebase'
import { AppLayout } from './components/layout'

// Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/home/Dashboard'
import History from './pages/history/History'
import Analytics from './pages/analytics/Analytics'
import Budgets from './pages/budgets/Budgets'
import EditGoal from './pages/budgets/EditGoal'
import Profile from './pages/profile/Profile'
import Privacy from './pages/profile/Privacy'
import TransactionDetail from './pages/transactions/TransactionDetail'
import AddTransaction from './pages/transactions/AddTransaction'
import Split from './pages/split/Split'
import SplitConfig from './pages/split/SplitConfig'
import Settlement from './pages/split/Settlement'
import Cards from './pages/cards/Cards'
import Investments from './pages/investments/Investments'
import TravelMode from './pages/travel/TravelMode'
import Notifications from './pages/notifications/Notifications'
import Export from './pages/export/Export'
import Wrapped from './pages/wrapped/Wrapped'

// Modals
import { BottomSheet, Modal } from './components/ui'
import { SuccessModal, AchievementModal } from './pages/modals/Modals'

export default function App() {
  const {
    user, setUser, setUserProfile, setIsLoading, isLoading, initTheme,
    showAddTransaction, setShowAddTransaction,
    showSuccess, setShowSuccess,
    showAchievement, setShowAchievement,
    isDemo, setIsDemo
  } = useStore()

  useEffect(() => {
    initTheme()

    // Listen for online/offline
    const handleOnline = () => useStore.getState().setIsOffline(false)
    const handleOffline = () => useStore.getState().setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Auth listener
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        setIsDemo(false)
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            setUserProfile(userDoc.data())
          }
        } catch (e) {
          console.warn('Erro ao carregar perfil:', e)
        }
      } else {
        setUser(null)
        setUserProfile(null)
        setIsDemo(true)
      }
      setIsLoading(false)
    })

    return () => {
      unsub()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-orange-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-500/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* App routes */}
        <Route path="/app" element={<AppLayout />}>
          <Route path="home" element={<Dashboard />} />
          <Route path="history" element={<History />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="budgets/new" element={<EditGoal />} />
          <Route path="budgets/:id" element={<EditGoal />} />
          <Route path="profile" element={<Profile />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="transaction/:id" element={<TransactionDetail />} />
          <Route path="split" element={<Split />} />
          <Route path="split/config" element={<SplitConfig />} />
          <Route path="split/settle" element={<Settlement />} />
          <Route path="cards" element={<Cards />} />
          <Route path="investments" element={<Investments />} />
          <Route path="travel" element={<TravelMode />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="export" element={<Export />} />
          <Route path="wrapped" element={<Wrapped />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/app/home" replace />} />
      </Routes>

      {/* Global Add Transaction Bottom Sheet */}
      <BottomSheet
        isOpen={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
        title="Nova Transação"
      >
        <AddTransaction onClose={() => setShowAddTransaction(false)} />
      </BottomSheet>

      {/* Success Modal */}
      <SuccessModal
        data={showSuccess}
        onClose={() => setShowSuccess(null)}
      />

      {/* Achievement Modal */}
      <AchievementModal
        data={showAchievement}
        onClose={() => setShowAchievement(null)}
      />
    </>
  )
}
