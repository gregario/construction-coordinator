// Pure helpers for push notification subscription management.
// All browser API interactions are injected as parameters for testability.

export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

export interface PushCapability {
  supported: boolean
  permissionState: PushPermissionState
  canPrompt: boolean
  isBlocked: boolean
}

/** Determine push notification capability from browser state. */
export function detectPushCapability(
  hasServiceWorker: boolean,
  hasPushManager: boolean,
  notificationPermission: NotificationPermission | null,
): PushCapability {
  if (!hasServiceWorker || !hasPushManager) {
    return { supported: false, permissionState: 'unsupported', canPrompt: false, isBlocked: false }
  }

  const permissionState: PushPermissionState = notificationPermission ?? 'unsupported'

  return {
    supported: true,
    permissionState,
    canPrompt: permissionState === 'default',
    isBlocked: permissionState === 'denied',
  }
}

export type ToggleLabel = 'Enable Notifications' | 'Disable Notifications' | 'Notifications Blocked' | 'Not Supported'

export interface ToggleState {
  label: ToggleLabel
  enabled: boolean
  disabled: boolean
  showBlockedHint: boolean
}

/** Derive the toggle UI state from capability + active subscription. */
export function deriveToggleState(
  capability: PushCapability,
  hasActiveSubscription: boolean,
): ToggleState {
  if (!capability.supported) {
    return { label: 'Not Supported', enabled: false, disabled: true, showBlockedHint: false }
  }

  if (capability.isBlocked) {
    return { label: 'Notifications Blocked', enabled: false, disabled: true, showBlockedHint: true }
  }

  if (hasActiveSubscription) {
    return { label: 'Disable Notifications', enabled: true, disabled: false, showBlockedHint: false }
  }

  return { label: 'Enable Notifications', enabled: false, disabled: false, showBlockedHint: false }
}

/**
 * Convert a browser PushSubscription to the payload shape our /api/push/subscribe expects.
 * Returns null if the subscription is missing required keys.
 */
export function serializeSubscription(
  sub: { endpoint: string; toJSON: () => { keys?: { p256dh?: string; auth?: string } } },
): { endpoint: string; keys: { p256dh: string; auth: string } } | null {
  const json = sub.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth

  if (!p256dh || !auth) return null

  return { endpoint: sub.endpoint, keys: { p256dh, auth } }
}

/**
 * Convert a base64-encoded VAPID public key to a Uint8Array
 * suitable for applicationServerKey in PushManager.subscribe().
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
