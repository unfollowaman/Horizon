import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/playfair-display/index.css'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import RootFallback from './components/RootFallback'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={<RootFallback />}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
