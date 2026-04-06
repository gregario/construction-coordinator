'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import {
  createSnag,
  updateSnagStatus,
  type SnagRow,
  type SnagPriority,
  type SnagStatus,
  type CreateSnagInput,
} from '@/app/actions/snags'

interface SnagListProps {
  projectId: string
  initialSnags: SnagRow[]
  blocks: { id: string; name: string }[]
  stages: { id: string; name: string }[]
  trades: { id: string; name: string }[]
}

const PRIORITY_STYLES: Record<SnagPriority, { bg: string; text: string }> = {
  low: { bg: 'bg-[#87A96B]/20', text: 'text-[#5A8050]' },
  medium: { bg: 'bg-[#D4A355]/20', text: 'text-[#8B6F2F]' },
  high: { bg: 'bg-[#C97A3F]/20', text: 'text-[#A0603A]' },
  critical: { bg: 'bg-[#B85450] ', text: 'text-white' },
}

export function SnagList({ projectId, initialSnags, blocks, stages, trades }: SnagListProps) {
  const [snags, setSnags] = useState(initialSnags)
  const [showForm, setShowForm] = useState(false)
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

  const openSnags = snags.filter(s => s.status === 'open')
  const inProgressSnags = snags.filter(s => s.status === 'in_progress')
  const resolvedSnags = snags.filter(s => s.status === 'resolved')
  const [showResolved, setShowResolved] = useState(false)

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
      if (!result.ok) { setError(result.error); return }
      setSnags(prev => prev.map(s => {
        if (s.id !== snagId) return s
        return {
          ...s,
          status: newStatus,
          resolved_at: newStatus === 'resolved' ? new Date().toISOString() : s.resolved_at,
        }
      }))
    })
  }

  function resetForm() {
    setTitle(''); setDescription(''); setPriority('medium')
    setBlockId(''); setStageId(''); setTradeId('')
    setPhotoFile(null); setError(null)
  }

  const tradeMap = new Map(trades.map(t => [t.id, t.name]))
  const blockMap = new Map(blocks.map(b => [b.id, b.name]))

  return (
    <div className="space-y-4">
      {/* Summary */}
      <p className="text-xs text-[#6B5D52]">
        {openSnags.length} open · {inProgressSnags.length} in progress · {resolvedSnags.length} resolved
      </p>

      {/* Add button */}
      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-md bg-[#2B1F17] px-3 py-2 text-xs font-medium text-white hover:bg-[#3A2A1E]"
        >
          <Plus size={14} /> New Snag
        </button>
      )}

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
              className="rounded-md border border-[#E8DFD3] bg-white px-2 py-1.5 text-xs"
            >
              <option value="">No trade</option>
              {trades.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select
              value={blockId}
              onChange={e => setBlockId(e.target.value)}
              className="rounded-md border border-[#E8DFD3] bg-white px-2 py-1.5 text-xs"
            >
              <option value="">No block</option>
              {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select
              value={stageId}
              onChange={e => setStageId(e.target.value)}
              className="rounded-md border border-[#E8DFD3] bg-white px-2 py-1.5 text-xs"
            >
              <option value="">No stage</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {/* Photo upload */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#6B5D52] hover:text-[#2B1F17]">
              <span className="rounded-md border border-[#E8DFD3] bg-white px-3 py-1.5">
                📷 Add Photo
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) setPhotoFile(file)
                }}
              />
              {photoFile && <span className="text-xs text-[#5A8050]">{photoFile.name}</span>}
            </label>
          </div>
          {error && <p role="alert" className="text-xs text-[#B85450]">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={handleCreate} disabled={pending}
              className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A2A1E] disabled:opacity-50">
              {pending ? 'Saving…' : 'Save Snag'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              className="rounded-md border border-[#E8DFD3] bg-white px-3 py-1.5 text-xs font-medium text-[#2B1F17]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Snag sections */}
      {snags.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-[#E8DFD3] bg-white p-8 text-center">
          <p className="text-sm text-[#6B5D52]">No snags yet — that&apos;s a good sign!</p>
        </div>
      ) : (
        <>
          <SnagSection
            title="Open"
            snags={openSnags}
            tradeMap={tradeMap}
            blockMap={blockMap}
            onStatusChange={handleStatusChange}
            pending={pending}
          />
          <SnagSection
            title="In Progress"
            snags={inProgressSnags}
            tradeMap={tradeMap}
            blockMap={blockMap}
            onStatusChange={handleStatusChange}
            pending={pending}
          />
          {resolvedSnags.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowResolved(!showResolved)}
                className="text-xs font-medium text-[#6B5D52] hover:text-[#2B1F17]"
              >
                {showResolved ? '▾' : '▸'} {resolvedSnags.length} resolved
              </button>
              {showResolved && (
                <div className="mt-2">
                  <SnagSection
                    title=""
                    snags={resolvedSnags}
                    tradeMap={tradeMap}
                    blockMap={blockMap}
                    onStatusChange={handleStatusChange}
                    pending={pending}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SnagSection({
  title, snags, tradeMap, blockMap, onStatusChange, pending,
}: {
  title: string
  snags: SnagRow[]
  tradeMap: Map<string, string>
  blockMap: Map<string, string>
  onStatusChange: (id: string, status: SnagStatus) => void
  pending: boolean
}) {
  if (snags.length === 0) return null

  return (
    <div>
      {title && <h3 className="text-xs font-semibold text-[#2B1F17] mb-2">{title}</h3>}
      <div className="space-y-2">
        {snags.map(snag => {
          const pStyle = PRIORITY_STYLES[snag.priority]
          return (
            <div
              key={snag.id}
              className="rounded-lg border border-[#E8DFD3] bg-white p-3"
              style={{ borderLeftWidth: '4px', borderLeftColor: pStyle.bg.includes('#B85450') ? '#B85450' : pStyle.bg.includes('#C97A3F') ? '#C97A3F' : pStyle.bg.includes('#D4A355') ? '#D4A355' : '#87A96B' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#2B1F17]">{snag.title}</span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${pStyle.bg} ${pStyle.text}`}>
                      {snag.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#6B5D52]">
                    {snag.trade_id && tradeMap.has(snag.trade_id) && (
                      <span>{tradeMap.get(snag.trade_id)}</span>
                    )}
                    {snag.block_id && blockMap.has(snag.block_id) && (
                      <span>{blockMap.get(snag.block_id)}</span>
                    )}
                    <span>{new Date(snag.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {snag.status === 'open' && (
                    <button
                      type="button"
                      onClick={() => onStatusChange(snag.id, 'in_progress')}
                      disabled={pending}
                      className="rounded px-2 py-1 text-xs font-medium text-[#8B6F2F] bg-[#D4A355]/15 hover:bg-[#D4A355]/25 disabled:opacity-50"
                    >
                      Start
                    </button>
                  )}
                  {(snag.status === 'open' || snag.status === 'in_progress') && (
                    <button
                      type="button"
                      onClick={() => onStatusChange(snag.id, 'resolved')}
                      disabled={pending}
                      className="rounded px-2 py-1 text-xs font-medium text-[#5A8050] bg-[#87A96B]/15 hover:bg-[#87A96B]/25 disabled:opacity-50"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
