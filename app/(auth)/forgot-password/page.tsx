'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-2xl border border-[#E8DFD3] p-6 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#E8DFD3] flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5E3C" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-[#2B1F17] mb-1">Check your email</h2>
          <p className="text-sm text-[#6B5D52]">
            We sent a password reset link to <strong>{email}</strong>
          </p>
        </div>
        <p className="text-center text-sm text-[#6B5D52] mt-4">
          <Link href="/login" className="text-[#8B5E3C] font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#8B5E3C]">Reset password</h1>
        <p className="text-sm text-[#6B5D52] mt-1">Enter your email to receive a reset link</p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-[#E8DFD3] p-6 space-y-4"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#2B1F17] mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3 py-2 border border-[#E8DFD3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#87A96B] focus:border-transparent"
          />
        </div>
        {error && (
          <p className="text-sm text-[#B85450] bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[#8B5E3C] text-white text-sm font-medium rounded-lg hover:bg-[#754C30] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="text-center text-sm text-[#6B5D52] mt-4">
        <Link href="/login" className="text-[#8B5E3C] font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
