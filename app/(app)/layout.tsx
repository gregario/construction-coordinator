import { AppShell } from '@/components/layout/AppShell'
import { ServiceWorkerRegistrar } from '@/components/notifications/ServiceWorkerRegistrar'
import { listUserProjects, getActiveProjectId } from '@/app/actions/project-switcher'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [projects, activeProjectId] = await Promise.all([
    listUserProjects(),
    getActiveProjectId(),
  ])

  // If no active project cookie set, use the first project
  const effectiveActiveId = activeProjectId && projects.some(p => p.id === activeProjectId)
    ? activeProjectId
    : projects[0]?.id ?? null

  return (
    <>
      <ServiceWorkerRegistrar />
      <AppShell projects={projects} activeProjectId={effectiveActiveId}>
        {children}
      </AppShell>
    </>
  )
}
