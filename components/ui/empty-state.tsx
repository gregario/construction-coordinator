import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; href: string }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-[#E8DFD3] flex items-center justify-center mb-4">
        <Icon size={24} className="text-[#8B5E3C]" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-[#2B1F17] mb-1">{title}</h3>
      <p className="text-sm text-[#6B5D52] max-w-xs">{description}</p>
      {action && (
        <a
          href={action.href}
          className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-[#8B5E3C] text-[#FAF7F2] text-sm font-medium hover:bg-[#754C30] transition-colors"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}
