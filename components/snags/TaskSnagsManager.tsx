'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, AlertTriangle } from 'lucide-react'
import {
  createSnag,
  updateSnagStatus,
  type SnagRow,
  type SnagPriority,
  type SnagStatus,
} from '@/app/actions/snags'

interface TaskSnagsManagerProps {
  projectId: string
  taskId: string
  stageId: string
  blockId: string | null
  trades: { id: string; name: string }[]
  initialSnags: SnagRow[]
}

const PRIORITY_STYLES: Record<SnagPriority, { bg: string; text: string }> = {
  low: { bg: 'bg-[#87A96B]/20', text: 'text-[#5A8050]' },
  medium: { bg: 'bg-[#D4A355]/20', text: 'text-[#8B6F2F]' },
  high: { bg: 'bg-[#C97A3F]/20', text: 'text-[#A0603A]' },
  critical: { bg: 'bg-[#B85450]', text: 'text-white' },
}

export function TaskSnagsManager({
  projectId, taskId, stageId, blockId, trades, initialSnags,
}: TaskSnagsManagerProps) {
  const [snags, setSnags] = useState(initialSnags)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<SnagPriority>('medium')
  const [tradeId, setTradeId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const openSnags = snags.filter(s => s.status !== 'resolved')
  const resolvedSnags = snags.filter(s => s.status === 'resolved')

  function handleCreate() {
    if (!title.trim()) { setError('Title is required'); return }
    startTransition(async () => {
      const result = await createSnag(projectId, {
        title: title.trim(),
        priority,
        stage_id: stageId,
        block_id: blockId,
        trade_id: tradeId || null,
      })
      if (!result.ok) { setError(result.error); return }
      setSnags(prev => [{
        id: result.id,
        project_id: projectId,
        block_id: blockId,
        stage_id: stageId,
        trade_id: tradeId || null,
        title: title.trim(),
        description: null,
        priority,
        status: 'open' as SnagStatus,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, ...prev])
      setShowForm(false)
      setTitle('')
      setPriority('medium')
      setTradeId('')
      setError(null)
    })
  }

  function handleResolve(snagId: string) {
    startTransition(async () => {
      const result = await updateSnagStatus(snagId, 'resolved')
      if (result.ok) {
        setSnags(prev => prev.map(s =>
          s.id === snagId ? { ...s, status: 'resolved' as SnagStatus, resolved_at: new Date().toISOString() } : s
        ))
      }
    })
  }

  const tradeMap = new Map(trades.map(t => [t.id, t.name]))

  return (
    <section className="mt-6 rounded-lg border border-[#E8DFD3] bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#2B1F17]">
            Snags {snags.length > 0 && <span className="font-normal text-[#6B5D52]">({openSnags.length} open)</span>}
          </h2>
          <p className="text-xs text-[#6B5D52]">Defects to fix for this substage.</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={pending}
            className="flex items-center gap-1 rounded-md border border-[#E8DFD3] bg-[#FAF7F2] px-2.5 py-1.5 text-xs font-medium text-[#2B1F17] hover:bg-[#F3ECDF] disabled:opacity-50"
          >
            <Plus size={14} /> Add Snag
          </button>
        )}
      </div>

      {showForm && (
        <div className="mt-3 rounded-md border border-[#8B5E3C]/30 bg-[#FAF7F2] p-3 space-y-2">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Snag title"
            autoFocus
            maxLength={200}
            className="w-full rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as SnagPriority)}
              className="rounded-md border border-[#E8DFD3] bg-white px-2 py-1.5 text-xs"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={tradeId}
              onChange={e => setTradeId(e.target.value)}
              className="flex-1 rounded-md border border-[#E8DFD3] bg-white px-2 py-1.5 text-xs"
            >
              <option value="">No trade</option>
              {trades.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-[#B85450]">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={handleCreate} disabled={pending}
              className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              {pending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(null) }}
              className="rounded-md border border-[#E8DFD3] bg-white px-3 py-1.5 text-xs font-medium text-[#2B1F17]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {snags.length === 0 && !showForm ? (
        <p className="mt-3 text-xs text-[#6B5D52]">No snags for this substage.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {openSnags.map(snag => {
            const pStyle = PRIORITY_STYLES[snag.priority]
            return (
              <li key={snag.id} className="flex items-center gap-2 rounded-md bg-[#FAF7F2] px-3 py-2">
                <AlertTriangle size={14} className="text-[#C97A3F] shrink-0" />
                <Link href={`/snags/${snag.id}`} className="flex-1 text-xs font-medium text-[#2B1F17] hover:underline truncate">
                  {snag.title}
                </Link>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${pStyle.bg} ${pStyle.text}`}>
                  {snag.priority}
                </span>
                {snag.trade_id && tradeMap.has(snag.trade_id) && (
                  <span className="text-[10px] text-[#A89A8C] hidden sm:inline">{tradeMap.get(snag.trade_id)}</span>
                )}
                <button
                  type="button"
                  onClick={() => handleResolve(snag.id)}
                  disabled={pending}
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-[#5A8050] bg-[#87A96B]/10 hover:bg-[#87A96B]/20 disabled:opacity-50"
                >
                  Resolve
                </button>
              </li>
            )
          })}
          {resolvedSnags.length > 0 && (
            <li className="text-[10px] text-[#A89A8C] pt-1">
              {resolvedSnags.length} resolved
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
