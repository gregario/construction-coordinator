'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  validateProjectForm,
  hasBlockingErrors,
  readDraft,
  writeDraft,
  clearDraft,
  type ProjectFormErrors,
  type ProjectFormWarnings,
} from '@/lib/projects/validate'
import { createProject } from '@/app/actions/projects'

export function ProjectCreationForm() {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [startDate, setStartDate] = useState('')
  const [errors, setErrors] = useState<ProjectFormErrors>({})
  const [warnings, setWarnings] = useState<ProjectFormWarnings>({})
  const [pastDateConfirmed, setPastDateConfirmed] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [hydrated, setHydrated] = useState(false)

  // AC-PS-5: restore from localStorage on mount
  useEffect(() => {
    const draft = readDraft()
    if (draft) {
      if (typeof draft.name === 'string') setName(draft.name)
      if (typeof draft.address === 'string') setAddress(draft.address)
      if (typeof draft.start_date === 'string') setStartDate(draft.start_date)
    }
    setHydrated(true)
  }, [])

  // Persist to localStorage as user types (after hydration to avoid overwriting with empty)
  useEffect(() => {
    if (!hydrated) return
    writeDraft({ name, address, start_date: startDate })
  }, [name, address, startDate, hydrated])

  // Note: draft restoration useEffect above uses direct setState in an effect body intentionally —
  // lazy initializers run during SSR where localStorage is unavailable. This is the correct
  // SSR-safe pattern for 'use client' components that read browser-only APIs on mount.

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)
    const values = {
      name,
      address,
      start_date: startDate,
      past_date_confirmed: pastDateConfirmed,
    }
    const result = validateProjectForm(values, new Date())
    setErrors(result.errors)
    setWarnings(result.warnings)

    if (hasBlockingErrors(result.errors)) return
    // AC-PS-3: require explicit confirmation before saving a past date
    if (result.warnings.start_date && !pastDateConfirmed) return

    const fd = new FormData()
    fd.set('name', name.trim())
    fd.set('address', address.trim())
    fd.set('start_date', startDate)
    fd.set('past_date_confirmed', pastDateConfirmed ? 'true' : 'false')

    startTransition(async () => {
      const res = await createProject(fd)
      // createProject redirects on success, so we only reach here on failure
      if (res && res.ok === false) {
        if (res.field === 'name' || res.field === 'start_date') {
          setErrors({ [res.field]: res.error } as ProjectFormErrors)
        } else {
          setServerError(res.error)
        }
        return
      }
      // success path: clear the draft
      clearDraft()
    })
  }

  const showPastDateWarning = Boolean(warnings.start_date) && !pastDateConfirmed

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[#2B1F17] mb-1">
          Project name <span className="text-[#B8543A]">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className="w-full rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-[#2B1F17] placeholder:text-[#A89A8C] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
          placeholder="e.g. O'Brien Timber Frame House"
        />
        {errors.name && (
          <p id="name-error" role="alert" className="mt-1 text-sm text-[#B8543A]">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-[#2B1F17] mb-1">
          Site address <span className="text-[#6B5D52] font-normal">(optional)</span>
        </label>
        <input
          id="address"
          name="address"
          type="text"
          value={address}
          onChange={e => setAddress(e.target.value)}
          className="w-full rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-[#2B1F17] placeholder:text-[#A89A8C] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
          placeholder="e.g. 42 Laragh Lane, Wicklow"
        />
      </div>

      <div>
        <label htmlFor="start_date" className="block text-sm font-medium text-[#2B1F17] mb-1">
          Start date <span className="text-[#B8543A]">*</span>
        </label>
        <input
          id="start_date"
          name="start_date"
          type="date"
          value={startDate}
          onChange={e => { setStartDate(e.target.value); setPastDateConfirmed(false) }}
          aria-invalid={Boolean(errors.start_date)}
          aria-describedby={errors.start_date ? 'start-date-error' : undefined}
          className="w-full rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-[#2B1F17] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
        />
        {errors.start_date && (
          <p id="start-date-error" role="alert" className="mt-1 text-sm text-[#B8543A]">
            {errors.start_date}
          </p>
        )}
        {showPastDateWarning && (
          <div className="mt-2 rounded-md border border-[#D4A355] bg-[#FDF7E8] p-3">
            <p className="text-sm text-[#6B4A1F]">{warnings.start_date}</p>
            <label className="mt-2 flex items-center gap-2 text-sm text-[#2B1F17]">
              <input
                type="checkbox"
                checked={pastDateConfirmed}
                onChange={e => setPastDateConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-[#E8DFD3] text-[#8B5E3C] focus:ring-[#8B5E3C]"
              />
              Yes, use this date anyway
            </label>
          </div>
        )}
      </div>

      {serverError && (
        <div role="alert" className="rounded-md border border-[#B8543A] bg-[#FDECE7] p-3 text-sm text-[#7A2E1A]">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-[#8B5E3C] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#754D30] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#8B5E3C] focus:ring-offset-2 focus:ring-offset-[#FAF7F2]"
      >
        {isPending ? 'Creating project…' : 'Create project'}
      </button>
    </form>
  )
}
