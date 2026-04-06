'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ClipboardList, Calendar, Package, Users,
  Layers, Camera, Settings, LogOut, AlertTriangle, MoreHorizontal,
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { ProjectSwitcher } from './ProjectSwitcher'
import type { ProjectListItem } from '@/app/actions/project-switcher'

const primaryNav = [
  { href: '/briefing', label: 'Briefing', icon: ClipboardList },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/stages', label: 'Stages', icon: Layers },
  { href: '/materials', label: 'Materials', icon: Package },
  { href: '/trades', label: 'Trades', icon: Users },
]

const secondaryNav = [
  { href: '/snags', label: 'Snags', icon: AlertTriangle },
  { href: '/photos', label: 'Photos', icon: Camera },
  { href: '/settings', label: 'Settings', icon: Settings },
]

// Mobile bottom bar: Briefing, Schedule, Stages, More
const mobileNav = [
  { href: '/briefing', label: 'Briefing', icon: ClipboardList },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/stages', label: 'Stages', icon: Layers },
]

const moreSheetItems = [
  { href: '/materials', label: 'Materials', icon: Package },
  { href: '/snags', label: 'Snags', icon: AlertTriangle },
  { href: '/trades', label: 'Trades', icon: Users },
  { href: '/photos', label: 'Photos', icon: Camera },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function NavLink({ href, label, icon: Icon, active }: {
  href: string; label: string; icon: React.ElementType; active: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
        ${active
          ? 'bg-[#8B5E3C] text-[#FAF7F2]'
          : 'text-[#6B5D52] hover:bg-[#E8DFD3] hover:text-[#2B1F17]'
        }`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={18} aria-hidden />
      <span>{label}</span>
    </Link>
  )
}

export function AppShell({
  children,
  projects,
  activeProjectId,
}: {
  children: React.ReactNode
  projects: ProjectListItem[]
  activeProjectId: string | null
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-[#E8DFD3] bg-white z-40">
        {/* Project switcher */}
        <ProjectSwitcher projects={projects} activeProjectId={activeProjectId} />

        {/* Primary nav */}
        <nav className="flex-1 p-3 space-y-0.5" aria-label="Main navigation">
          {primaryNav.map(item => (
            <NavLink
              key={item.href}
              {...item}
              active={pathname === item.href || pathname.startsWith(item.href + '/')}
            />
          ))}

          <div className="pt-3 mt-3 border-t border-[#E8DFD3]">
            {secondaryNav.map(item => (
              <NavLink
                key={item.href}
                {...item}
                active={pathname === item.href || pathname.startsWith(item.href + '/')}
              />
            ))}
          </div>
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-[#E8DFD3]">
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[#6B5D52] hover:bg-[#E8DFD3] hover:text-[#2B1F17] transition-colors"
            >
              <LogOut size={18} aria-hidden />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main
        className="md:pl-60 pb-16 md:pb-0 min-h-screen"
        id="main-content"
      >
        {children}
      </main>

      {/* Mobile bottom tab bar: Briefing, Schedule, Stages, More */}
      <MobileBottomBar pathname={pathname} />
    </div>
  )
}

function MobileBottomBar({ pathname }: { pathname: string }) {
  const [showMore, setShowMore] = useState(false)
  const isMoreActive = moreSheetItems.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-[#E8DFD3] flex items-center md:hidden z-40"
        aria-label="Bottom navigation"
      >
        {mobileNav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 min-h-[44px]
                ${active ? 'text-[#8B5E3C]' : 'text-[#6B5D52]'}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} aria-hidden />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 min-h-[44px]
            ${isMoreActive || showMore ? 'text-[#8B5E3C]' : 'text-[#6B5D52]'}`}
        >
          <MoreHorizontal size={20} aria-hidden />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* More sheet */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setShowMore(false)}
          />
          <div className="fixed bottom-14 left-0 right-0 z-50 md:hidden rounded-t-xl bg-white border-t border-[#E8DFD3] shadow-lg p-2">
            {moreSheetItems.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? 'bg-[#8B5E3C] text-[#FAF7F2]'
                      : 'text-[#6B5D52] hover:bg-[#E8DFD3] hover:text-[#2B1F17]'
                    }`}
                >
                  <Icon size={18} aria-hidden />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
