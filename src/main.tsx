import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { requestPersistentStorage } from './db/persist'
import './index.css'
// Registers the service worker and starts watching for new builds.
import './lib/pwa'

void requestPersistentStorage()
// Screens restore their own scroll position (App.tsx); the browser's own restore would fight it on back.
history.scrollRestoration = 'manual'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
