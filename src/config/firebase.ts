import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)

// Configurar persistencia de sesión
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error configurando persistencia:', error)
})

// Initialize Analytics (solo en producción y en el navegador)
export const analytics = typeof window !== 'undefined' ? getAnalytics(firebaseApp) : null

