import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import {
  groupPhotosByStage,
  formatFileSize,
  formatPhotoDate,
  type PhotoListItem,
} from '@/lib/photos/operations'

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

  // Load all project photos
  const { data: rawPhotos } = await supabase
    .from('photos')
    .select('id, storage_path, file_name, file_size, taken_at, created_at, task_id, stage_id')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
  const photos: PhotoListItem[] = rawPhotos ?? []

  // Load stages for grouping
  const { data: rawStages } = await supabase
    .from('stages')
    .select('id, name, color, order_index')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true })
  const stages = rawStages ?? []

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

  const grouped = groupPhotosByStage(photos, stages)

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
        <div className="space-y-6" data-testid="photo-gallery">
          {grouped.map(group => (
            <section key={group.stage_id} className="rounded-lg border border-[#E8DFD3] bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <span
                  aria-hidden="true"
                  className="h-4 w-1 rounded-full"
                  style={{ backgroundColor: group.stage_color }}
                />
                <h2 className="text-sm font-semibold text-[#2B1F17]">
                  {group.stage_name}
                  <span className="ml-1.5 font-normal text-[#6B5D52]">
                    ({group.photos.length})
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {group.photos.map(photo => (
                  <Link
                    key={photo.id}
                    href={photo.task_id ? `/tasks/${photo.task_id}` : '#'}
                    className="group overflow-hidden rounded-lg border border-[#E8DFD3] bg-[#FAF7F2] transition-shadow hover:shadow-md"
                  >
                    {signedUrls[photo.id] ? (
                      <div className="relative aspect-square w-full">
                        <Image
                          src={signedUrls[photo.id]}
                          alt={photo.file_name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center bg-[#FAF7F2]">
                        <span className="text-xs text-[#6B5D52]">No preview</span>
                      </div>
                    )}
                    <div className="p-1.5">
                      <p className="truncate text-xs font-medium text-[#2B1F17]">{photo.file_name}</p>
                      <p className="text-[10px] text-[#6B5D52]">
                        {formatPhotoDate(photo.taken_at || photo.created_at)}
                        {photo.file_size ? ` · ${formatFileSize(photo.file_size)}` : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
