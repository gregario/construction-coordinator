import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { SnagDetailView } from '@/components/snags/SnagDetailView'

type LooseClient = any // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function SnagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: snagId } = await params
  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load snag
  const { data: snag } = await supabase
    .from('snags')
    .select('*')
    .eq('id', snagId)
    .maybeSingle()

  if (!snag) {
    return (
      <main className="p-4">
        <h1 className="text-xl font-semibold text-[#2B1F17]">Snag not found</h1>
        <p className="mt-2 text-sm text-[#6B5D52]">
          <Link href="/snags" className="underline">← Back to Snags</Link>
        </p>
      </main>
    )
  }

  // Verify project ownership
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, user_id')
    .eq('id', snag.project_id)
    .single()
  if (!project || project.user_id !== user.id) redirect('/snags')

  // Load related data in parallel
  const [stageRes, tradesRes, photosRes, allStagesRes, allBlocksRes] = await Promise.all([
    snag.stage_id
      ? supabase.from('stages').select('id, name, color').eq('id', snag.stage_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('trades').select('id, name, phone, email').eq('project_id', project.id).order('name'),
    supabase.from('photos').select('id, storage_path, file_name, file_size, created_at').eq('snag_id', snagId).order('created_at', { ascending: false }),
    supabase.from('stages').select('id, name').eq('project_id', project.id).order('order_index'),
    supabase.from('blocks').select('id, name').eq('project_id', project.id).order('order_index'),
  ])

  const stage = stageRes.data as { id: string; name: string; color: string } | null
  const trades = (tradesRes.data ?? []) as { id: string; name: string; phone: string | null; email: string | null }[]
  const photos = (photosRes.data ?? []) as { id: string; storage_path: string; file_name: string; file_size: number | null; created_at: string }[]

  // Get block name
  let blockName: string | null = null
  if (snag.block_id) {
    const { data: block } = await supabase
      .from('blocks')
      .select('name')
      .eq('id', snag.block_id)
      .maybeSingle()
    blockName = block?.name ?? null
  }

  // Generate signed URLs for photos
  const signedUrls: Record<string, string> = {}
  if (photos.length > 0) {
    const { data: urlData } = await supabase.storage
      .from('photos')
      .createSignedUrls(photos.map(p => p.storage_path), 60)
    if (urlData) {
      for (let i = 0; i < photos.length; i++) {
        if (urlData[i]?.signedUrl) signedUrls[photos[i].id] = urlData[i].signedUrl
      }
    }
  }

  const tradeName = snag.trade_id
    ? trades.find(t => t.id === snag.trade_id)?.name ?? null
    : null
  const tradeContact = snag.trade_id
    ? trades.find(t => t.id === snag.trade_id) ?? null
    : null

  return (
    <main className="mx-auto max-w-2xl p-4 md:p-8">
      <SnagDetailView
        snag={snag}
        stage={stage}
        blockName={blockName}
        tradeName={tradeName}
        tradeContact={tradeContact}
        trades={trades}
        photos={photos}
        signedUrls={signedUrls}
        projectId={project.id}
        stages={(allStagesRes.data ?? []) as { id: string; name: string }[]}
        blocks={(allBlocksRes.data ?? []) as { id: string; name: string }[]}
      />
    </main>
  )
}
