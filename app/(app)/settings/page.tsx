import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureNotificationPreferences } from '@/app/actions/notifications'
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle'
import { NotificationPreferencesPanel } from '@/components/notifications/NotificationPreferencesPanel'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // AC-PN-5: ensure notification_preferences row exists on first visit
  const prefs = await ensureNotificationPreferences()

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-[#2B1F17] mb-1">Settings</h1>
      <p className="text-[#6B5D52] text-sm mb-6">Project preferences and account configuration</p>
      <div className="space-y-4">
        {/* Notifications Section */}
        <div className="bg-white rounded-lg border border-[#E8DFD3] p-4">
          <h2 className="text-sm font-semibold text-[#2B1F17] mb-3">Notifications</h2>
          <div className="divide-y divide-[#F0EBE4]">
            <PushNotificationToggle />
          </div>
          <NotificationPreferencesPanel initialPrefs={prefs} />
        </div>

        {/* Project Details — placeholder */}
        <div className="bg-white rounded-lg border border-[#E8DFD3] p-4">
          <h2 className="text-sm font-semibold text-[#2B1F17] mb-3">Project Details</h2>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-[#FAF7F2] rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* Account — placeholder */}
        <div className="bg-white rounded-lg border border-[#E8DFD3] p-4">
          <h2 className="text-sm font-semibold text-[#2B1F17] mb-3">Account</h2>
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-10 bg-[#FAF7F2] rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
