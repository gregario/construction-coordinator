'use client'

const STATUS_ORDER = ['not_quoted', 'quoted', 'ordered', 'in_transit', 'delivered'] as const
type ProcurementStatus = typeof STATUS_ORDER[number]

const STATUS_CONFIG: Record<ProcurementStatus, { label: string; color: string; textColor: string }> = {
  not_quoted: { label: 'Not Quoted', color: '#9B8B7A', textColor: 'white' },
  quoted: { label: 'Quoted', color: '#6B8F9B', textColor: 'white' },
  ordered: { label: 'Ordered', color: '#8B7DB8', textColor: 'white' },
  in_transit: { label: 'In Transit', color: '#D4A355', textColor: '#2B1F17' },
  delivered: { label: 'Delivered', color: '#5A8050', textColor: 'white' },
}

interface ProcurementPipelineProps {
  counts: Record<string, number>
  overdueCount: number
  onStatusFilter?: (status: string | null) => void
}

export function ProcurementPipeline({ counts, overdueCount, onStatusFilter }: ProcurementPipelineProps) {
  const total = STATUS_ORDER.reduce((sum, s) => sum + (counts[s] || 0), 0)
  if (total === 0) return null

  return (
    <div className="space-y-3">
      {/* Pipeline bar */}
      <div className="flex h-10 rounded-lg overflow-hidden border border-[#E8DFD3]">
        {STATUS_ORDER.map(status => {
          const count = counts[status] || 0
          if (count === 0) return null
          const config = STATUS_CONFIG[status]
          const widthPercent = Math.max((count / total) * 100, 8) // min 8% for visibility
          return (
            <button
              key={status}
              type="button"
              onClick={() => onStatusFilter?.(status)}
              className="flex items-center justify-center text-xs font-medium transition-opacity hover:opacity-90"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: config.color,
                color: config.textColor,
                minWidth: '48px',
              }}
              title={`${config.label}: ${count}`}
            >
              {count}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {STATUS_ORDER.map(status => {
          const count = counts[status] || 0
          if (count === 0) return null
          const config = STATUS_CONFIG[status]
          return (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-xs text-[#6B5D52]">
                {config.label} ({count})
              </span>
            </div>
          )
        })}
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-[#B85450]/10 border border-[#B85450]/20 px-3 py-2">
          <span className="text-sm">⚠</span>
          <span className="text-xs font-medium text-[#B85450]">
            {overdueCount} material{overdueCount !== 1 ? 's' : ''} past order-by date
          </span>
        </div>
      )}
    </div>
  )
}
