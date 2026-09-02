import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/gabarito'
import '@fontsource-variable/nunito-sans'
import App from './App'
import { registerAppServiceWorker } from './pwa-update'
import './styles.css'

registerAppServiceWorker()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
