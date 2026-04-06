import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { type PhotoListItem } from '@/lib/photos/operations'
import { FilterablePhotoGallery } from '@/components/photos/FilterablePhotoGallery'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

const SIGNED_URL_EXPIRY = 60 // seconds

export default async function PhotosPage() {
  const supabase = (await createClient()) as unknown as LooseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user's active project
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!project) redirect('/setup')

  // Load all project photos (including new tag and inspection_stage columns)
  const { data: rawPhotos } = await supabase
    .from('photos')
    .select('id, storage_path, file_name, file_size, taken_at, created_at, task_id, stage_id, tag, inspection_stage')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
  const photos: (PhotoListItem & { tag?: string; inspection_stage?: string })[] = rawPhotos ?? []

  // Generate signed URLs for all photos
  const signedUrls: Record<string, string> = {}
  if (photos.length > 0) {
    const { data: urlData } = await supabase.storage
      .from('photos')
      .createSignedUrls(
        photos.map(p => p.storage_path),
        SIGNED_URL_EXPIRY
      )
    if (urlData) {
      for (let i = 0; i < photos.length; i++) {
        if (urlData[i]?.signedUrl) {
          signedUrls[photos[i].id] = urlData[i].signedUrl
        }
      }
    }
  }

  // Normalize photos with tag defaults
  const photosWithTags = photos.map(p => ({
    id: p.id,
    storage_path: p.storage_path,
    file_name: p.file_name,
    file_size: p.file_size ?? null,
    taken_at: p.taken_at ?? null,
    created_at: p.created_at,
    task_id: p.task_id ?? null,
    stage_id: p.stage_id ?? null,
    tag: (p as any).tag || 'general',
    inspection_stage: (p as any).inspection_stage || null,
  }))

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-[#2B1F17] mb-1">Photos</h1>
      <p className="text-[#6B5D52] text-sm mb-6">
        {photos.length} photo{photos.length !== 1 ? 's' : ''} · {project.name}
      </p>

      {photos.length === 0 ? (
        <div className="rounded-lg border border-[#E8DFD3] bg-white p-8 text-center">
          <p className="text-sm text-[#6B5D52]">
            No photos yet. Add photos from substage detail pages to track site progress.
          </p>
          <Link
            href="/schedule"
            className="mt-3 inline-block text-sm font-medium text-[#8B5E3C] underline-offset-2 hover:underline"
          >
            Go to Schedule
          </Link>
        </div>
      ) : (
        <FilterablePhotoGallery photos={photosWithTags} signedUrls={signedUrls} />
      )}
    </div>
  )
}
