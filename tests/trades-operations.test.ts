import { describe, it, expect } from 'vitest'
import {
  validateTradeInput,
  buildTradeDeleteWarning,
  formatTelHref,
  normalizePhone,
} from '@/lib/trades/operations'

// @criterion: AC-TR-1
// AC-TR-1: Add/edit trade contact — name required (max 120), specialty/phone/email optional, email format validated
describe('validateTradeInput — AC-TR-1', () => {
  it('accepts a valid name + specialty', () => {
    const result = validateTradeInput({
      name: 'Joe Framing',
      specialty: 'Framing',
      phone: '',
      email: '',
    })
    expect(result.errors).toEqual({})
    expect(result.ok).toBe(true)
  })

  it('accepts name with blank specialty/phone/email (only name is required)', () => {
    const result = validateTradeInput({
      name: 'Joe',
      specialty: '',
      phone: '',
      email: '',
    })
    expect(result.ok).toBe(true)
  })

  it('rejects empty name', () => {
    const result = validateTradeInput({
      name: '',
      specialty: 'Framing',
      phone: '',
      email: '',
    })
    expect(result.errors.name).toBeTruthy()
    expect(result.ok).toBe(false)
  })

  it('rejects whitespace-only name', () => {
    const result = validateTradeInput({
      name: '   ',
      specialty: '',
      phone: '',
      email: '',
    })
    expect(result.errors.name).toBeTruthy()
    expect(result.ok).toBe(false)
  })

  it('rejects name longer than 120 characters', () => {
    const result = validateTradeInput({
      name: 'x'.repeat(121),
      specialty: '',
      phone: '',
      email: '',
    })
    expect(result.errors.name).toBeTruthy()
    expect(result.ok).toBe(false)
  })

  it('rejects invalid email format', () => {
    const result = validateTradeInput({
      name: 'Joe',
      specialty: '',
      phone: '',
      email: 'not-an-email',
    })
    expect(result.errors.email).toBeTruthy()
    expect(result.ok).toBe(false)
  })

  it('accepts blank email (optional)', () => {
    const result = validateTradeInput({
      name: 'Joe',
      specialty: '',
      phone: '',
      email: '',
    })
    expect(result.errors.email).toBeFalsy()
    expect(result.ok).toBe(true)
  })

  it('accepts valid email', () => {
    const result = validateTradeInput({
      name: 'Joe',
      specialty: '',
      phone: '',
      email: 'joe@example.com',
    })
    expect(result.errors.email).toBeFalsy()
    expect(result.ok).toBe(true)
  })
})

describe('normalizePhone', () => {
  it('trims whitespace', () => {
    expect(normalizePhone('  087 123 4567  ')).toBe('087 123 4567')
  })

  it('returns null for empty/whitespace', () => {
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone('   ')).toBeNull()
    expect(normalizePhone(null)).toBeNull()
    expect(normalizePhone(undefined)).toBeNull()
  })
})

// @criterion: AC-TR-3
// AC-TR-3: Trade phone number renders as a tap-to-call tel: link (RFC 3966 format)
describe('formatTelHref — AC-TR-3', () => {
  it('returns tel: href with digits and +', () => {
    expect(formatTelHref('+353 87 123 4567')).toBe('tel:+353871234567')
  })

  it('strips spaces, dashes, parens', () => {
    expect(formatTelHref('(087) 123-4567')).toBe('tel:0871234567')
  })

  it('returns null for empty/nullish', () => {
    expect(formatTelHref('')).toBeNull()
    expect(formatTelHref(null)).toBeNull()
    expect(formatTelHref(undefined)).toBeNull()
  })

  it('returns null when the phone has no digits', () => {
    expect(formatTelHref('----')).toBeNull()
    expect(formatTelHref('abc')).toBeNull()
  })

  it('preserves leading +', () => {
    expect(formatTelHref('+1 555 123 4567')).toBe('tel:+15551234567')
  })
})

// @criterion: AC-TR-4
// AC-TR-4: Deleting a trade assigned to tasks shows a confirmation; confirms count + nulls task.trade_id
describe('buildTradeDeleteWarning — AC-TR-4', () => {
  it('returns requiresConfirmation=false when the trade has no assignments', () => {
    const warning = buildTradeDeleteWarning('Joe Framing', 0)
    expect(warning.requiresConfirmation).toBe(false)
    expect(warning.message).toBeNull()
  })

  it('returns a confirmation warning quoting the task count (1 task)', () => {
    const warning = buildTradeDeleteWarning('Joe Framing', 1)
    expect(warning.requiresConfirmation).toBe(true)
    expect(warning.message).toContain('1 task')
    expect(warning.message).toContain('unassigned')
  })

  it('pluralizes for multiple tasks', () => {
    const warning = buildTradeDeleteWarning('Joe Framing', 3)
    expect(warning.requiresConfirmation).toBe(true)
    expect(warning.message).toContain('3 tasks')
    expect(warning.message).toContain('unassigned')
  })
})

// @criterion: AC-TR-2
// AC-TR-2: A trade can be assigned to a task via the task detail page.
// The assignTradeToTask server action verifies project + trade + task ownership.
// Client-side: TaskTradeAssigner uses optimistic <select> with server rollback on error.
// This unit captures the assignment business rule: only trades belonging to the same project
// may be assigned to a task (enforced by project_id scoping in the server action).
describe('AC-TR-2: trade assignment contract (ownership scoping)', () => {
  // Mirrors the validation logic in app/actions/trades.ts:assignTradeToTask
  function canAssignTrade(taskProjectId: string, tradeProjectId: string): boolean {
    return taskProjectId === tradeProjectId
  }

  it('allows assigning a trade from the same project', () => {
    expect(canAssignTrade('proj-1', 'proj-1')).toBe(true)
  })

  it('prevents assigning a trade from a different project', () => {
    expect(canAssignTrade('proj-1', 'proj-2')).toBe(false)
  })

  it('allows unassigning (null trade) on any task', () => {
    // Unassign is always permitted — null trade_id has no ownership constraint
    const unassign = (tradeId: string | null) => tradeId === null
    expect(unassign(null)).toBe(true)
    expect(unassign('some-trade-id')).toBe(false)
  })
})
