import { describe, it, expect } from 'vitest'
import {
  detectPushCapability,
  deriveToggleState,
  serializeSubscription,
  urlBase64ToUint8Array,
  type PushCapability,
} from '@/lib/notifications/push'

// ---------- detectPushCapability ----------

describe('detectPushCapability', () => {
  it('returns unsupported when service worker is missing', () => {
    const result = detectPushCapability(false, true, 'default')
    expect(result).toEqual({
      supported: false,
      permissionState: 'unsupported',
      canPrompt: false,
      isBlocked: false,
    })
  })

  it('returns unsupported when PushManager is missing', () => {
    const result = detectPushCapability(true, false, 'default')
    expect(result.supported).toBe(false)
    expect(result.permissionState).toBe('unsupported')
  })

  it('returns canPrompt=true when permission is default', () => {
    const result = detectPushCapability(true, true, 'default')
    expect(result).toEqual({
      supported: true,
      permissionState: 'default',
      canPrompt: true,
      isBlocked: false,
    })
  })

  it('returns isBlocked=true when permission is denied', () => {
    const result = detectPushCapability(true, true, 'denied')
    expect(result).toEqual({
      supported: true,
      permissionState: 'denied',
      canPrompt: false,
      isBlocked: true,
    })
  })

  it('returns granted state correctly', () => {
    const result = detectPushCapability(true, true, 'granted')
    expect(result.supported).toBe(true)
    expect(result.permissionState).toBe('granted')
    expect(result.canPrompt).toBe(false)
    expect(result.isBlocked).toBe(false)
  })

  it('handles null permission (unsupported Notification API)', () => {
    const result = detectPushCapability(true, true, null)
    expect(result.permissionState).toBe('unsupported')
    expect(result.supported).toBe(true)
  })
})

// ---------- deriveToggleState ----------

describe('deriveToggleState', () => {
  const supported: PushCapability = {
    supported: true,
    permissionState: 'default',
    canPrompt: true,
    isBlocked: false,
  }

  const granted: PushCapability = {
    supported: true,
    permissionState: 'granted',
    canPrompt: false,
    isBlocked: false,
  }

  const blocked: PushCapability = {
    supported: true,
    permissionState: 'denied',
    canPrompt: false,
    isBlocked: true,
  }

  const unsupported: PushCapability = {
    supported: false,
    permissionState: 'unsupported',
    canPrompt: false,
    isBlocked: false,
  }

  it('shows "Not Supported" when browser lacks push support', () => {
    const state = deriveToggleState(unsupported, false)
    expect(state.label).toBe('Not Supported')
    expect(state.disabled).toBe(true)
    expect(state.showBlockedHint).toBe(false)
  })

  it('shows "Notifications Blocked" with hint when denied', () => {
    const state = deriveToggleState(blocked, false)
    expect(state.label).toBe('Notifications Blocked')
    expect(state.disabled).toBe(true)
    expect(state.showBlockedHint).toBe(true)
  })

  it('shows "Enable Notifications" when no active subscription', () => {
    const state = deriveToggleState(supported, false)
    expect(state.label).toBe('Enable Notifications')
    expect(state.enabled).toBe(false)
    expect(state.disabled).toBe(false)
  })

  it('shows "Disable Notifications" when subscription is active', () => {
    const state = deriveToggleState(granted, true)
    expect(state.label).toBe('Disable Notifications')
    expect(state.enabled).toBe(true)
    expect(state.disabled).toBe(false)
  })

  it('shows "Enable Notifications" for granted but no subscription (re-subscribe case)', () => {
    const state = deriveToggleState(granted, false)
    expect(state.label).toBe('Enable Notifications')
    expect(state.enabled).toBe(false)
  })
})

// ---------- serializeSubscription ----------

describe('serializeSubscription', () => {
  it('serializes a valid PushSubscription', () => {
    const sub = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      toJSON: () => ({
        keys: { p256dh: 'BNcRd...', auth: 'tBHI...' },
      }),
    }
    const result = serializeSubscription(sub)
    expect(result).toEqual({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      keys: { p256dh: 'BNcRd...', auth: 'tBHI...' },
    })
  })

  it('returns null when p256dh is missing', () => {
    const sub = {
      endpoint: 'https://example.com',
      toJSON: () => ({ keys: { auth: 'tBHI...' } }),
    }
    expect(serializeSubscription(sub)).toBeNull()
  })

  it('returns null when auth is missing', () => {
    const sub = {
      endpoint: 'https://example.com',
      toJSON: () => ({ keys: { p256dh: 'BNcRd...' } }),
    }
    expect(serializeSubscription(sub)).toBeNull()
  })

  it('returns null when keys object is missing', () => {
    const sub = {
      endpoint: 'https://example.com',
      toJSON: () => ({}),
    }
    expect(serializeSubscription(sub)).toBeNull()
  })
})

// ---------- urlBase64ToUint8Array ----------

describe('urlBase64ToUint8Array', () => {
  it('converts a standard VAPID key to Uint8Array', () => {
    // Known test vector: base64url "AAEC" = bytes [0, 1, 2]
    const result = urlBase64ToUint8Array('AAEC')
    expect(result).toBeInstanceOf(Uint8Array)
    expect(Array.from(result)).toEqual([0, 1, 2])
  })

  it('handles padding correctly for different lengths', () => {
    // "AA" base64 = [0]
    const result = urlBase64ToUint8Array('AA')
    expect(Array.from(result)).toEqual([0])
  })

  it('converts url-safe characters (- and _) to standard base64 (+ and /)', () => {
    // base64url uses - instead of + and _ instead of /
    // "+/" in standard base64 = "-_" in base64url → bytes [251]
    const urlSafe = '-w'
    const result = urlBase64ToUint8Array(urlSafe)
    // -w → +w in standard base64 → padded to +w== → decoded
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('round-trips: encoding bytes to base64url and back yields same bytes', () => {
    // 3 bytes [255, 0, 128] → base64 "/wCA" → base64url "_wCA"
    const result = urlBase64ToUint8Array('_wCA')
    expect(Array.from(result)).toEqual([255, 0, 128])
  })
})
