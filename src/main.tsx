import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Self-hosted fonts (offline-friendly PWA — no font CDN).
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import '@fontsource/press-start-2p/400.css'

import './theme/tokens.css'
import './index.css'
import './components/ui.css'
import './app/app.css'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
