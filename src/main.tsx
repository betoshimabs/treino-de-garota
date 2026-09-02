import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/gabarito'
import '@fontsource-variable/nunito-sans'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles.css'

registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('tg:update-ready'))
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
