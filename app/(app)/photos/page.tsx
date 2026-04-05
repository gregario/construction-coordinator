import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function PhotosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-[#2B1F17] mb-1">Photos</h1>
      <p className="text-[#6B5D52] text-sm mb-6">Site progress photos and documentation</p>
      <div className="space-y-4">
        {['Recent Uploads', 'By Stage', 'Flagged'].map(section => (
          <div key={section} className="bg-white rounded-lg border border-[#E8DFD3] p-4">
            <h2 className="text-sm font-semibold text-[#2B1F17] mb-3">{section}</h2>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-square bg-[#FAF7F2] rounded animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
