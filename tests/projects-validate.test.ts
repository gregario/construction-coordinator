import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateProjectForm,
  hasBlockingErrors,
  readDraft,
  writeDraft,
  clearDraft,
  PROJECT_FORM_STORAGE_KEY,
} from '@/lib/projects/validate'

describe('validateProjectForm — AC-PS-1, AC-PS-2, AC-PS-3', () => {
  const today = new Date(2026, 3, 5) // 2026-04-05

  it('AC-PS-1: valid name + future start_date passes with no errors or warnings', () => {
    const { errors, warnings } = validateProjectForm(
      { name: 'O\'Brien House', address: 'Wicklow', start_date: '2026-06-01' },
      today
    )
    expect(errors).toEqual({})
    expect(warnings).toEqual({})
    expect(hasBlockingErrors(errors)).toBe(false)
  })

  it('AC-PS-2: empty name produces "Project name is required" error', () => {
    const { errors } = validateProjectForm(
      { name: '', address: '', start_date: '2026-06-01' },
      today
    )
    expect(errors.name).toBe('Project name is required')
    expect(hasBlockingErrors(errors)).toBe(true)
  })

  it('AC-PS-2: whitespace-only name is treated as empty', () => {
    const { errors } = validateProjectForm(
      { name: '   ', address: '', start_date: '2026-06-01' },
      today
    )
    expect(errors.name).toBe('Project name is required')
  })

  it('AC-PS-3: start_date in the past without confirmation produces a warning (not error)', () => {
    const { errors, warnings } = validateProjectForm(
      { name: 'Backfilled Project', address: '', start_date: '2025-01-15' },
      today
    )
    expect(errors.start_date).toBeUndefined()
    expect(warnings.start_date).toBe('Start date is in the past — continue anyway?')
    expect(hasBlockingErrors(errors)).toBe(false)
  })

  it('AC-PS-3: past start_date with past_date_confirmed=true passes with no warning', () => {
    const { errors, warnings } = validateProjectForm(
      {
        name: 'Backfilled',
        address: '',
        start_date: '2025-01-15',
        past_date_confirmed: true,
      },
      today
    )
    expect(errors).toEqual({})
    expect(warnings).toEqual({})
  })

  it('today itself is NOT considered past', () => {
    const { warnings } = validateProjectForm(
      { name: 'Starts today', address: '', start_date: '2026-04-05' },
      today
    )
    expect(warnings.start_date).toBeUndefined()
  })

  it('missing start_date produces an error', () => {
    const { errors } = validateProjectForm(
      { name: 'Pending', address: '', start_date: '' },
      today
    )
    expect(errors.start_date).toBe('Start date is required')
  })

  it('invalid start_date format produces an error', () => {
    const { errors } = validateProjectForm(
      { name: 'Bad date', address: '', start_date: 'not-a-date' },
      today
    )
    expect(errors.start_date).toBe('Start date is not a valid date')
  })
})

describe('AC-PS-5: localStorage draft persistence', () => {
  beforeEach(() => {
    // jsdom in vitest 4 does not always supply a mutable localStorage — stub one.
    const store = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => { store.set(k, String(v)) },
        removeItem: (k: string) => { store.delete(k) },
        clear: () => { store.clear() },
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        get length() { return store.size },
      },
    })
  })

  it('writeDraft persists values under the versioned key', () => {
    writeDraft({ name: 'Draft House', address: 'Cork', start_date: '2026-07-01' })
    const raw = window.localStorage.getItem(PROJECT_FORM_STORAGE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.name).toBe('Draft House')
    expect(parsed.address).toBe('Cork')
    expect(parsed.start_date).toBe('2026-07-01')
  })

  it('readDraft returns null when no draft exists', () => {
    expect(readDraft()).toBeNull()
  })

  it('readDraft returns the written draft values', () => {
    writeDraft({ name: 'Restored', address: '', start_date: '2026-08-10' })
    const draft = readDraft()
    expect(draft).not.toBeNull()
    expect(draft!.name).toBe('Restored')
    expect(draft!.start_date).toBe('2026-08-10')
  })

  it('readDraft returns null when stored value is malformed JSON', () => {
    window.localStorage.setItem(PROJECT_FORM_STORAGE_KEY, '{not json')
    expect(readDraft()).toBeNull()
  })

  it('clearDraft removes the stored draft', () => {
    writeDraft({ name: 'temp', address: '', start_date: '2026-06-01' })
    clearDraft()
    expect(readDraft()).toBeNull()
  })
})
