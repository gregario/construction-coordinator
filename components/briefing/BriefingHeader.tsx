import { RefreshButton } from '@/components/briefing/RefreshButton'

interface BriefingHeaderProps {
  projectName: string
}

export function BriefingHeader({ projectName }: BriefingHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-[#2B1F17]">
          Daily Briefing
        </h1>
        <p className="truncate text-sm text-[#6B5D52]">
          {projectName}
        </p>
      </div>
      <RefreshButton />
    </div>
  )
}
