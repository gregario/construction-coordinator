import { describe, it, expect } from 'vitest'
import {
  validateDocumentFile,
  buildDocumentStoragePath,
  formatFileSize,
  formatUploadDate,
  fileTypeIcon,
  type DocumentValidationResult,
} from '@/lib/documents/operations'

// @criterion: AC-DS-1, AC-DS-4
// AC-DS-1: Upload validates MIME type (PDF/JPEG/PNG/DOCX/XLSX) and stores via Supabase Storage.
// AC-DS-4: 25MB size cap with exact spec error message "Files must be under 25 MB — consider compressing the document".
// --- validateDocumentFile ---

describe('validateDocumentFile', () => {
  it('accepts a valid PDF file', () => {
    const result = validateDocumentFile({ type: 'application/pdf', size: 5_000_000, name: 'plans.pdf' })
    expect(result).toEqual({ valid: true })
  })

  it('accepts a JPEG image', () => {
    const result = validateDocumentFile({ type: 'image/jpeg', size: 1_000_000, name: 'scan.jpg' })
    expect(result).toEqual({ valid: true })
  })

  it('accepts a PNG image', () => {
    const result = validateDocumentFile({ type: 'image/png', size: 1_000_000, name: 'plan.png' })
    expect(result).toEqual({ valid: true })
  })

  it('accepts a docx file', () => {
    const result = validateDocumentFile({
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 2_000_000,
      name: 'contract.docx',
    })
    expect(result).toEqual({ valid: true })
  })

  it('accepts an xlsx file', () => {
    const result = validateDocumentFile({
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 3_000_000,
      name: 'budget.xlsx',
    })
    expect(result).toEqual({ valid: true })
  })

  it('rejects an unsupported MIME type', () => {
    const result = validateDocumentFile({ type: 'application/zip', size: 1_000, name: 'archive.zip' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.field).toBe('file')
      expect(result.error.message).toContain('Unsupported file type')
    }
  })

  it('rejects an executable', () => {
    const result = validateDocumentFile({ type: 'application/x-msdownload', size: 500, name: 'app.exe' })
    expect(result.valid).toBe(false)
  })

  it('rejects a file over 25 MB (AC-DS-4)', () => {
    const result = validateDocumentFile({ type: 'application/pdf', size: 25 * 1024 * 1024 + 1, name: 'huge.pdf' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.message).toBe('Files must be under 25 MB — consider compressing the document')
    }
  })

  it('accepts a file exactly at 25 MB', () => {
    const result = validateDocumentFile({ type: 'application/pdf', size: 25 * 1024 * 1024, name: 'max.pdf' })
    expect(result).toEqual({ valid: true })
  })
})

// @criterion: AC-DS-1
// AC-DS-1: Document stored at {project_id}/{entity_id}/{timestamp}-{sanitized_name} in documents bucket.
// --- buildDocumentStoragePath ---

describe('buildDocumentStoragePath', () => {
  it('builds a path with project/entity/timestamp-filename', () => {
    const path = buildDocumentStoragePath('proj-1', 'task-2', 'Floor Plans.pdf', 1700000000000)
    expect(path).toBe('proj-1/task-2/1700000000000-floor_plans.pdf')
  })

  it('sanitizes special characters in filename', () => {
    const path = buildDocumentStoragePath('p', 'e', 'My Contract (v2).docx', 1000)
    expect(path).toBe('p/e/1000-my_contract_v2_.docx')
  })

  it('collapses consecutive underscores', () => {
    const path = buildDocumentStoragePath('p', 'e', 'a___b.xlsx', 1000)
    expect(path).toBe('p/e/1000-a_b.xlsx')
  })
})

// --- formatFileSize (reused from photos, but document-specific tests) ---

describe('formatFileSize', () => {
  it('formats megabytes', () => {
    expect(formatFileSize(2_500_000)).toBe('2.4 MB')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(450_000)).toBe('439 KB')
  })

  it('returns dash for null', () => {
    expect(formatFileSize(null)).toBe('—')
  })
})

// --- formatUploadDate ---

describe('formatUploadDate', () => {
  it('formats a valid ISO date string', () => {
    const result = formatUploadDate('2026-04-05T10:30:00Z')
    expect(result).toMatch(/5 Apr 2026/)
  })

  it('returns empty string for null', () => {
    expect(formatUploadDate(null)).toBe('')
  })

  it('returns empty string for invalid date', () => {
    expect(formatUploadDate('not-a-date')).toBe('')
  })
})

// @criterion: AC-DS-2
// AC-DS-2: Each document row shows a file type icon based on MIME type (pdf/word/excel/image/file).
// --- fileTypeIcon ---

describe('fileTypeIcon', () => {
  it('returns pdf icon for application/pdf', () => {
    expect(fileTypeIcon('application/pdf')).toBe('pdf')
  })

  it('returns word icon for docx', () => {
    expect(fileTypeIcon('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('word')
  })

  it('returns excel icon for xlsx', () => {
    expect(fileTypeIcon('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('excel')
  })

  it('returns image icon for image types', () => {
    expect(fileTypeIcon('image/jpeg')).toBe('image')
    expect(fileTypeIcon('image/png')).toBe('image')
  })

  it('returns file icon for unknown types', () => {
    expect(fileTypeIcon('application/octet-stream')).toBe('file')
  })
})
