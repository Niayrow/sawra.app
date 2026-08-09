import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { precacheAppShellInBackground } from './utils/appShellPrecache'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Defer analytics so they never block first paint
if (import.meta.env.PROD) {
  const loadInsights = () => {
    void import('@vercel/analytics/react').then(({ Analytics }) => {
      const mount = document.createElement('div')
      mount.setAttribute('data-analytics', '')
      document.body.appendChild(mount)
      createRoot(mount).render(<Analytics />)
    })
    void import('@vercel/speed-insights/react').then(({ SpeedInsights }) => {
      const mount = document.createElement('div')
      mount.setAttribute('data-speed-insights', '')
      document.body.appendChild(mount)
      createRoot(mount).render(<SpeedInsights />)
    })
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(loadInsights, { timeout: 4000 })
  } else {
    setTimeout(loadInsights, 2000)
  }
}

// Register PWA Service Worker for offline launch capability
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        // A failed update (stale/broken worker) must not surface as an uncaught rejection
        void registration.update().catch(() => undefined);
        precacheAppShellInBackground();
      })
      .catch(() => {
        // The app remains usable when service worker registration is blocked.
      });
  });
}
