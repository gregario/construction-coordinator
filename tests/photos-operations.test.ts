import { describe, it, expect } from 'vitest'
import {
  validatePhotoFile,
  buildStoragePath,
  formatFileSize,
  formatPhotoDate,
  groupPhotosByStage,
  type PhotoListItem,
} from '@/lib/photos/operations'

// @criterion: AC-PS-1, AC-PS-5
// AC-PS-1: Photo upload validates MIME type (jpeg/png/webp/heic) and 10MB size limit before upload.
// AC-PS-5: Client-side validatePhotoFile rejects unsupported types and files >10MB with specific error messages.
// --- validatePhotoFile ---

describe('validatePhotoFile', () => {
  it('accepts a valid JPEG file', () => {
    const result = validatePhotoFile({ type: 'image/jpeg', size: 5_000_000, name: 'photo.jpg' })
    expect(result).toEqual({ valid: true })
  })

  it('accepts a valid PNG file', () => {
    const result = validatePhotoFile({ type: 'image/png', size: 1_000, name: 'shot.png' })
    expect(result).toEqual({ valid: true })
  })

  it('accepts a valid WebP file', () => {
    const result = validatePhotoFile({ type: 'image/webp', size: 100_000, name: 'img.webp' })
    expect(result).toEqual({ valid: true })
  })

  it('accepts a valid HEIC file', () => {
    const result = validatePhotoFile({ type: 'image/heic', size: 8_000_000, name: 'IMG_001.heic' })
    expect(result).toEqual({ valid: true })
  })

  it('rejects an unsupported MIME type', () => {
    const result = validatePhotoFile({ type: 'application/pdf', size: 1_000, name: 'doc.pdf' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.field).toBe('file')
      expect(result.error.message).toContain('Unsupported file type')
      expect(result.error.message).toContain('application/pdf')
    }
  })

  it('rejects a GIF file', () => {
    const result = validatePhotoFile({ type: 'image/gif', size: 500, name: 'anim.gif' })
    expect(result.valid).toBe(false)
  })

  it('rejects a file over 10 MB', () => {
    const result = validatePhotoFile({ type: 'image/jpeg', size: 11_000_000, name: 'huge.jpg' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.message).toContain('10 MB')
      expect(result.error.message).toContain('10.5 MB')
    }
  })

  it('accepts a file exactly at 10 MB', () => {
    const result = validatePhotoFile({ type: 'image/jpeg', size: 10 * 1024 * 1024, name: 'max.jpg' })
    expect(result).toEqual({ valid: true })
  })
})

// @criterion: AC-PS-1
// AC-PS-1: Photo stored in Supabase Storage at {project_id}/{entity_id}/{timestamp}-{sanitized_name}.
// --- buildStoragePath ---

describe('buildStoragePath', () => {
  it('builds a path with project/entity/timestamp-filename', () => {
    const path = buildStoragePath('proj-1', 'task-2', 'Site Photo.jpg', 1700000000000)
    expect(path).toBe('proj-1/task-2/1700000000000-site_photo.jpg')
  })

  it('sanitizes special characters in filename', () => {
    const path = buildStoragePath('p', 'e', 'My (Photo) #1!.PNG', 1000)
    expect(path).toBe('p/e/1000-my_photo_1_.png')
  })

  it('collapses consecutive underscores', () => {
    const path = buildStoragePath('p', 'e', 'a___b.jpg', 1000)
    expect(path).toBe('p/e/1000-a_b.jpg')
  })
})

// --- formatFileSize ---

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(450_000)).toBe('439 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(2_500_000)).toBe('2.4 MB')
  })

  it('returns dash for null', () => {
    expect(formatFileSize(null)).toBe('—')
  })

  it('returns dash for zero', () => {
    expect(formatFileSize(0)).toBe('—')
  })
})

// --- formatPhotoDate ---

describe('formatPhotoDate', () => {
  it('formats a valid ISO date', () => {
    const result = formatPhotoDate('2026-04-05T10:30:00Z')
    expect(result).toMatch(/5 Apr 2026/)
  })

  it('returns empty string for null', () => {
    expect(formatPhotoDate(null)).toBe('')
  })

  it('returns empty string for invalid date', () => {
    expect(formatPhotoDate('not-a-date')).toBe('')
  })
})

// @criterion: AC-PS-3
// AC-PS-3: /photos gallery groups photos by stage (order_index order), unassigned group at end, sorted most-recent first.
// --- groupPhotosByStage ---

describe('groupPhotosByStage', () => {
  const stages = [
    { id: 's1', name: 'Foundation', color: '#8B5E3C', order_index: 0 },
    { id: 's2', name: 'Framing', color: '#6B8E23', order_index: 1 },
  ]

  const mkPhoto = (overrides: Partial<PhotoListItem> & { id: string }): PhotoListItem => ({
    storage_path: `path/${overrides.id}`,
    file_name: `${overrides.id}.jpg`,
    file_size: 1000,
    taken_at: null,
    created_at: '2026-04-01T00:00:00Z',
    task_id: null,
    stage_id: null,
    ...overrides,
  })

  it('groups photos by stage in order_index order', () => {
    const photos = [
      mkPhoto({ id: 'p1', stage_id: 's2', created_at: '2026-04-02T00:00:00Z' }),
      mkPhoto({ id: 'p2', stage_id: 's1', created_at: '2026-04-01T00:00:00Z' }),
    ]
    const result = groupPhotosByStage(photos, stages)
    expect(result).toHaveLength(2)
    expect(result[0].stage_name).toBe('Foundation')
    expect(result[0].photos[0].id).toBe('p2')
    expect(result[1].stage_name).toBe('Framing')
    expect(result[1].photos[0].id).toBe('p1')
  })

  it('sorts photos within a group most-recent first', () => {
    const photos = [
      mkPhoto({ id: 'p1', stage_id: 's1', created_at: '2026-04-01T00:00:00Z' }),
      mkPhoto({ id: 'p2', stage_id: 's1', created_at: '2026-04-03T00:00:00Z' }),
      mkPhoto({ id: 'p3', stage_id: 's1', created_at: '2026-04-02T00:00:00Z' }),
    ]
    const result = groupPhotosByStage(photos, stages)
    expect(result).toHaveLength(1)
    expect(result[0].photos.map(p => p.id)).toEqual(['p2', 'p3', 'p1'])
  })

  it('puts photos without a stage in "Unassigned" group at the end', () => {
    const photos = [
      mkPhoto({ id: 'p1', stage_id: null }),
      mkPhoto({ id: 'p2', stage_id: 's1' }),
    ]
    const result = groupPhotosByStage(photos, stages)
    expect(result).toHaveLength(2)
    expect(result[0].stage_name).toBe('Foundation')
    expect(result[1].stage_name).toBe('Unassigned')
    expect(result[1].stage_color).toBe('#6B5D52')
  })

  it('omits stages with no photos', () => {
    const photos = [mkPhoto({ id: 'p1', stage_id: 's1' })]
    const result = groupPhotosByStage(photos, stages)
    expect(result).toHaveLength(1)
    expect(result[0].stage_name).toBe('Foundation')
  })

  it('returns empty array for no photos', () => {
    const result = groupPhotosByStage([], stages)
    expect(result).toEqual([])
  })
})
