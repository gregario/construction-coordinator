import { AppShell } from '@/components/layout/AppShell'
import { ServiceWorkerRegistrar } from '@/components/notifications/ServiceWorkerRegistrar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceWorkerRegistrar />
      <AppShell>{children}</AppShell>
    </>
  )
}
