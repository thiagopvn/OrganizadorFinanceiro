import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  arrayUnion
} from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyD595kVUwdPm5M2g14maDSpJZxlJwFSKUA",
  authDomain: "organizador-financeiro-a431c.firebaseapp.com",
  projectId: "organizador-financeiro-a431c",
  storageBucket: "organizador-financeiro-a431c.firebasestorage.app",
  messagingSenderId: "63875610641",
  appId: "1:63875610641:web:9105e8f4ff77cc4bb719b0",
  measurementId: "G-MQ2FD1LG1L"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Auth helpers
export const signIn = (email, password) =>
  signInWithEmailAndPassword(auth, email, password)

export const signUp = async (email, password, displayName) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  await setDoc(doc(db, 'users', cred.user.uid), {
    email,
    displayName,
    photoURL: null,
    coupleId: null,
    monthlyIncome: 0,
    createdAt: serverTimestamp(),
    settings: {
      darkMode: false,
      privacyMode: false,
      faceIdEnabled: false,
      language: 'pt-BR'
    }
  })
  return cred
}

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider()
  const cred = await signInWithPopup(auth, provider)
  const userDoc = await getDoc(doc(db, 'users', cred.user.uid))
  if (!userDoc.exists()) {
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: cred.user.email,
      displayName: cred.user.displayName,
      photoURL: cred.user.photoURL,
      coupleId: null,
      monthlyIncome: 0,
      createdAt: serverTimestamp(),
      settings: {
        darkMode: false,
        privacyMode: false,
        faceIdEnabled: false,
        language: 'pt-BR'
      }
    })
  }
  return cred
}

export const signOutUser = () => firebaseSignOut(auth)

// ─── Couple management ───────────────────────────────────────────────

// Create a new couple for a user
export const createCouple = async (userId) => {
  const coupleRef = await addDoc(collection(db, 'couples'), {
    partnerIds: [userId],
    createdAt: serverTimestamp(),
    splitRule: 'equal',
    splitRatio: { [userId]: 50 },
    travelMode: { active: false, currency: 'EUR', budget: 0, destination: '' },
    settings: {}
  })
  await updateDoc(doc(db, 'users', userId), { coupleId: coupleRef.id })
  return coupleRef.id
}

// Join an existing couple using the couple code
// Handles: self-join (noop), duplicate cleanup, already full
export const joinCouple = async (coupleId, userId) => {
  const coupleRef = doc(db, 'couples', coupleId)
  const coupleSnap = await getDoc(coupleRef)
  if (!coupleSnap.exists()) throw new Error('Casal não encontrado')
  const data = coupleSnap.data()

  // Deduplicate partnerIds if corrupted
  const uniqueIds = [...new Set(data.partnerIds || [])]

  // If user is already in this couple — nothing to do
  if (uniqueIds.includes(userId)) {
    // Just ensure user doc points to this couple
    await updateDoc(doc(db, 'users', userId), { coupleId })
    return
  }

  // Couple is full (2 different people)
  if (uniqueIds.length >= 2) throw new Error('Este casal já está completo')

  // Add user to the couple
  await updateDoc(coupleRef, {
    partnerIds: arrayUnion(userId),
    [`splitRatio.${userId}`]: 50
  })

  // Point user doc to this couple
  await updateDoc(doc(db, 'users', userId), { coupleId })
}

// Resolve a valid coupleId for the user (find existing or create new)
export const resolveCouple = async (userId) => {
  // 1. Check user doc for existing coupleId
  const userSnap = await getDoc(doc(db, 'users', userId))
  const savedCoupleId = userSnap.exists() ? userSnap.data().coupleId : null

  // 2. If there's a saved coupleId, validate it exists
  if (savedCoupleId) {
    const coupleSnap = await getDoc(doc(db, 'couples', savedCoupleId))
    if (coupleSnap.exists()) {
      // Ensure user is in partnerIds
      const partnerIds = coupleSnap.data().partnerIds || []
      if (!partnerIds.includes(userId)) {
        if (partnerIds.length < 2) {
          await updateDoc(doc(db, 'couples', savedCoupleId), {
            partnerIds: arrayUnion(userId),
            [`splitRatio.${userId}`]: 50
          })
        }
      }
      return savedCoupleId
    }
    // Couple was deleted — clear stale reference
    await updateDoc(doc(db, 'users', userId), { coupleId: null })
  }

  // 3. Search for any couple that already has this user
  const q = query(
    collection(db, 'couples'),
    where('partnerIds', 'array-contains', userId)
  )
  const snap = await getDocs(q)
  if (!snap.empty) {
    const foundId = snap.docs[0].id
    await updateDoc(doc(db, 'users', userId), { coupleId: foundId })
    return foundId
  }

  // 4. No couple found — create a new one
  return await createCouple(userId)
}

// ─── Transaction helpers ─────────────────────────────────────────────

export const addTransaction = (coupleId, data) =>
  addDoc(collection(db, 'couples', coupleId, 'transactions'), {
    ...data,
    createdAt: serverTimestamp(),
    status: 'synced'
  })

export const updateTransaction = (coupleId, transactionId, data) =>
  updateDoc(doc(db, 'couples', coupleId, 'transactions', transactionId), data)

export const deleteTransaction = (coupleId, transactionId) =>
  deleteDoc(doc(db, 'couples', coupleId, 'transactions', transactionId))

// Batch import transactions (up to 500 per batch — Firestore limit)
export const importTransactionsBatch = async (coupleId, transactions) => {
  const results = { success: 0, errors: 0 }
  const BATCH_SIZE = 400 // stay under Firestore 500 limit

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    const chunk = transactions.slice(i, i + BATCH_SIZE)

    for (const tx of chunk) {
      const docRef = doc(collection(db, 'couples', coupleId, 'transactions'))
      batch.set(docRef, {
        ...tx,
        createdAt: serverTimestamp(),
        status: 'synced',
        source: 'ofx_import'
      })
    }

    try {
      await batch.commit()
      results.success += chunk.length
    } catch (err) {
      console.error('Batch import error:', err)
      results.errors += chunk.length
    }
  }

  return results
}

// Check for duplicate transactions by fitId
export const checkDuplicateFitIds = async (coupleId, fitIds) => {
  const existing = new Set()
  const txRef = collection(db, 'couples', coupleId, 'transactions')

  // Query transactions that have a fitId field
  const q = query(txRef, where('fitId', 'in', fitIds.slice(0, 30))) // Firestore 'in' limit is 30
  try {
    const snap = await getDocs(q)
    snap.docs.forEach(d => {
      const data = d.data()
      if (data.fitId) existing.add(data.fitId)
    })
  } catch (e) {
    // If query fails (e.g., index not created), we proceed without duplicate check
    console.warn('Duplicate check skipped:', e)
  }

  return existing
}

// ─── Budget helpers ──────────────────────────────────────────────────

export const addBudget = (coupleId, data) =>
  addDoc(collection(db, 'couples', coupleId, 'budgets'), {
    ...data,
    spent: 0,
    createdAt: serverTimestamp()
  })

export const updateBudget = (coupleId, budgetId, data) =>
  updateDoc(doc(db, 'couples', coupleId, 'budgets', budgetId), data)

// ─── Goal helpers ────────────────────────────────────────────────────

export const addGoal = (coupleId, data) =>
  addDoc(collection(db, 'couples', coupleId, 'goals'), {
    ...data,
    currentAmount: 0,
    createdAt: serverTimestamp()
  })

export const updateGoal = (coupleId, goalId, data) =>
  updateDoc(doc(db, 'couples', coupleId, 'goals', goalId), data)

export const deleteGoal = (coupleId, goalId) =>
  deleteDoc(doc(db, 'couples', coupleId, 'goals', goalId))

// ─── Subscription helpers ────────────────────────────────────────────

export const addSubscription = (coupleId, data) =>
  addDoc(collection(db, 'couples', coupleId, 'subscriptions'), {
    ...data,
    active: true,
    createdAt: serverTimestamp()
  })

export const deleteSubscription = (coupleId, subscriptionId) =>
  deleteDoc(doc(db, 'couples', coupleId, 'subscriptions', subscriptionId))

// ─── Card helpers ────────────────────────────────────────────────────

export const addCard = (coupleId, data) =>
  addDoc(collection(db, 'couples', coupleId, 'cards'), {
    ...data,
    createdAt: serverTimestamp()
  })

export const deleteCard = (coupleId, cardId) =>
  deleteDoc(doc(db, 'couples', coupleId, 'cards', cardId))

// ─── Investment helpers ──────────────────────────────────────────────

export const addInvestment = (coupleId, data) =>
  addDoc(collection(db, 'couples', coupleId, 'investments'), {
    ...data,
    createdAt: serverTimestamp()
  })

export const deleteInvestment = (coupleId, investmentId) =>
  deleteDoc(doc(db, 'couples', coupleId, 'investments', investmentId))

// ─── Couple settings ─────────────────────────────────────────────────

export const updateCoupleSettings = (coupleId, data) =>
  updateDoc(doc(db, 'couples', coupleId), data)

// ─── Storage helpers ─────────────────────────────────────────────────

export const uploadReceipt = async (coupleId, transactionId, file) => {
  const storageRef = ref(storage, `receipts/${coupleId}/${transactionId}/${file.name}`)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

// ─── Real-time listeners ─────────────────────────────────────────────

export const subscribeToTransactions = (coupleId, callback) => {
  const q = query(
    collection(db, 'couples', coupleId, 'transactions'),
    orderBy('createdAt', 'desc'),
    limit(2000)
  )
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
  }, (err) => {
    console.warn('Listener transactions error:', err)
    callback([])
  })
}

export const subscribeToBudgets = (coupleId, callback) => {
  const q = query(collection(db, 'couples', coupleId, 'budgets'))
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
  }, (err) => {
    console.warn('Listener budgets error:', err)
    callback([])
  })
}

export const subscribeToGoals = (coupleId, callback) => {
  const q = query(collection(db, 'couples', coupleId, 'goals'))
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
  }, (err) => {
    console.warn('Listener goals error:', err)
    callback([])
  })
}

export const subscribeToSubscriptions = (coupleId, callback) => {
  const q = query(collection(db, 'couples', coupleId, 'subscriptions'))
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
  }, (err) => {
    console.warn('Listener subscriptions error:', err)
    callback([])
  })
}

export const subscribeToSettlements = (coupleId, callback) => {
  const q = query(
    collection(db, 'couples', coupleId, 'settlements'),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
  }, (err) => {
    console.warn('Listener settlements error:', err)
    callback([])
  })
}

export const subscribeToCards = (coupleId, callback) => {
  const q = query(collection(db, 'couples', coupleId, 'cards'))
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
  }, (err) => {
    console.warn('Listener cards error:', err)
    callback([])
  })
}

export const subscribeToInvestments = (coupleId, callback) => {
  const q = query(collection(db, 'couples', coupleId, 'investments'))
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
  }, (err) => {
    console.warn('Listener investments error:', err)
    callback([])
  })
}

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback)

export {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query,
  where, orderBy, onSnapshot, serverTimestamp, Timestamp, writeBatch, arrayUnion
}
