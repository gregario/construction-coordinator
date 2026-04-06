'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker on mount.
 * Renders nothing — drop into any layout to activate.
 * Fails silently if the browser doesn't support service workers.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err)
    })
  }, [])

  return null
}
