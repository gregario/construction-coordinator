// Pure logic for material line-item management — validation,
// order_by_date computation, cost parsing. No Supabase, no DOM.

export type MaterialFormValues = {
  name: string
  quantity: string
  lead_time_days: string
  estimated_cost: string
  supplier_name: string
  notes: string
}

export type MaterialFormField =
  | 'name'
  | 'quantity'
  | 'lead_time_days'
  | 'estimated_cost'
  | 'supplier_name'
  | 'notes'

export type MaterialFormErrors = Partial<Record<MaterialFormField, string>>

export type ValidateResult = {
  ok: boolean
  errors: MaterialFormErrors
}

const MAX_NAME_LEN = 200
const MAX_QUANTITY_LEN = 80
const MAX_SUPPLIER_LEN = 200
const MAX_NOTES_LEN = 2000
const MAX_LEAD_TIME_DAYS = 365 * 5 // 5 years — sanity bound
const LEAD_TIME_ERROR = 'Lead time must be 0 or more days'

export function validateMaterialInput(values: MaterialFormValues): ValidateResult {
  const errors: MaterialFormErrors = {}

  const name = (values.name ?? '').trim()
  if (!name) {
    errors.name = 'Name is required'
  } else if (name.length > MAX_NAME_LEN) {
    errors.name = `Name must be ${MAX_NAME_LEN} characters or fewer`
  }

  const quantity = (values.quantity ?? '').trim()
  if (quantity.length > MAX_QUANTITY_LEN) {
    errors.quantity = `Quantity must be ${MAX_QUANTITY_LEN} characters or fewer`
  }

  // AC-ML-3: lead_time empty, negative, or non-integer → same message.
  const leadRaw = (values.lead_time_days ?? '').trim()
  if (!leadRaw) {
    errors.lead_time_days = LEAD_TIME_ERROR
  } else if (!/^-?\d+$/.test(leadRaw)) {
    // Non-integer (fractional, text, etc.) — same message; keeps the form simple.
    errors.lead_time_days = LEAD_TIME_ERROR
  } else {
    const n = Number(leadRaw)
    if (!Number.isFinite(n) || n < 0) {
      errors.lead_time_days = LEAD_TIME_ERROR
    } else if (n > MAX_LEAD_TIME_DAYS) {
      errors.lead_time_days = `Lead time must be ${MAX_LEAD_TIME_DAYS} days or fewer`
    }
  }

  const costRaw = (values.estimated_cost ?? '').trim()
  if (costRaw.length > 0) {
    // Accept one optional decimal point; reject anything else.
    if (!/^\d+(\.\d+)?$/.test(costRaw)) {
      errors.estimated_cost = 'Cost must be a number (no currency symbols)'
    } else {
      const n = Number(costRaw)
      if (!Number.isFinite(n) || n < 0) {
        errors.estimated_cost = 'Cost must be 0 or more'
      }
    }
  }

  const supplier = (values.supplier_name ?? '').trim()
  if (supplier.length > MAX_SUPPLIER_LEN) {
    errors.supplier_name = `Supplier must be ${MAX_SUPPLIER_LEN} characters or fewer`
  }

  const notes = (values.notes ?? '').trim()
  if (notes.length > MAX_NOTES_LEN) {
    errors.notes = `Notes must be ${MAX_NOTES_LEN} characters or fewer`
  }

  return { ok: Object.keys(errors).length === 0, errors }
}

// Parse a validated estimated_cost string into a number or null.
// Caller is expected to have passed the value through validateMaterialInput first.
export function parseEstimatedCost(raw: string | null | undefined): number | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

// AC-ML-4: order_by_date = planned_start - lead_time_days.
// Mirrors the schema trigger (cascade_task_dates SQL) so the UI can show the
// same value the DB will compute. Returns YYYY-MM-DD or null.
export function computeOrderByDate(
  plannedStart: string | null,
  leadTimeDays: number
): string | null {
  if (!plannedStart) return null
  // Parse YYYY-MM-DD as UTC to avoid off-by-one from local TZ at midnight.
  const [y, m, d] = plannedStart.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() - leadTimeDays)
  const yy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
