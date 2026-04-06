import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureNotificationPreferences } from '@/app/actions/notifications'
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle'
import { NotificationPreferencesPanel } from '@/components/notifications/NotificationPreferencesPanel'
import { ExportButton } from '@/components/export/ExportButton'
import { ProjectDetailsForm } from '@/components/settings/ProjectDetailsForm'
import { AccountSection } from '@/components/settings/AccountSection'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // AC-PN-5: ensure notification_preferences row exists on first visit
  const prefs = await ensureNotificationPreferences()

  // Fetch project and blocks
  const { data: project } = await (supabase.from('projects') as any)
    .select('id, name, address')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: { id: string; name: string; address: string | null } | null }

  let blocks: { name: string; attachment_type: string; storeys: number }[] = []
  if (project) {
    const { data: blockData } = await (supabase as any)
      .from('blocks')
      .select('name, attachment_type, storeys')
      .eq('project_id', project.id)
      .order('order_index', { ascending: true })
    blocks = (blockData ?? []) as typeof blocks
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-[#2B1F17] mb-6">Settings</h1>
      <div className="space-y-4">
        {/* Project Details */}
        {project && (
          <div className="bg-white rounded-lg border border-[#E8DFD3] p-4">
            <h2 className="text-sm font-semibold text-[#2B1F17] mb-3">Project Details</h2>
            <ProjectDetailsForm
              projectId={project.id}
              initialName={project.name}
              initialAddress={project.address || ''}
              blocks={blocks}
            />
          </div>
        )}

        {/* Account */}
        <div className="bg-white rounded-lg border border-[#E8DFD3] p-4">
          <h2 className="text-sm font-semibold text-[#2B1F17] mb-3">Account</h2>
          <AccountSection email={user.email || ''} />
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg border border-[#E8DFD3] p-4">
          <h2 className="text-sm font-semibold text-[#2B1F17] mb-3">Notifications</h2>
          <div className="divide-y divide-[#F0EBE4]">
            <PushNotificationToggle />
          </div>
          <NotificationPreferencesPanel initialPrefs={prefs} />
        </div>

        {/* Data Export */}
        {project && (
          <div className="bg-white rounded-lg border border-[#E8DFD3] p-4">
            <h2 className="text-sm font-semibold text-[#2B1F17] mb-3">Data</h2>
            <ExportButton projectName={project.name} />
          </div>
        )}
      </div>
    </div>
  )
}
