import { useEffect, useRef, useCallback, Component } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useStore from './lib/store'
import {
  onAuthChange, db, doc, getDoc, setDoc, serverTimestamp, onSnapshot,
  collection, query, where, orderBy,
  subscribeToTransactions, subscribeToBudgets, subscribeToGoals, subscribeToSubscriptions,
  subscribeToSettlements, subscribeToCards, subscribeToInvestments,
  subscribeToRecurringTransactions, subscribeToDebts,
  resolveCouple
} from './lib/firebase'
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
import ImportOFX from './pages/import/Import'
import Wrapped from './pages/wrapped/Wrapped'
import RecurringTransactions from './pages/recurring/RecurringTransactions'
import Debts from './pages/debts/Debts'
import MonthlyReport from './pages/reports/MonthlyReport'

// Modals
import { BottomSheet } from './components/ui'
import { SuccessModal, AchievementModal } from './pages/modals/Modals'

// Error Boundary
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-orange-50 dark:bg-slate-900 px-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Algo deu errado</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-brand-500 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 hover:bg-brand-600 transition-colors"
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const {
    user, setUser, setUserProfile, setCoupleId, setCouple, setPartner,
    setTransactions, setBudgets, setGoals, setSubscriptions, setSettlements, setCards, setInvestments, setNotifications,
    setRecurringTransactions, setDebts,
    setIsLoading, isLoading, initTheme, reset,
    showAddTransaction, setShowAddTransaction,
    showSuccess, setShowSuccess,
    showAchievement, setShowAchievement
  } = useStore()

  const unsubsRef = useRef([])

  const cleanupListeners = useCallback(() => {
    unsubsRef.current.forEach(unsub => {
      try { unsub() } catch (e) { /* ignore */ }
    })
    unsubsRef.current = []
  }, [])

  // ─── Main init: get user profile, resolve couple, subscribe to data ───
  const initUserData = useCallback(async (firebaseUser) => {
    cleanupListeners()

    try {
      // 1. Get or create user profile
      const userRef = doc(db, 'users', firebaseUser.uid)
      let userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          coupleId: null,
          monthlyIncome: 0,
          fcmTokens: [],
          createdAt: serverTimestamp(),
          settings: { darkMode: false, privacyMode: false, faceIdEnabled: false, language: 'pt-BR' }
        })
        userSnap = await getDoc(userRef)
      }

      const userProfile = userSnap.data()
      setUserProfile(userProfile)

      // 2. Resolve couple — finds existing valid couple or creates a new one
      //    This single function handles: stale coupleId, deleted couple,
      //    user not in partnerIds, no couple at all
      const coupleId = await resolveCouple(firebaseUser.uid)
      setCoupleId(coupleId)

      // 3. Listen to couple document in real-time
      //    Detects: partner joining, data changes, couple edits
      const unsubCouple = onSnapshot(doc(db, 'couples', coupleId), async (coupleSnap) => {
        if (!coupleSnap.exists()) {
          // Couple was deleted while app is open — re-init
          cleanupListeners()
          const newCoupleId = await resolveCouple(firebaseUser.uid)
          setCoupleId(newCoupleId)
          initUserData(firebaseUser)
          return
        }

        const coupleData = { id: coupleId, ...coupleSnap.data() }
        setCouple(coupleData)

        // Load partner profile if there is one
        const partnerIds = coupleData.partnerIds || []
        const partnerUid = partnerIds.find(id => id !== firebaseUser.uid)

        if (partnerUid) {
          const currentPartner = useStore.getState().partner
          if (!currentPartner || currentPartner.uid !== partnerUid) {
            try {
              const partnerSnap = await getDoc(doc(db, 'users', partnerUid))
              if (partnerSnap.exists()) {
                setPartner({ uid: partnerUid, ...partnerSnap.data() })
              }
            } catch (e) {
              console.warn('Erro ao carregar parceiro:', e)
            }
          }
        } else {
          setPartner(null)
        }
      }, (err) => {
        console.warn('Listener couple error:', err)
      })

      // 4. Subscribe to all subcollections
      const unsubTx = subscribeToTransactions(coupleId, setTransactions)
      const unsubBudgets = subscribeToBudgets(coupleId, setBudgets)
      const unsubGoals = subscribeToGoals(coupleId, setGoals)
      const unsubSubs = subscribeToSubscriptions(coupleId, setSubscriptions)
      const unsubSettlements = subscribeToSettlements(coupleId, setSettlements)
      const unsubCards = subscribeToCards(coupleId, setCards)
      const unsubInvestments = subscribeToInvestments(coupleId, setInvestments)
      const unsubRecurring = subscribeToRecurringTransactions(coupleId, setRecurringTransactions)
      const unsubDebts = subscribeToDebts(coupleId, setDebts)

      // 5. Subscribe to notifications for this user
      const notifQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', firebaseUser.uid),
        orderBy('createdAt', 'desc')
      )
      const unsubNotif = onSnapshot(notifQuery, (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      }, (err) => {
        console.warn('Listener notifications error:', err)
      })

      unsubsRef.current = [unsubCouple, unsubTx, unsubBudgets, unsubGoals, unsubSubs, unsubSettlements, unsubCards, unsubInvestments, unsubRecurring, unsubDebts, unsubNotif]

    } catch (e) {
      console.error('Erro ao inicializar dados do usuário:', e)
      // Even on error, try to show something — the user can still use the app
      // The coupleId will be null and code shows "---", but at least the app loads
    }
  }, [cleanupListeners, setCoupleId, setCouple, setPartner, setUserProfile,
      setTransactions, setBudgets, setGoals, setSubscriptions, setSettlements,
      setCards, setInvestments, setRecurringTransactions, setDebts, setNotifications])

  useEffect(() => {
    initTheme()

    const handleOnline = () => useStore.getState().setIsOffline(false)
    const handleOffline = () => useStore.getState().setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        await initUserData(firebaseUser)
      } else {
        cleanupListeners()
        reset()
      }
      setIsLoading(false)
    })

    return () => {
      unsub()
      cleanupListeners()
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
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/app/home" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/app/home" replace /> : <Register />} />

        <Route path="/app" element={user ? <AppLayout /> : <Navigate to="/login" replace />}>
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
          <Route path="import" element={<ImportOFX />} />
          <Route path="wrapped" element={<Wrapped />} />
          <Route path="recurring" element={<RecurringTransactions />} />
          <Route path="debts" element={<Debts />} />
          <Route path="reports" element={<MonthlyReport />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? "/app/home" : "/login"} replace />} />
      </Routes>

      <BottomSheet
        isOpen={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
        title="Nova Transação"
      >
        <AddTransaction onClose={() => setShowAddTransaction(false)} />
      </BottomSheet>

      <SuccessModal data={showSuccess} onClose={() => setShowSuccess(null)} />
      <AchievementModal data={showAchievement} onClose={() => setShowAchievement(null)} />
    </ErrorBoundary>
  )
}
