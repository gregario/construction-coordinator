'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ClipboardList, Calendar, Package, Users,
  Layers, Camera, Settings, LogOut, Building2,
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'

const primaryNav = [
  { href: '/briefing', label: 'Briefing', icon: ClipboardList },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/materials', label: 'Materials', icon: Package },
  { href: '/trades', label: 'Trades', icon: Users },
]

const secondaryNav = [
  { href: '/stages', label: 'Stages', icon: Layers },
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-[#E8DFD3] bg-white z-40">
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-[#E8DFD3]">
          <Building2 size={20} className="text-[#8B5E3C]" aria-hidden />
          <span className="font-semibold text-[#2B1F17] text-sm leading-tight">
            Self-Build<br />Manager
          </span>
        </div>

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

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-[#E8DFD3] flex items-center md:hidden z-40"
        aria-label="Bottom navigation"
      >
        {primaryNav.map(item => {
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
      </nav>
    </div>
  )
}
