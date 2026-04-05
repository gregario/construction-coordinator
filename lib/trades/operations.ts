// Pure logic for trade contact management — validation, phone formatting,
// delete-confirmation. No Supabase, no DOM. Unit-testable without mocks.

export type TradeFormValues = {
  name: string
  specialty: string
  phone: string
  email: string
}

export type TradeFormField = 'name' | 'specialty' | 'phone' | 'email'

export type TradeFormErrors = Partial<Record<TradeFormField, string>>

export type ValidateResult = {
  ok: boolean
  errors: TradeFormErrors
}

const MAX_NAME_LEN = 120
const MAX_SPECIALTY_LEN = 80
const MAX_PHONE_LEN = 40
const MAX_EMAIL_LEN = 200
// Deliberately permissive: has an @, a dot in the domain, and no whitespace.
// Server-side verification is not this function's job.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateTradeInput(values: TradeFormValues): ValidateResult {
  const errors: TradeFormErrors = {}
  const name = (values.name ?? '').trim()
  if (!name) {
    errors.name = 'Name is required'
  } else if (name.length > MAX_NAME_LEN) {
    errors.name = `Name must be ${MAX_NAME_LEN} characters or fewer`
  }
  const specialty = (values.specialty ?? '').trim()
  if (specialty.length > MAX_SPECIALTY_LEN) {
    errors.specialty = `Specialty must be ${MAX_SPECIALTY_LEN} characters or fewer`
  }
  const phone = (values.phone ?? '').trim()
  if (phone.length > MAX_PHONE_LEN) {
    errors.phone = `Phone must be ${MAX_PHONE_LEN} characters or fewer`
  }
  const email = (values.email ?? '').trim()
  if (email.length > 0) {
    if (email.length > MAX_EMAIL_LEN) {
      errors.email = `Email must be ${MAX_EMAIL_LEN} characters or fewer`
    } else if (!EMAIL_RE.test(email)) {
      errors.email = 'Enter a valid email address'
    }
  }
  return { ok: Object.keys(errors).length === 0, errors }
}

export function normalizePhone(phone: string | null | undefined): string | null {
  if (typeof phone !== 'string') return null
  const trimmed = phone.trim()
  return trimmed.length > 0 ? trimmed : null
}

// AC-TR-3: convert a human-entered phone number into a tel: href.
// Strips everything except digits and a leading +. Returns null if there
// are no usable digits, so the caller can skip rendering the link.
export function formatTelHref(phone: string | null | undefined): string | null {
  if (typeof phone !== 'string') return null
  const trimmed = phone.trim()
  if (!trimmed) return null
  const leadingPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  return `tel:${leadingPlus ? '+' : ''}${digits}`
}

export type DeleteWarning = {
  requiresConfirmation: boolean
  message: string | null
}

// AC-TR-4: trades assigned to tasks surface the count in the warning copy.
// Empty trades (no assignments) delete without confirmation.
export function buildTradeDeleteWarning(
  tradeName: string,
  assignedTaskCount: number
): DeleteWarning {
  if (assignedTaskCount <= 0) {
    return { requiresConfirmation: false, message: null }
  }
  const noun = assignedTaskCount === 1 ? 'task' : 'tasks'
  return {
    requiresConfirmation: true,
    message: `"${tradeName}" is assigned to ${assignedTaskCount} ${noun} — they will be unassigned.`,
  }
}
