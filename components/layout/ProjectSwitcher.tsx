'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ChevronDown, Plus } from 'lucide-react'
import { switchActiveProject, type ProjectListItem } from '@/app/actions/project-switcher'

interface ProjectSwitcherProps {
  projects: ProjectListItem[]
  activeProjectId: string | null
}

export function ProjectSwitcher({ projects, activeProjectId }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0]

  function handleSwitch(projectId: string) {
    if (projectId === activeProject?.id) {
      setOpen(false)
      return
    }
    startTransition(async () => {
      const result = await switchActiveProject(projectId)
      if (result.ok) {
        setOpen(false)
        router.refresh()
      }
    })
  }

  function handleNewProject() {
    setOpen(false)
    router.push('/setup?new=true')
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-4 border-b border-[#E8DFD3] hover:bg-[#F5F0E8] transition-colors"
      >
        <Building2 size={20} className="text-[#8B5E3C] shrink-0" aria-hidden />
        <div className="flex-1 min-w-0 text-left">
          <div className="font-semibold text-[#2B1F17] text-sm truncate">
            {activeProject?.name || 'No project'}
          </div>
          {activeProject && (
            <div className="text-[10px] text-[#6B5D52]">
              {activeProject.status === 'setup' ? 'Setting up' : activeProject.status === 'active' ? 'Active' : 'Complete'}
            </div>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-[#6B5D52] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full z-50 mt-1 rounded-lg border border-[#E8DFD3] bg-white shadow-lg">
          {projects.map(project => (
            <button
              key={project.id}
              type="button"
              onClick={() => handleSwitch(project.id)}
              disabled={pending}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                project.id === activeProject?.id
                  ? 'bg-[#8B5E3C]/5 text-[#8B5E3C] font-medium'
                  : 'text-[#2B1F17] hover:bg-[#F5F0E8]'
              }`}
            >
              {project.id === activeProject?.id && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5E3C] shrink-0" />
              )}
              <span className="truncate">{project.name}</span>
              <span className="ml-auto text-[10px] text-[#A89A8C]">
                {project.status === 'setup' ? 'Setup' : project.status === 'active' ? 'Active' : ''}
              </span>
            </button>
          ))}
          <div className="border-t border-[#E8DFD3]">
            <button
              type="button"
              onClick={handleNewProject}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[#6B5D52] hover:bg-[#F5F0E8]"
            >
              <Plus size={14} />
              New Project
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}
