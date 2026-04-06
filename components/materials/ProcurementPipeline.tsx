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
}

export function ProcurementPipeline({ counts, overdueCount }: ProcurementPipelineProps) {
  const total = STATUS_ORDER.reduce((sum, s) => sum + (counts[s] || 0), 0)
  if (total === 0) return null

  return (
    <div className="space-y-3">
      {/* Pipeline bar — always shows all 5 segments */}
      <div className="flex h-10 rounded-lg overflow-hidden border border-[#E8DFD3]">
        {STATUS_ORDER.map(status => {
          const count = counts[status] || 0
          const config = STATUS_CONFIG[status]
          const hasItems = count > 0

          // Each segment gets equal minimum space, filled segments grow proportionally
          const flexBasis = hasItems
            ? Math.max((count / total) * 100, 12)
            : 12 // empty segments get 12% minimum

          return (
            <div
              key={status}
              className="flex items-center justify-center text-xs font-medium transition-all"
              style={{
                flex: `${flexBasis} 0 0`,
                backgroundColor: hasItems ? config.color : 'transparent',
                color: hasItems ? config.textColor : '#A89A8C',
                borderRight: status !== 'delivered' ? '1px solid #E8DFD3' : 'none',
              }}
              title={`${config.label}: ${count}`}
            >
              {hasItems ? (
                count
              ) : (
                <span className="text-[10px] text-[#C5BAB0]">—</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {STATUS_ORDER.map(status => {
          const count = counts[status] || 0
          const config = STATUS_CONFIG[status]
          return (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${count === 0 ? 'border border-[#D4C5B3]' : ''}`}
                style={{ backgroundColor: count > 0 ? config.color : 'transparent' }}
              />
              <span className={`text-xs ${count > 0 ? 'text-[#6B5D52]' : 'text-[#C5BAB0]'}`}>
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
