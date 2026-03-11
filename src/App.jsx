import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useStore from './lib/store'
import {
  onAuthChange, db, doc, getDoc, setDoc, collection, query, where,
  getDocs, serverTimestamp, onSnapshot, orderBy,
  subscribeToTransactions, subscribeToBudgets, subscribeToGoals, subscribeToSubscriptions,
  subscribeToSettlements, subscribeToCards, subscribeToInvestments,
  createCouple
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
import Wrapped from './pages/wrapped/Wrapped'

// Modals
import { BottomSheet } from './components/ui'
import { SuccessModal, AchievementModal } from './pages/modals/Modals'

export default function App() {
  const {
    user, setUser, setUserProfile, setCoupleId, setCouple, setPartner,
    setTransactions, setBudgets, setGoals, setSubscriptions, setSettlements, setCards, setInvestments, setNotifications,
    setIsLoading, isLoading, initTheme, reset,
    showAddTransaction, setShowAddTransaction,
    showSuccess, setShowSuccess,
    showAchievement, setShowAchievement
  } = useStore()

  const unsubsRef = useRef([])

  // Cleanup all Firestore listeners
  const cleanupListeners = () => {
    unsubsRef.current.forEach(unsub => unsub())
    unsubsRef.current = []
  }

  // Load user profile, find/create couple, subscribe to real-time data
  const initUserData = async (firebaseUser) => {
    cleanupListeners()

    try {
      // 1. Get or create user profile
      const userRef = doc(db, 'users', firebaseUser.uid)
      let userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        // First login — create user document
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

      // 2. Find or create couple
      let coupleId = userProfile.coupleId

      if (!coupleId) {
        // Check if there's already a couple that has this user
        const couplesQuery = query(
          collection(db, 'couples'),
          where('partnerIds', 'array-contains', firebaseUser.uid)
        )
        const couplesSnap = await getDocs(couplesQuery)

        if (!couplesSnap.empty) {
          coupleId = couplesSnap.docs[0].id
        } else {
          // Create a new couple
          coupleId = await createCouple(firebaseUser.uid)
        }

        // Update user with coupleId
        await setDoc(userRef, { coupleId }, { merge: true })
        setUserProfile({ ...userProfile, coupleId })
      }

      setCoupleId(coupleId)

      // 3. Listen to couple document in real-time (detects when partner joins)
      const unsubCouple = onSnapshot(doc(db, 'couples', coupleId), async (coupleSnap) => {
        if (coupleSnap.exists()) {
          const coupleData = { id: coupleId, ...coupleSnap.data() }
          setCouple(coupleData)

          // Load partner profile
          const partnerUid = coupleData.partnerIds?.find(id => id !== firebaseUser.uid)
          if (partnerUid) {
            const currentPartner = useStore.getState().partner
            // Only fetch partner if not loaded or UID changed
            if (!currentPartner || currentPartner.uid !== partnerUid) {
              const partnerSnap = await getDoc(doc(db, 'users', partnerUid))
              if (partnerSnap.exists()) {
                setPartner({ uid: partnerUid, ...partnerSnap.data() })
              }
            }
          }
        }
      })

      // 4. Subscribe to real-time data
      const unsubTx = subscribeToTransactions(coupleId, (txs) => setTransactions(txs))
      const unsubBudgets = subscribeToBudgets(coupleId, (b) => setBudgets(b))
      const unsubGoals = subscribeToGoals(coupleId, (g) => setGoals(g))
      const unsubSubs = subscribeToSubscriptions(coupleId, (s) => setSubscriptions(s))
      const unsubSettlements = subscribeToSettlements(coupleId, (s) => setSettlements(s))
      const unsubCards = subscribeToCards(coupleId, (c) => setCards(c))
      const unsubInvestments = subscribeToInvestments(coupleId, (i) => setInvestments(i))

      // Subscribe to notifications for this user
      const notifQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', firebaseUser.uid),
        orderBy('createdAt', 'desc')
      )
      const unsubNotif = onSnapshot(notifQuery, (snap) => {
        const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setNotifications(notifs)
      }, (err) => {
        console.warn('Erro ao carregar notificações:', err)
      })

      unsubsRef.current = [unsubCouple, unsubTx, unsubBudgets, unsubGoals, unsubSubs, unsubSettlements, unsubCards, unsubInvestments, unsubNotif]

    } catch (e) {
      console.error('Erro ao inicializar dados do usuário:', e)
    }
  }

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
    <>
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
          <Route path="wrapped" element={<Wrapped />} />
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
    </>
  )
}
