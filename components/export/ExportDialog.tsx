'use client'

import { useState, useTransition, useCallback } from 'react'
import { FileJson, FileSpreadsheet, FileText, Download, X, Loader2 } from 'lucide-react'
import { fetchExportData, type ExportPayload } from '@/app/actions/export'
import { buildJsonExport, serializeJsonExport } from '@/lib/export/json-export'
import { buildStagesCsv, buildTasksCsv, buildMaterialsCsv, buildTradesCsv, type CsvTaskRow, type CsvMaterialRow } from '@/lib/export/csv-export'
import { buildZip } from '@/lib/export/zip'

export type ExportFormat = 'json' | 'csv' | 'pdf'

const FORMAT_OPTIONS: { id: ExportFormat; label: string; description: string; icon: typeof FileJson }[] = [
  { id: 'json', label: 'JSON', description: 'Full data — all entities, metadata, relationships', icon: FileJson },
  { id: 'csv', label: 'CSV', description: 'Tasks, materials, stages, trades as spreadsheets', icon: FileSpreadsheet },
  { id: 'pdf', label: 'PDF', description: 'Gantt chart snapshot (print to PDF)', icon: FileText },
]

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function buildCsvTaskRows(payload: ExportPayload): CsvTaskRow[] {
  const stageMap = new Map(payload.stages.map(s => [s.id, s.name]))
  const tradeMap = new Map(payload.trades.map(t => [t.id, t.name]))
  return payload.tasks.map(t => ({
    name: t.name,
    stage_name: stageMap.get(t.stage_id) ?? '',
    status: t.status,
    duration_days: t.duration_days,
    planned_start: t.planned_start,
    planned_end: t.planned_end,
    actual_end: t.actual_end,
    trade_name: t.trade_id ? tradeMap.get(t.trade_id) ?? null : null,
    notes: t.notes,
  }))
}

function buildCsvMaterialRows(payload: ExportPayload): CsvMaterialRow[] {
  const taskMap = new Map(payload.tasks.map(t => [t.id, t.name]))
  return payload.materials.map(m => ({
    name: m.name,
    task_name: taskMap.get(m.task_id) ?? '',
    quantity: m.quantity,
    lead_time_days: m.lead_time_days,
    order_by_date: m.order_by_date,
    order_status: m.order_status,
    estimated_cost: m.estimated_cost,
    supplier_name: m.supplier_name,
  }))
}

type Props = {
  open: boolean
  onClose: () => void
  projectName: string
}

export function ExportDialog({ open, onClose, projectName }: Props) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDownload = useCallback(() => {
    setError(null)

    if (selectedFormat === 'pdf') {
      // AC-EX-4: Open print dialog focused on /schedule (Gantt chart) with print-specific styling
      window.print()
      onClose()
      return
    }

    startTransition(async () => {
      try {
        const payload = await fetchExportData()
        const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()

        if (selectedFormat === 'json') {
          // AC-EX-2: Full JSON export
          const exportData = buildJsonExport(
            payload.project, payload.stages, payload.tasks,
            payload.materials, payload.trades, payload.photos, payload.documents,
            new Date().toISOString()
          )
          const json = serializeJsonExport(exportData)
          triggerDownload(new Blob([json], { type: 'application/json' }), `${safeName}-export.json`)
        } else if (selectedFormat === 'csv') {
          // AC-EX-3: CSV zip bundle
          const stagesCsv = buildStagesCsv(payload.stages.map(s => ({ name: s.name, color: s.color, order_index: s.order_index })))
          const tasksCsv = buildTasksCsv(buildCsvTaskRows(payload))
          const materialsCsv = buildMaterialsCsv(buildCsvMaterialRows(payload))
          const tradesCsv = buildTradesCsv(payload.trades.map(t => ({ name: t.name, specialty: t.specialty, phone: t.phone, email: t.email })))
          const zipBytes = buildZip([
            { name: 'stages.csv', content: stagesCsv },
            { name: 'tasks.csv', content: tasksCsv },
            { name: 'materials.csv', content: materialsCsv },
            { name: 'trades.csv', content: tradesCsv },
          ])
          triggerDownload(new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' }), `${safeName}-export.zip`)
        }

        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Export failed')
      }
    })
  }, [selectedFormat, projectName, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl border border-[#E8DFD3] shadow-lg w-full max-w-md mx-4 p-6"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Export Project"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#2B1F17]">Export Project</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#F0EBE4] text-[#6B5D52]" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#6B5D52] mb-4">Choose an export format for &ldquo;{projectName}&rdquo;</p>

        <div className="space-y-2 mb-6">
          {FORMAT_OPTIONS.map(opt => {
            const Icon = opt.icon
            const isSelected = selectedFormat === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedFormat(opt.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? 'border-[#8B5E3C] bg-[#8B5E3C]/5'
                    : 'border-[#E8DFD3] hover:border-[#D4A355] hover:bg-[#FAF7F2]'
                }`}
                aria-pressed={isSelected}
              >
                <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-[#8B5E3C]' : 'text-[#6B5D52]'}`} />
                <div>
                  <div className={`text-sm font-medium ${isSelected ? 'text-[#8B5E3C]' : 'text-[#2B1F17]'}`}>{opt.label}</div>
                  <div className="text-xs text-[#6B5D52]">{opt.description}</div>
                </div>
              </button>
            )
          })}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-4">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-[#6B5D52] border border-[#E8DFD3] rounded-lg hover:bg-[#FAF7F2]"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#8B5E3C] rounded-lg hover:bg-[#7A5235] disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isPending ? 'Exporting…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  )
}
