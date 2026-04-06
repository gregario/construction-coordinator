import { describe, it, expect } from 'vitest'
import { buildJsonExport, serializeJsonExport, type ProjectExportData } from '@/lib/export/json-export'
import { escapeCsvValue, buildCsv, buildStagesCsv, buildTasksCsv, buildMaterialsCsv, buildTradesCsv } from '@/lib/export/csv-export'
import { buildZip } from '@/lib/export/zip'
import type { Project, Stage, Task, Material, Trade, Photo, Document } from '@/types/database'

// ─── Fixtures ───────────────────────────────────────────────────────
const project: Project = {
  id: 'p1', user_id: 'u1', name: "O'Brien House", address: '42 Laragh Lane', start_date: '2026-04-01',
  status: 'active', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z',
}
const stages: Stage[] = [
  { id: 's1', project_id: 'p1', name: 'Foundation', color: '#8B5E3C', order_index: 0, created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
  { id: 's2', project_id: 'p1', name: 'Frame', color: '#87A96B', order_index: 1, created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
]
const tasks: Task[] = [
  { id: 't1', stage_id: 's1', project_id: 'p1', trade_id: null, name: 'Excavation', duration_days: 5, planned_start: '2026-04-01', planned_end: '2026-04-05', actual_end: null, status: 'not_started', order_index: 0, notes: 'Dig, baby, dig', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
  { id: 't2', stage_id: 's1', project_id: 'p1', trade_id: 'tr1', name: 'Footings', duration_days: 3, planned_start: '2026-04-06', planned_end: '2026-04-08', actual_end: '2026-04-09', status: 'complete', order_index: 1, notes: null, created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
]
const materials: Material[] = [
  { id: 'm1', task_id: 't1', name: 'Ready Mix Concrete', quantity: '50 m³', lead_time_days: 3, order_by_date: '2026-03-29', order_status: 'ordered', estimated_cost: 4500, supplier_name: 'Kilsaran', notes: null, created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
]
const trades: Trade[] = [
  { id: 'tr1', project_id: 'p1', name: 'Pat Murphy', specialty: 'Groundworks', phone: '087 123 4567', email: 'pat@example.com', notes: null, created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
]
const photos: Photo[] = [
  { id: 'ph1', project_id: 'p1', task_id: 't1', stage_id: null, storage_path: 'photos/p1/abc.jpg', file_name: 'site.jpg', file_size: 1024000, taken_at: '2026-04-02T09:00:00Z', created_at: '2026-04-02T09:00:00Z' },
]
const documents: Document[] = [
  { id: 'd1', project_id: 'p1', task_id: null, stage_id: 's1', storage_path: 'documents/p1/plan.pdf', file_name: 'plan.pdf', file_type: 'application/pdf', file_size: 2048000, created_at: '2026-04-02T10:00:00Z' },
]

// @criterion: AC-EX-2
// AC-EX-2: JSON export assembles all project entities (project, stages, tasks, materials, trades, photos, documents),
//          strips photo/document binary fields, serializes as pretty-printed JSON.
// ─── JSON Export ────────────────────────────────────────────────────
describe('buildJsonExport', () => {
  it('includes all entity arrays', () => {
    const result = buildJsonExport(project, stages, tasks, materials, trades, photos, documents, '2026-04-06T00:00:00Z')
    expect(result.project).toBe(project)
    expect(result.stages).toEqual(stages)
    expect(result.tasks).toEqual(tasks)
    expect(result.materials).toEqual(materials)
    expect(result.trades).toEqual(trades)
    expect(result.exported_at).toBe('2026-04-06T00:00:00Z')
  })

  it('strips binary-irrelevant fields from photos (keeps metadata only)', () => {
    const result = buildJsonExport(project, stages, tasks, materials, trades, photos, documents, '2026-04-06T00:00:00Z')
    expect(result.photos).toHaveLength(1)
    expect(result.photos[0]).toEqual({
      id: 'ph1', file_name: 'site.jpg', storage_path: 'photos/p1/abc.jpg',
      task_id: 't1', stage_id: null, taken_at: '2026-04-02T09:00:00Z', created_at: '2026-04-02T09:00:00Z',
    })
    // file_size and project_id are NOT included
    expect((result.photos[0] as Record<string, unknown>).file_size).toBeUndefined()
    expect((result.photos[0] as Record<string, unknown>).project_id).toBeUndefined()
  })

  it('strips binary-irrelevant fields from documents (keeps metadata only)', () => {
    const result = buildJsonExport(project, stages, tasks, materials, trades, photos, documents, '2026-04-06T00:00:00Z')
    expect(result.documents).toHaveLength(1)
    expect(result.documents[0]).toEqual({
      id: 'd1', file_name: 'plan.pdf', file_type: 'application/pdf', storage_path: 'documents/p1/plan.pdf',
      task_id: null, stage_id: 's1', created_at: '2026-04-02T10:00:00Z',
    })
    expect((result.documents[0] as Record<string, unknown>).file_size).toBeUndefined()
  })

  it('handles empty arrays gracefully', () => {
    const result = buildJsonExport(project, [], [], [], [], [], [], '2026-04-06T00:00:00Z')
    expect(result.stages).toEqual([])
    expect(result.tasks).toEqual([])
    expect(result.materials).toEqual([])
    expect(result.trades).toEqual([])
    expect(result.photos).toEqual([])
    expect(result.documents).toEqual([])
  })
})

describe('serializeJsonExport', () => {
  it('produces valid parseable JSON', () => {
    const data = buildJsonExport(project, stages, tasks, materials, trades, photos, documents, '2026-04-06T00:00:00Z')
    const json = serializeJsonExport(data)
    const parsed = JSON.parse(json) as ProjectExportData
    expect(parsed.project.name).toBe("O'Brien House")
    expect(parsed.stages).toHaveLength(2)
  })
})

// @criterion: AC-EX-3
// AC-EX-3: CSV export produces individual CSVs (stages, tasks, materials, trades) with proper escaping,
//          assembled into a valid ZIP archive (STORE method, CRC-32 checksums, no external deps).
// ─── CSV Export ─────────────────────────────────────────────────────
describe('escapeCsvValue', () => {
  it('returns empty string for null/undefined', () => {
    expect(escapeCsvValue(null)).toBe('')
    expect(escapeCsvValue(undefined)).toBe('')
  })

  it('passes through simple strings', () => {
    expect(escapeCsvValue('hello')).toBe('hello')
  })

  it('wraps strings containing commas in quotes', () => {
    expect(escapeCsvValue('foo,bar')).toBe('"foo,bar"')
  })

  it('escapes internal double quotes', () => {
    expect(escapeCsvValue('say "hello"')).toBe('"say ""hello"""')
  })

  it('wraps strings containing newlines', () => {
    expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"')
  })

  it('converts numbers to string', () => {
    expect(escapeCsvValue(42)).toBe('42')
  })
})

describe('buildCsv', () => {
  it('builds header + data rows with CRLF line endings', () => {
    const csv = buildCsv(['Name', 'Age'], [['Alice', 30], ['Bob', 25]])
    expect(csv).toBe('Name,Age\r\nAlice,30\r\nBob,25')
  })

  it('handles empty rows array', () => {
    const csv = buildCsv(['X'], [])
    expect(csv).toBe('X')
  })
})

describe('buildStagesCsv', () => {
  it('produces correct stage CSV', () => {
    const csv = buildStagesCsv([{ name: 'Foundation', color: '#8B5E3C', order_index: 0 }])
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Name,Color,Order')
    expect(lines[1]).toBe('Foundation,#8B5E3C,0')
  })
})

describe('buildTasksCsv', () => {
  it('produces correct task CSV with human-readable headers', () => {
    const csv = buildTasksCsv([{
      name: 'Excavation', stage_name: 'Foundation', status: 'not_started',
      duration_days: 5, planned_start: '2026-04-01', planned_end: '2026-04-05',
      actual_end: null, trade_name: 'Pat Murphy', notes: 'Dig, baby, dig',
    }])
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Name,Stage,Status,Duration (days),Planned Start,Planned End,Actual End,Trade,Notes')
    expect(lines[1]).toContain('Excavation')
    expect(lines[1]).toContain('Foundation')
    expect(lines[1]).toContain('Pat Murphy')
    // Notes with comma-like chars should be escaped
    expect(lines[1]).toContain('"Dig, baby, dig"')
  })
})

describe('buildMaterialsCsv', () => {
  it('produces correct material CSV', () => {
    const csv = buildMaterialsCsv([{
      name: 'Ready Mix Concrete', task_name: 'Excavation', quantity: '50 m³',
      lead_time_days: 3, order_by_date: '2026-03-29', order_status: 'ordered',
      estimated_cost: 4500, supplier_name: 'Kilsaran',
    }])
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Name,Task,Quantity,Lead Time (days),Order By,Order Status,Estimated Cost,Supplier')
    expect(lines[1]).toContain('Ready Mix Concrete')
    expect(lines[1]).toContain('4500')
  })
})

describe('buildTradesCsv', () => {
  it('produces correct trade CSV', () => {
    const csv = buildTradesCsv([{ name: 'Pat Murphy', specialty: 'Groundworks', phone: '087 123 4567', email: 'pat@example.com' }])
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Name,Specialty,Phone,Email')
    expect(lines[1]).toContain('Pat Murphy')
    expect(lines[1]).toContain('pat@example.com')
  })
})

// ─── ZIP Builder ────────────────────────────────────────────────────
describe('buildZip', () => {
  it('produces a valid zip with correct local file header signature', () => {
    const zip = buildZip([{ name: 'hello.txt', content: 'world' }])
    expect(zip).toBeInstanceOf(Uint8Array)
    // PK\x03\x04 = local file header signature
    expect(zip[0]).toBe(0x50) // P
    expect(zip[1]).toBe(0x4b) // K
    expect(zip[2]).toBe(0x03)
    expect(zip[3]).toBe(0x04)
  })

  it('produces zip with correct EOCD record at end', () => {
    const zip = buildZip([{ name: 'a.txt', content: 'x' }])
    // Last 22 bytes should start with EOCD signature PK\x05\x06
    const eocdStart = zip.length - 22
    expect(zip[eocdStart]).toBe(0x50)
    expect(zip[eocdStart + 1]).toBe(0x4b)
    expect(zip[eocdStart + 2]).toBe(0x05)
    expect(zip[eocdStart + 3]).toBe(0x06)
  })

  it('encodes correct entry count in EOCD', () => {
    const zip = buildZip([
      { name: 'a.csv', content: 'x' },
      { name: 'b.csv', content: 'y' },
      { name: 'c.csv', content: 'z' },
    ])
    // Entry count is at EOCD offset + 8 (total entries, 2 bytes LE)
    const eocdStart = zip.length - 22
    expect(zip[eocdStart + 10]).toBe(3) // 3 entries
    expect(zip[eocdStart + 11]).toBe(0)
  })

  it('stores file content verbatim (STORE method)', () => {
    const content = 'Hello, World!'
    const zip = buildZip([{ name: 'test.txt', content }])
    // The content should appear verbatim in the zip
    const contentBytes = new TextEncoder().encode(content)
    const zipStr = new TextDecoder().decode(zip)
    expect(zipStr).toContain(content)

    // Verify the content bytes are present
    let found = false
    for (let i = 0; i < zip.length - contentBytes.length; i++) {
      let match = true
      for (let j = 0; j < contentBytes.length; j++) {
        if (zip[i + j] !== contentBytes[j]) { match = false; break }
      }
      if (match) { found = true; break }
    }
    expect(found).toBe(true)
  })

  it('handles multiple entries', () => {
    const zip = buildZip([
      { name: 'stages.csv', content: 'Name\r\nFoundation' },
      { name: 'tasks.csv', content: 'Name\r\nExcavation' },
      { name: 'materials.csv', content: 'Name\r\nConcrete' },
      { name: 'trades.csv', content: 'Name\r\nPat' },
    ])
    expect(zip.length).toBeGreaterThan(0)
    // Should contain all 4 filenames
    const zipStr = new TextDecoder().decode(zip)
    expect(zipStr).toContain('stages.csv')
    expect(zipStr).toContain('tasks.csv')
    expect(zipStr).toContain('materials.csv')
    expect(zipStr).toContain('trades.csv')
  })

  it('handles empty entries list', () => {
    const zip = buildZip([])
    // Should still produce a valid zip with just EOCD
    expect(zip.length).toBe(22) // just EOCD record
    expect(zip[0]).toBe(0x50) // P
    expect(zip[1]).toBe(0x4b) // K
  })
})
