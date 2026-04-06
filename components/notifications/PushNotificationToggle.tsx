'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  detectPushCapability,
  deriveToggleState,
  serializeSubscription,
  urlBase64ToUint8Array,
  type PushCapability,
} from '@/lib/notifications/push'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

/**
 * Toggle for enabling/disabling push notifications.
 * Handles browser permission, PushManager subscribe/unsubscribe,
 * and persists the subscription to /api/push/subscribe.
 */
export function PushNotificationToggle() {
  const [capability, setCapability] = useState<PushCapability>({
    supported: false,
    permissionState: 'unsupported',
    canPrompt: false,
    isBlocked: false,
  })
  const [hasSubscription, setHasSubscription] = useState(false)
  const [loading, setLoading] = useState(true)

  // Detect capability and existing subscription on mount
  useEffect(() => {
    async function detect() {
      const hasSW = 'serviceWorker' in navigator
      const hasPush = 'PushManager' in window
      const permission = 'Notification' in window ? Notification.permission : null

      const cap = detectPushCapability(hasSW, hasPush, permission)
      setCapability(cap)

      if (cap.supported && cap.permissionState === 'granted') {
        try {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.getSubscription()
          setHasSubscription(sub !== null)
        } catch {
          // SW not ready yet — no subscription
        }
      }

      setLoading(false)
    }

    detect()
  }, [])

  const handleToggle = useCallback(async () => {
    setLoading(true)
    try {
      if (hasSubscription) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
        }
        setHasSubscription(false)
      } else {
        // Subscribe: request permission if needed, then subscribe
        if (capability.canPrompt) {
          const result = await Notification.requestPermission()
          const newCap = detectPushCapability(true, true, result)
          setCapability(newCap)
          if (newCap.isBlocked) {
            setLoading(false)
            return
          }
        }

        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })

        const payload = serializeSubscription(sub)
        if (payload) {
          const res = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (res.ok) {
            setHasSubscription(true)
          }
        }
      }
    } catch (err) {
      console.error('Push toggle error:', err)
    } finally {
      setLoading(false)
    }
  }, [hasSubscription, capability])

  const toggleState = deriveToggleState(capability, hasSubscription)

  if (loading) {
    return (
      <div className="flex items-center justify-between py-3">
        <span className="text-sm text-[#6B5D52]">Push Notifications</span>
        <div className="h-6 w-12 bg-[#E8DFD3] rounded-full animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between py-3">
        <span className="text-sm text-[#2B1F17] font-medium">Push Notifications</span>
        <button
          type="button"
          role="switch"
          aria-checked={toggleState.enabled}
          disabled={toggleState.disabled || loading}
          onClick={handleToggle}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5E3C]
            ${toggleState.enabled ? 'bg-[#87A96B]' : 'bg-[#D4C5B5]'}
            ${toggleState.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
              ${toggleState.enabled ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
      {toggleState.showBlockedHint && (
        <p className="text-xs text-[#B8860B]">
          Notifications are blocked by your browser. To enable them, open your browser settings
          and allow notifications for this site.
        </p>
      )}
      {!toggleState.disabled && (
        <p className="text-xs text-[#6B5D52]">
          {toggleState.enabled
            ? 'You\u2019ll receive alerts for upcoming material orders and overdue tasks.'
            : 'Get daily alerts about your build schedule.'}
        </p>
      )}
      {toggleState.label === 'Not Supported' && (
        <p className="text-xs text-[#6B5D52]">
          Push notifications are not supported in this browser.
        </p>
      )}
    </div>
  )
}
