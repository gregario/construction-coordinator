import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { validatePhotoFile } from '@/lib/photos/operations'
import nextConfig from '../next.config'

// @criterion: AC-NI-1
// AC-NI-1: next/image used in photos gallery — no raw <img> tags for photo thumbnails.
describe('photos gallery page (app/(app)/photos/page.tsx)', () => {
  const source = readFileSync(resolve(__dirname, '../app/(app)/photos/page.tsx'), 'utf8')

  it('imports Image from next/image', () => {
    expect(source).toMatch(/import Image from ['"]next\/image['"]/)
  })

  it('uses <Image component (not raw <img>) for photo thumbnails', () => {
    // Verify next/image Image component is used
    expect(source).toContain('<Image')
    // Verify no raw <img src= pattern exists in the photo rendering section
    // (allow <img in comments or data attributes, not as JSX elements)
    const rawImgMatches = source.match(/<img\s/g) ?? []
    expect(rawImgMatches).toHaveLength(0)
  })

  it('uses fill prop on Image for signed URL photos', () => {
    expect(source).toContain('fill')
    expect(source).toContain('object-cover')
  })
})

// @criterion: AC-NI-5
// AC-NI-5: No ESLint @next/next/no-img-element warnings in photo files.
describe('no raw <img> tags in photo components (AC-NI-5 code verification)', () => {
  it('photos/page.tsx has no raw <img src= elements', () => {
    const source = readFileSync(resolve(__dirname, '../app/(app)/photos/page.tsx'), 'utf8')
    const rawImgMatches = source.match(/<img\s/g) ?? []
    expect(rawImgMatches).toHaveLength(0)
  })

  it('TaskPhotosManager.tsx has no raw <img src= elements', () => {
    const source = readFileSync(resolve(__dirname, '../components/photos/TaskPhotosManager.tsx'), 'utf8')
    const rawImgMatches = source.match(/<img\s/g) ?? []
    expect(rawImgMatches).toHaveLength(0)
  })
})

// @criterion: AC-NI-3
// AC-NI-3: Supabase storage domain configured in remotePatterns.
describe('next.config.ts images.remotePatterns', () => {
  it('has images.remotePatterns configured', () => {
    expect(nextConfig.images).toBeDefined()
    expect(nextConfig.images!.remotePatterns).toBeDefined()
    expect(Array.isArray(nextConfig.images!.remotePatterns)).toBe(true)
  })

  it('includes a pattern for supabase.co storage', () => {
    const patterns = nextConfig.images!.remotePatterns as Array<{
      protocol?: string
      hostname: string
      pathname?: string
    }>
    const supabasePattern = patterns.find(p =>
      p.hostname.includes('supabase.co')
    )
    expect(supabasePattern).toBeDefined()
    expect(supabasePattern!.protocol).toBe('https')
    expect(supabasePattern!.pathname).toBe('/storage/v1/**')
  })
})

// @criterion: AC-MV-1, AC-MV-2, AC-MV-3
// AC-MV-1: Server action validates MIME type before upload.
// AC-MV-2: Server action validates file size before upload.
// AC-MV-3: Valid files still upload successfully.
// Note: These tests verify validatePhotoFile (the same function used server-side in uploadPhoto).
// The server action imports and calls validatePhotoFile before storage upload.
describe('server-side validatePhotoFile (used by uploadPhoto action)', () => {
  it('rejects unsupported MIME type with specific error', () => {
    const result = validatePhotoFile({ type: 'application/pdf', size: 1000, name: 'doc.pdf' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.message).toContain('Unsupported file type')
    }
  })

  it('rejects file over 10 MB with specific error', () => {
    const result = validatePhotoFile({ type: 'image/jpeg', size: 11_000_000, name: 'big.jpg' })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.message).toContain('10 MB')
    }
  })

  it('accepts valid JPEG under 10 MB', () => {
    const result = validatePhotoFile({ type: 'image/jpeg', size: 5_000_000, name: 'photo.jpg' })
    expect(result).toEqual({ valid: true })
  })

  it('accepts valid PNG under 10 MB', () => {
    const result = validatePhotoFile({ type: 'image/png', size: 3_000_000, name: 'screenshot.png' })
    expect(result).toEqual({ valid: true })
  })

  it('rejects text/plain MIME type', () => {
    const result = validatePhotoFile({ type: 'text/plain', size: 100, name: 'notes.txt' })
    expect(result.valid).toBe(false)
  })

  it('accepts file exactly at 10 MB boundary', () => {
    const result = validatePhotoFile({ type: 'image/jpeg', size: 10 * 1024 * 1024, name: 'max.jpg' })
    expect(result).toEqual({ valid: true })
  })
})
