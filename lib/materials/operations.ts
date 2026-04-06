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

// Parse a YYYY-MM-DD string as a UTC midnight timestamp. Returns NaN for
// malformed input — callers must handle that case.
function isoDateToUtcMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return Number.NaN
  return Date.UTC(y, m - 1, d)
}

// Days between two ISO dates (b - a). Both must be YYYY-MM-DD.
// Returns integer day difference; floors across DST (we use UTC throughout).
function daysBetweenIso(a: string, b: string): number {
  const ms = isoDateToUtcMs(b) - isoDateToUtcMs(a)
  return Math.round(ms / 86_400_000)
}

// AC-OB-2 / AC-OB-3: deadline badge for a material, based on today's date.
// Returns null when the material is already ordered/delivered or has no date.
export type MaterialDeadlineBadge = 'overdue' | 'due_soon'

export type MaterialDeadlineInput = {
  id: string
  name: string
  order_by_date: string | null
  order_status: MaterialOrderStatusValue
}

const UPCOMING_WINDOW_DAYS = 7

export function materialDeadlineStatus(
  material: MaterialDeadlineInput,
  today: string
): MaterialDeadlineBadge | null {
  if (material.order_status !== 'not_quoted') return null
  if (!material.order_by_date) return null
  const diff = daysBetweenIso(today, material.order_by_date)
  if (Number.isNaN(diff)) return null
  if (diff < 0) return 'overdue'
  if (diff <= UPCOMING_WINDOW_DAYS) return 'due_soon'
  return null
}

// AC-OB-4: briefing 'Upcoming Orders' — materials whose order_by_date is
// on or before (today + 7), that are still not_quoted, sorted ascending.
// Overdue items naturally sort to the top of the list.
export function selectUpcomingOrders<T extends MaterialDeadlineInput>(
  materials: T[],
  today: string
): T[] {
  const cutoffMs = isoDateToUtcMs(today) + UPCOMING_WINDOW_DAYS * 86_400_000
  return materials
    .filter(m => {
      if (m.order_status !== 'not_quoted') return false
      if (!m.order_by_date) return false
      const ms = isoDateToUtcMs(m.order_by_date)
      if (Number.isNaN(ms)) return false
      return ms <= cutoffMs
    })
    .sort((a, b) => {
      // Both filtered to have order_by_date — safe to compare.
      return (a.order_by_date as string).localeCompare(b.order_by_date as string)
    })
}

// AC-MS-1 / AC-MS-2: material order_status transitions.
// not_quoted → ordered → delivered. Delivered is terminal.
export type MaterialOrderStatusValue = 'not_quoted' | 'quoted' | 'ordered' | 'in_transit' | 'delivered'

export type StatusTransition = {
  nextStatus: MaterialOrderStatusValue
  label: string
}

export function nextStatusTransition(
  status: MaterialOrderStatusValue
): StatusTransition | null {
  if (status === 'not_quoted') {
    return { nextStatus: 'quoted', label: 'Mark Quoted' }
  }
  if (status === 'quoted') {
    return { nextStatus: 'ordered', label: 'Mark Ordered' }
  }
  if (status === 'ordered') {
    return { nextStatus: 'in_transit', label: 'Mark In Transit' }
  }
  if (status === 'in_transit') {
    return { nextStatus: 'delivered', label: 'Mark Delivered' }
  }
  return null
}

// Filter tabs on /materials
export type MaterialStatusFilter =
  | 'all'
  | 'not_quoted'
  | 'quoted'
  | 'ordered'
  | 'in_transit'
  | 'delivered'

export function filterMaterialsByStatus<
  T extends { order_status: MaterialOrderStatusValue },
>(materials: T[], filter: MaterialStatusFilter): T[] {
  if (filter === 'all') return materials.slice()
  return materials.filter(m => m.order_status === filter)
}

// AC-UO-2: days remaining until order_by_date from today.
// Returns negative for overdue, 0 for today, positive for future. null if no date.
export function daysUntilOrderBy(
  today: string,
  orderByDate: string | null
): number | null {
  if (!orderByDate) return null
  const diff = daysBetweenIso(today, orderByDate)
  if (Number.isNaN(diff)) return null
  return diff
}

// AC-UO-3: format estimated_cost as EUR for display.
export function formatMaterialCost(cost: number | null): string | null {
  if (cost === null || cost === undefined) return null
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cost)
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
