// Delay logging — pure logic for validating a user-entered delay date and
// formatting the post-cascade summary message.
//
// A delay is a forward-only push of planned_end. Shrinking the date (pulling
// a task in) happens via duration edits, not delay logging. We refuse equal
// dates too — a delay that doesn't move the date is a no-op and the cascade
// RPC would return an empty summary that reads as a bug to the user.
//
// Pure functions only. No Supabase, no I/O.

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export type ValidateDelayResult =
  | { ok: true }
  | { ok: false; error: string }

// AC-DL-2: "user selects a later date and clicks 'Apply'". Later = strictly
// greater than the current planned_end. Equal dates are rejected.
export function validateDelayDate(
  currentPlannedEnd: string,
  newPlannedEnd: string
): ValidateDelayResult {
  if (!newPlannedEnd || !ISO_DATE_RE.test(newPlannedEnd)) {
    return { ok: false, error: 'Pick a valid date' }
  }
  // Confirm the string is a real calendar date (catches 2026-02-30 etc.)
  const [y, m, d] = newPlannedEnd.split('-').map(Number)
  const probe = new Date(Date.UTC(y, m - 1, d))
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return { ok: false, error: 'Pick a valid date' }
  }
  if (!currentPlannedEnd || !ISO_DATE_RE.test(currentPlannedEnd)) {
    return { ok: false, error: 'Task has no current end date' }
  }
  if (newPlannedEnd <= currentPlannedEnd) {
    return { ok: false, error: 'New date must be after the current end date' }
  }
  return { ok: true }
}

// AC-DL-3: post-cascade overlay reads "N tasks shifted, M material order-by
// dates moved". Plurals matter: "1 task shifted, 0 material order-by dates
// moved" is the minimum honest message. Zero-count phrases are still rendered
// so the user can tell the cascade ran and simply had nothing to move.
export function formatCascadeSummaryMessage(
  taskCount: number,
  materialCount: number
): string {
  const tasks = `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} shifted`
  const materials = `${materialCount} material order-by ${
    materialCount === 1 ? 'date' : 'dates'
  } moved`
  return `${tasks}, ${materials}`
}
