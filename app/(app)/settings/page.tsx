import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureNotificationPreferences } from '@/app/actions/notifications'
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle'

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
            <div className="flex items-center justify-between py-3">
              <div>
                <span className="text-sm text-[#2B1F17]">Material order reminders</span>
                <p className="text-xs text-[#6B5D52]">
                  Alert {prefs.order_warning_days} days before order-by date
                </p>
              </div>
              <span className="text-xs text-[#87A96B] font-medium">
                {prefs.order_deadlines ? 'On' : 'Off'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <span className="text-sm text-[#2B1F17]">Overdue task alerts</span>
                <p className="text-xs text-[#6B5D52]">
                  Daily notification when tasks pass their end date
                </p>
              </div>
              <span className="text-xs text-[#87A96B] font-medium">
                {prefs.overdue_tasks ? 'On' : 'Off'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <span className="text-sm text-[#2B1F17]">Cascade summaries</span>
                <p className="text-xs text-[#6B5D52]">
                  Notify when schedule changes cascade to downstream tasks
                </p>
              </div>
              <span className="text-xs text-[#87A96B] font-medium">
                {prefs.cascade_summaries ? 'On' : 'Off'}
              </span>
            </div>
          </div>
        </div>

        {/* Project Details — placeholder for notification-settings story */}
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
