'use client'

import { useState, useTransition } from 'react'
import {
  togglePreference,
  updateWarningDays,
  validateWarningDays,
  PREFERENCE_LABELS,
  WARNING_DAYS_MIN,
  WARNING_DAYS_MAX,
  type NotificationPrefs,
  type PreferenceKey,
} from '@/lib/notifications/preferences'
import {
  toggleNotificationPreference,
  updateOrderWarningDays,
} from '@/app/actions/notifications'

interface Props {
  initialPrefs: NotificationPrefs
}

export function NotificationPreferencesPanel({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle(key: PreferenceKey) {
    const optimistic = togglePreference(prefs, key)
    setPrefs(optimistic)
    setError(null)

    startTransition(async () => {
      const result = await toggleNotificationPreference(key)
      if (!result.ok) {
        // Rollback
        setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
        setError(result.error ?? 'Failed to update preference')
      }
    })
  }

  function handleWarningDaysChange(newDays: number) {
    const validation = validateWarningDays(newDays)
    if (!validation.ok) return

    const previousDays = prefs.order_warning_days
    const optimistic = updateWarningDays(prefs, newDays)
    setPrefs(optimistic)
    setError(null)

    startTransition(async () => {
      const result = await updateOrderWarningDays(newDays)
      if (!result.ok) {
        setPrefs(prev => ({ ...prev, order_warning_days: previousDays }))
        setError(result.error ?? 'Failed to update warning days')
      }
    })
  }

  const prefKeys = Object.keys(PREFERENCE_LABELS) as PreferenceKey[]

  return (
    <div className="divide-y divide-[#F0EBE4]">
      {prefKeys.map(key => (
        <div key={key} className="flex items-center justify-between py-3">
          <div>
            <span className="text-sm text-[#2B1F17]">{PREFERENCE_LABELS[key].title}</span>
            <p className="text-xs text-[#6B5D52]">
              {key === 'order_deadlines'
                ? `Alert ${prefs.order_warning_days} day${prefs.order_warning_days === 1 ? '' : 's'} before order-by date`
                : PREFERENCE_LABELS[key].description}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs[key]}
            aria-label={PREFERENCE_LABELS[key].title}
            disabled={pending}
            onClick={() => handleToggle(key)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5E3C]
              ${prefs[key] ? 'bg-[#87A96B]' : 'bg-[#D4C5B5]'}
              ${pending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
                ${prefs[key] ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      ))}

      {/* Order warning days stepper */}
      <div className="flex items-center justify-between py-3">
        <div>
          <span className="text-sm text-[#2B1F17]">Warning lead time</span>
          <p className="text-xs text-[#6B5D52]">Days before order-by date to alert</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease warning days"
            disabled={pending || prefs.order_warning_days <= WARNING_DAYS_MIN}
            onClick={() => handleWarningDaysChange(prefs.order_warning_days - 1)}
            className={`
              w-7 h-7 rounded-md border text-sm font-medium transition-colors
              ${prefs.order_warning_days <= WARNING_DAYS_MIN || pending
                ? 'border-[#E8DFD3] text-[#D4C5B5] cursor-not-allowed'
                : 'border-[#D4C5B5] text-[#2B1F17] hover:bg-[#F5F0EA] cursor-pointer'}
            `}
          >
            -
          </button>
          <span
            className="w-8 text-center text-sm font-semibold text-[#2B1F17] tabular-nums"
            data-testid="warning-days-value"
          >
            {prefs.order_warning_days}
          </span>
          <button
            type="button"
            aria-label="Increase warning days"
            disabled={pending || prefs.order_warning_days >= WARNING_DAYS_MAX}
            onClick={() => handleWarningDaysChange(prefs.order_warning_days + 1)}
            className={`
              w-7 h-7 rounded-md border text-sm font-medium transition-colors
              ${prefs.order_warning_days >= WARNING_DAYS_MAX || pending
                ? 'border-[#E8DFD3] text-[#D4C5B5] cursor-not-allowed'
                : 'border-[#D4C5B5] text-[#2B1F17] hover:bg-[#F5F0EA] cursor-pointer'}
            `}
          >
            +
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 pt-2" role="alert">{error}</p>
      )}
    </div>
  )
}
