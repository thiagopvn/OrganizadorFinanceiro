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
  Timestamp
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

// Couple management
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

export const joinCouple = async (coupleId, userId) => {
  const coupleDoc = await getDoc(doc(db, 'couples', coupleId))
  if (!coupleDoc.exists()) throw new Error('Casal não encontrado')
  const data = coupleDoc.data()
  if (data.partnerIds.length >= 2) throw new Error('Este casal já está completo')
  await updateDoc(doc(db, 'couples', coupleId), {
    partnerIds: [...data.partnerIds, userId],
    splitRatio: { ...data.splitRatio, [userId]: 50 }
  })
  await updateDoc(doc(db, 'users', userId), { coupleId })
}

// Transaction helpers
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

// Budget helpers
export const addBudget = (coupleId, data) =>
  addDoc(collection(db, 'couples', coupleId, 'budgets'), {
    ...data,
    spent: 0,
    createdAt: serverTimestamp()
  })

export const updateBudget = (coupleId, budgetId, data) =>
  updateDoc(doc(db, 'couples', coupleId, 'budgets', budgetId), data)

// Goal helpers
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

// Subscription helpers
export const addSubscription = (coupleId, data) =>
  addDoc(collection(db, 'couples', coupleId, 'subscriptions'), {
    ...data,
    active: true,
    createdAt: serverTimestamp()
  })

// Storage helpers
export const uploadReceipt = async (coupleId, transactionId, file) => {
  const storageRef = ref(storage, `receipts/${coupleId}/${transactionId}/${file.name}`)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

// Real-time listeners
export const subscribeToTransactions = (coupleId, callback) => {
  const q = query(
    collection(db, 'couples', coupleId, 'transactions'),
    orderBy('createdAt', 'desc'),
    limit(100)
  )
  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(transactions)
  })
}

export const subscribeToBudgets = (coupleId, callback) => {
  const q = query(collection(db, 'couples', coupleId, 'budgets'))
  return onSnapshot(q, (snapshot) => {
    const budgets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(budgets)
  })
}

export const subscribeToGoals = (coupleId, callback) => {
  const q = query(collection(db, 'couples', coupleId, 'goals'))
  return onSnapshot(q, (snapshot) => {
    const goals = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(goals)
  })
}

export const subscribeToSubscriptions = (coupleId, callback) => {
  const q = query(collection(db, 'couples', coupleId, 'subscriptions'))
  return onSnapshot(q, (snapshot) => {
    const subs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(subs)
  })
}

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback)

export {
  doc, getDoc, getDocs, setDoc, updateDoc, collection, query,
  where, orderBy, onSnapshot, serverTimestamp, Timestamp, writeBatch
}
