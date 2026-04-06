// Pure functions for generating CSV exports of project data

/** Escape a value for CSV: wrap in quotes if it contains commas, quotes, or newlines */
export function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

/** Build a CSV string from headers and rows */
export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCsvValue).join(',')
  const dataLines = rows.map(row => row.map(escapeCsvValue).join(','))
  return [headerLine, ...dataLines].join('\r\n')
}

export interface CsvStageRow {
  name: string
  color: string
  order_index: number
}

export interface CsvTaskRow {
  name: string
  stage_name: string
  status: string
  duration_days: number
  planned_start: string
  planned_end: string
  actual_end: string | null
  trade_name: string | null
  notes: string | null
}

export interface CsvMaterialRow {
  name: string
  task_name: string
  quantity: string | null
  lead_time_days: number
  order_by_date: string | null
  order_status: string
  estimated_cost: number | null
  supplier_name: string | null
}

export interface CsvTradeRow {
  name: string
  specialty: string | null
  phone: string | null
  email: string | null
}

export function buildStagesCsv(stages: CsvStageRow[]): string {
  return buildCsv(
    ['Name', 'Color', 'Order'],
    stages.map(s => [s.name, s.color, s.order_index])
  )
}

export function buildTasksCsv(tasks: CsvTaskRow[]): string {
  return buildCsv(
    ['Name', 'Stage', 'Status', 'Duration (days)', 'Planned Start', 'Planned End', 'Actual End', 'Trade', 'Notes'],
    tasks.map(t => [t.name, t.stage_name, t.status, t.duration_days, t.planned_start, t.planned_end, t.actual_end, t.trade_name, t.notes])
  )
}

export function buildMaterialsCsv(materials: CsvMaterialRow[]): string {
  return buildCsv(
    ['Name', 'Task', 'Quantity', 'Lead Time (days)', 'Order By', 'Order Status', 'Estimated Cost', 'Supplier'],
    materials.map(m => [m.name, m.task_name, m.quantity, m.lead_time_days, m.order_by_date, m.order_status, m.estimated_cost, m.supplier_name])
  )
}

export function buildTradesCsv(trades: CsvTradeRow[]): string {
  return buildCsv(
    ['Name', 'Specialty', 'Phone', 'Email'],
    trades.map(t => [t.name, t.specialty, t.phone, t.email])
  )
}
