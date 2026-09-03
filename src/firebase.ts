import { getApp, getApps, initializeApp } from 'firebase/app'
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyBUWWOFNYFJ2o6B3wWdJXL10X7h34Ao728',
  authDomain: 'brabita-6e0ea.firebaseapp.com',
  projectId: 'brabita-6e0ea',
  storageBucket: 'brabita-6e0ea.firebasestorage.app',
  messagingSenderId: '909221865486',
  appId: '1:909221865486:web:13dc836f1d911fb2a6345f',
}

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(firebaseApp)
auth.languageCode = 'pt-BR'

export const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch(() => {
  // O Firebase ainda tenta restaurar a sessão padrão; a interface tratará a falha no login.
})
