// Run once during initial deployment to create Supabase Storage buckets.
// Safe to re-run — existing buckets are ignored.
// Usage: import { setupStorageBuckets } from '@/lib/supabase/setup-buckets'
//        await setupStorageBuckets()

import { createServiceClient } from './service'

export async function setupStorageBuckets() {
  const supabase = createServiceClient()

  // Photos bucket: authenticated users only, 10 MB max, images only
  const { error: photosError } = await supabase.storage.createBucket('photos', {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  })
  if (photosError && !photosError.message.includes('already exists')) {
    console.error('Failed to create photos bucket:', photosError.message)
    throw photosError
  }

  // Documents bucket: authenticated users only, 25 MB max
  const { error: docsError } = await supabase.storage.createBucket('documents', {
    public: false,
    fileSizeLimit: 25 * 1024 * 1024,
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
  })
  if (docsError && !docsError.message.includes('already exists')) {
    console.error('Failed to create documents bucket:', docsError.message)
    throw docsError
  }

  console.log('Storage buckets ready: photos, documents')
}
