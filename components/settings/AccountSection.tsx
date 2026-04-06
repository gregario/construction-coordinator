'use client'

import { useState, useTransition } from 'react'
import { signOut } from '@/app/actions/auth'

interface AccountSectionProps {
  email: string
}

export function AccountSection({ email }: AccountSectionProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleChangePassword() {
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    startTransition(async () => {
      const { changePassword } = await import('@/app/actions/auth')
      const result = await changePassword(newPassword)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError(null)
      setSuccess(true)
      setShowPasswordForm(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-medium text-[#6B5D52] mb-1">Email</h3>
        <p className="text-sm text-[#2B1F17]">{email}</p>
      </div>

      {showPasswordForm ? (
        <div className="space-y-3 rounded-lg bg-[#FAF7F2] p-3">
          <label className="block text-xs font-medium text-[#2B1F17]">
            New Password
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoFocus
              minLength={8}
              className="mt-1 w-full rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-[#2B1F17]">
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-sm"
            />
          </label>
          {error && <p role="alert" className="text-xs text-[#B85450]">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={pending}
              className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A2A1E] disabled:opacity-50"
            >
              {pending ? 'Updating…' : 'Update Password'}
            </button>
            <button
              type="button"
              onClick={() => { setShowPasswordForm(false); setError(null) }}
              className="rounded-md border border-[#E8DFD3] bg-white px-3 py-1.5 text-xs font-medium text-[#2B1F17] hover:bg-[#FAF7F2]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPasswordForm(true)}
            className="rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-xs font-medium text-[#2B1F17] hover:bg-[#FAF7F2]"
          >
            Change Password
          </button>
          {success && <span className="text-xs text-[#5A8050]">Password updated</span>}
        </div>
      )}

      <div className="pt-3 border-t border-[#E8DFD3]">
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-[#B85450]/30 bg-white px-3 py-2 text-xs font-medium text-[#B85450] hover:bg-[#B85450]/5"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}
