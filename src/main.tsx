import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Self-hosted fonts (offline-friendly PWA — no font CDN).
import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'
import '@fontsource/press-start-2p/400.css'

import './theme/tokens.css'
import './index.css'
import './components/ui.css'
import './app/app.css'
import './theme/retro.css'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register the service worker for offline support (production only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {})
  })
}

// Ask the browser to keep our IndexedDB data durable (not evicted under
// storage pressure). Best-effort; harmless if unsupported or denied.
if (navigator.storage?.persist) {
  navigator.storage
    .persisted()
    .then((already) => {
      if (!already) return navigator.storage.persist()
      return true
    })
    .catch(() => {})
}
