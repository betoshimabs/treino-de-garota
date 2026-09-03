import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/gabarito'
import '@fontsource-variable/nunito-sans'
import App from './App'
import { AuthGate, AuthProvider } from './auth'
import { registerAppServiceWorker } from './pwa-update'
import { startInstallPromptCapture } from './pwa-install'
import './styles.css'

startInstallPromptCapture()
registerAppServiceWorker()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </AuthProvider>
  </React.StrictMode>,
)
