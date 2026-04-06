'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Camera } from 'lucide-react'
import {
  createSnag,
  updateSnagStatus,
  type SnagRow,
  type SnagPriority,
  type SnagStatus,
  type CreateSnagInput,
} from '@/app/actions/snags'
import { uploadPhoto } from '@/app/actions/photos'

interface SnagListProps {
  projectId: string
  initialSnags: SnagRow[]
  blocks: { id: string; name: string }[]
  stages: { id: string; name: string }[]
  trades: { id: string; name: string }[]
  stageMap: Record<string, { name: string; color: string }>
  photoCountBySnag: Record<string, number>
}

const PRIORITY_STYLES: Record<SnagPriority, { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-[#87A96B]/20', text: 'text-[#5A8050]', border: '#87A96B' },
  medium: { bg: 'bg-[#D4A355]/20', text: 'text-[#8B6F2F]', border: '#D4A355' },
  high: { bg: 'bg-[#C97A3F]/20', text: 'text-[#A0603A]', border: '#C97A3F' },
  critical: { bg: 'bg-[#B85450]', text: 'text-white', border: '#B85450' },
}

type GroupBy = 'status' | 'stage' | 'trade'

export function SnagList({
  projectId, initialSnags, blocks, stages, trades, stageMap, photoCountBySnag,
}: SnagListProps) {
  const [snags, setSnags] = useState(initialSnags)
  const [showForm, setShowForm] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>('status')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<SnagPriority>('medium')
  const [blockId, setBlockId] = useState('')
  const [stageId, setStageId] = useState('')
  const [tradeId, setTradeId] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const openCount = snags.filter(s => s.status === 'open').length
  const inProgressCount = snags.filter(s => s.status === 'in_progress').length
  const resolvedCount = snags.filter(s => s.status === 'resolved').length

  const tradeMap = new Map(trades.map(t => [t.id, t.name]))
  const blockMap = new Map(blocks.map(b => [b.id, b.name]))

  function resetForm() {
    setTitle(''); setDescription(''); setPriority('medium')
    setBlockId(''); setStageId(''); setTradeId('')
    setPhotoFile(null); setError(null)
  }

  function handleCreate() {
    if (!title.trim()) { setError('Title is required'); return }
    startTransition(async () => {
      const input: CreateSnagInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        block_id: blockId || null,
        stage_id: stageId || null,
        trade_id: tradeId || null,
      }
      const result = await createSnag(projectId, input)
      if (!result.ok) { setError(result.error); return }

      // Upload photo if one was selected
      if (photoFile) {
        const formData = new FormData()
        formData.append('file', photoFile)
        formData.append('projectId', projectId)
        formData.append('snagId', result.id)
        formData.append('tag', 'snag')
        if (stageId) formData.append('stageId', stageId)
        await uploadPhoto(formData)
      }

      const newSnag: SnagRow = {
        id: result.id,
        project_id: projectId,
        block_id: blockId || null,
        stage_id: stageId || null,
        trade_id: tradeId || null,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        status: 'open',
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setSnags(prev => [newSnag, ...prev])
      setShowForm(false)
      resetForm()
    })
  }

  function handleStatusChange(snagId: string, newStatus: SnagStatus) {
    startTransition(async () => {
      const result = await updateSnagStatus(snagId, newStatus)
      if (!result.ok) return
      setSnags(prev => prev.map(s =>
        s.id === snagId
          ? { ...s, status: newStatus, resolved_at: newStatus === 'resolved' ? new Date().toISOString() : s.resolved_at }
          : s
      ))
    })
  }

  // Group snags
  const groups = groupSnags(snags, groupBy, stageMap, tradeMap)

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#6B5D52]">
          {openCount} open · {inProgressCount} in progress · {resolvedCount} resolved
        </p>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A2A1E]"
          >
            <Plus size={14} /> New Snag
          </button>
        )}
      </div>

      {/* Grouping toggle */}
      <div className="flex gap-1">
        {(['status', 'stage', 'trade'] as const).map(g => (
          <button
            key={g}
            type="button"
            onClick={() => setGroupBy(g)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              groupBy === g
                ? 'bg-[#8B5E3C] text-white'
                : 'bg-white text-[#6B5D52] border border-[#E8DFD3] hover:bg-[#F5F0E8]'
            }`}
          >
            By {g === 'status' ? 'Status' : g === 'stage' ? 'Stage' : 'Trade'}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-lg border border-[#8B5E3C]/30 bg-[#FAF7F2] p-4 space-y-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Snag title"
            autoFocus
            maxLength={200}
            className="w-full rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={priority} onChange={e => setPriority(e.target.value as SnagPriority)}
              className="rounded-md border border-[#E8DFD3] bg-white px-2 py-1.5 text-xs">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select value={tradeId} onChange={e => setTradeId(e.target.value)}
              className="rounded-md border border-[#E8DFD3] bg-white px-2 py-1.5 text-xs">
              <option value="">No trade</option>
              {trades.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={blockId} onChange={e => setBlockId(e.target.value)}
              className="rounded-md border border-[#E8DFD3] bg-white px-2 py-1.5 text-xs">
              <option value="">No block</option>
              {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={stageId} onChange={e => setStageId(e.target.value)}
              className="rounded-md border border-[#E8DFD3] bg-white px-2 py-1.5 text-xs">
              <option value="">No stage</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#6B5D52] hover:text-[#2B1F17]">
            <span className="rounded-md border border-[#E8DFD3] bg-white px-3 py-1.5 flex items-center gap-1">
              <Camera size={14} /> Add Photo
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setPhotoFile(f) }} />
            {photoFile && <span className="text-xs text-[#5A8050]">{photoFile.name}</span>}
          </label>
          {error && <p role="alert" className="text-xs text-[#B85450]">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={handleCreate} disabled={pending}
              className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              {pending ? 'Saving…' : 'Save Snag'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              className="rounded-md border border-[#E8DFD3] bg-white px-3 py-1.5 text-xs font-medium text-[#2B1F17]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grouped snag list */}
      {snags.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-[#E8DFD3] bg-white p-8 text-center">
          <p className="text-sm text-[#6B5D52]">No snags yet — that&apos;s a good sign!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-2">
                {group.color && (
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                )}
                <h3 className="text-xs font-semibold text-[#2B1F17] uppercase tracking-wide">
                  {group.label}
                </h3>
                <span className="text-xs text-[#A89A8C]">({group.snags.length})</span>
              </div>
              <div className="space-y-2">
                {group.snags.map(snag => (
                  <SnagCard
                    key={snag.id}
                    snag={snag}
                    stageMap={stageMap}
                    tradeMap={tradeMap}
                    blockMap={blockMap}
                    photoCount={photoCountBySnag[snag.id] || 0}
                    onStatusChange={handleStatusChange}
                    pending={pending}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SnagCard({
  snag, stageMap, tradeMap, blockMap, photoCount, onStatusChange, pending,
}: {
  snag: SnagRow
  stageMap: Record<string, { name: string; color: string }>
  tradeMap: Map<string, string>
  blockMap: Map<string, string>
  photoCount: number
  onStatusChange: (id: string, status: SnagStatus) => void
  pending: boolean
}) {
  const pStyle = PRIORITY_STYLES[snag.priority]
  const stageInfo = snag.stage_id ? stageMap[snag.stage_id] : null

  return (
    <div
      className="rounded-lg border border-[#E8DFD3] bg-white overflow-hidden"
      style={{ borderLeftWidth: '4px', borderLeftColor: pStyle.border }}
    >
      <Link href={`/snags/${snag.id}`} className="block p-3 hover:bg-[#F5F0E8] transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#2B1F17] truncate">{snag.title}</span>
              <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${pStyle.bg} ${pStyle.text}`}>
                {snag.priority}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#6B5D52] flex-wrap">
              {stageInfo && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stageInfo.color }} />
                  {stageInfo.name}
                </span>
              )}
              {snag.trade_id && tradeMap.has(snag.trade_id) && (
                <span>· {tradeMap.get(snag.trade_id)}</span>
              )}
              {snag.block_id && blockMap.has(snag.block_id) && (
                <span>· {blockMap.get(snag.block_id)}</span>
              )}
              {photoCount > 0 && (
                <span className="flex items-center gap-0.5">
                  · <Camera size={10} /> {photoCount}
                </span>
              )}
              <span>· {new Date(snag.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </Link>
      {snag.status !== 'resolved' && (
        <div className="flex gap-1 px-3 pb-2">
          {snag.status === 'open' && (
            <button type="button" onClick={() => onStatusChange(snag.id, 'in_progress')} disabled={pending}
              className="rounded px-2 py-0.5 text-[10px] font-medium text-[#8B6F2F] bg-[#D4A355]/10 hover:bg-[#D4A355]/20 disabled:opacity-50">
              Start
            </button>
          )}
          <button type="button" onClick={() => onStatusChange(snag.id, 'resolved')} disabled={pending}
            className="rounded px-2 py-0.5 text-[10px] font-medium text-[#5A8050] bg-[#87A96B]/10 hover:bg-[#87A96B]/20 disabled:opacity-50">
            Resolve
          </button>
        </div>
      )}
    </div>
  )
}

type SnagGroup = { label: string; color?: string; snags: SnagRow[] }

function groupSnags(
  snags: SnagRow[],
  groupBy: GroupBy,
  stageMap: Record<string, { name: string; color: string }>,
  tradeMap: Map<string, string>
): SnagGroup[] {
  if (groupBy === 'status') {
    const open = snags.filter(s => s.status === 'open')
    const inProgress = snags.filter(s => s.status === 'in_progress')
    const resolved = snags.filter(s => s.status === 'resolved')
    const groups: SnagGroup[] = []
    if (open.length) groups.push({ label: 'Open', snags: open })
    if (inProgress.length) groups.push({ label: 'In Progress', snags: inProgress })
    if (resolved.length) groups.push({ label: 'Resolved', snags: resolved })
    return groups
  }

  if (groupBy === 'stage') {
    const byStage = new Map<string, SnagRow[]>()
    const noStage: SnagRow[] = []
    for (const s of snags) {
      if (s.stage_id && stageMap[s.stage_id]) {
        const list = byStage.get(s.stage_id) || []
        list.push(s)
        byStage.set(s.stage_id, list)
      } else {
        noStage.push(s)
      }
    }
    const groups: SnagGroup[] = []
    for (const [stageId, stageSnags] of byStage) {
      const info = stageMap[stageId]
      groups.push({ label: info.name, color: info.color, snags: stageSnags })
    }
    if (noStage.length) groups.push({ label: 'No stage', snags: noStage })
    return groups
  }

  if (groupBy === 'trade') {
    const byTrade = new Map<string, SnagRow[]>()
    const noTrade: SnagRow[] = []
    for (const s of snags) {
      if (s.trade_id && tradeMap.has(s.trade_id)) {
        const list = byTrade.get(s.trade_id) || []
        list.push(s)
        byTrade.set(s.trade_id, list)
      } else {
        noTrade.push(s)
      }
    }
    const groups: SnagGroup[] = []
    for (const [tradeId, tradeSnags] of byTrade) {
      groups.push({ label: tradeMap.get(tradeId)!, snags: tradeSnags })
    }
    if (noTrade.length) groups.push({ label: 'Unassigned', snags: noTrade })
    return groups
  }

  return [{ label: 'All', snags }]
}
