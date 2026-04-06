'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Phone, Mail, Camera, Pencil, Check } from 'lucide-react'
import {
  updateSnagStatus,
  updateSnag,
  type SnagRow,
  type SnagPriority,
  type SnagStatus,
} from '@/app/actions/snags'
import { uploadPhoto } from '@/app/actions/photos'

const PRIORITY_STYLES: Record<SnagPriority, { bg: string; text: string }> = {
  low: { bg: 'bg-[#87A96B]/20', text: 'text-[#5A8050]' },
  medium: { bg: 'bg-[#D4A355]/20', text: 'text-[#8B6F2F]' },
  high: { bg: 'bg-[#C97A3F]/20', text: 'text-[#A0603A]' },
  critical: { bg: 'bg-[#B85450]', text: 'text-white' },
}

const STATUS_LABELS: Record<SnagStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

const STATUS_COLORS: Record<SnagStatus, string> = {
  open: 'bg-[#B85450]/15 text-[#B85450]',
  in_progress: 'bg-[#D4A355]/15 text-[#8B6F2F]',
  resolved: 'bg-[#87A96B]/20 text-[#5A8050]',
}

interface SnagDetailViewProps {
  snag: SnagRow
  stage: { id: string; name: string; color: string } | null
  blockName: string | null
  tradeName: string | null
  tradeContact: { id: string; name: string; phone: string | null; email: string | null } | null
  trades: { id: string; name: string; phone: string | null; email: string | null }[]
  photos: { id: string; storage_path: string; file_name: string; file_size: number | null; created_at: string }[]
  signedUrls: Record<string, string>
  projectId: string
  stages: { id: string; name: string }[]
  blocks: { id: string; name: string }[]
}

export function SnagDetailView({
  snag: initialSnag,
  stage,
  blockName,
  tradeName: initialTradeName,
  tradeContact: initialTradeContact,
  trades,
  photos: initialPhotos,
  signedUrls,
  projectId,
  stages,
  blocks,
}: SnagDetailViewProps) {
  const [snag, setSnag] = useState(initialSnag)
  const [photos, setPhotos] = useState(initialPhotos)
  const [pending, startTransition] = useTransition()
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState(snag.description || '')
  const [editingTrade, setEditingTrade] = useState(false)
  const [editingPriority, setEditingPriority] = useState(false)
  const [localTradeId, setLocalTradeId] = useState(snag.trade_id || '')
  const [localPriority, setLocalPriority] = useState(snag.priority)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const currentTrade = trades.find(t => t.id === (snag.trade_id || localTradeId))
  const pStyle = PRIORITY_STYLES[snag.priority]

  function handleStatusChange(newStatus: SnagStatus) {
    startTransition(async () => {
      const result = await updateSnagStatus(snag.id, newStatus)
      if (result.ok) {
        setSnag(prev => ({
          ...prev,
          status: newStatus,
          resolved_at: newStatus === 'resolved' ? new Date().toISOString() : prev.resolved_at,
        }))
      }
    })
  }

  function handleSaveDescription() {
    startTransition(async () => {
      const result = await updateSnag(snag.id, { description: descriptionDraft.trim() || null })
      if (result.ok) {
        setSnag(prev => ({ ...prev, description: descriptionDraft.trim() || null }))
        setEditingDescription(false)
      }
    })
  }

  function handleSaveTrade() {
    startTransition(async () => {
      const result = await updateSnag(snag.id, { trade_id: localTradeId || null })
      if (result.ok) {
        setSnag(prev => ({ ...prev, trade_id: localTradeId || null }))
        setEditingTrade(false)
      }
    })
  }

  function handleSavePriority() {
    startTransition(async () => {
      const result = await updateSnag(snag.id, { priority: localPriority })
      if (result.ok) {
        setSnag(prev => ({ ...prev, priority: localPriority }))
        setEditingPriority(false)
      }
    })
  }

  function handlePhotoUpload(file: File) {
    setUploadingPhoto(true)
    startTransition(async () => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      formData.append('snagId', snag.id)
      formData.append('tag', 'snag')
      if (snag.stage_id) formData.append('stageId', snag.stage_id)

      const result = await uploadPhoto(formData)
      if (result.ok) {
        setPhotos(prev => [{ ...result.photo, file_size: file.size }, ...prev])
      }
      setUploadingPhoto(false)
    })
  }

  return (
    <div>
      {/* Header */}
      <header className="mb-6">
        <Link href="/snags" className="flex items-center gap-1 text-xs text-[#6B5D52] hover:underline mb-3">
          <ArrowLeft size={14} /> Back to Snags
        </Link>
        <h1 className="text-2xl font-semibold text-[#2B1F17]">{snag.title}</h1>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* Editable priority */}
          {editingPriority ? (
            <div className="flex items-center gap-1">
              <select
                value={localPriority}
                onChange={e => setLocalPriority(e.target.value as SnagPriority)}
                className="rounded-md border border-[#E8DFD3] bg-white px-2 py-0.5 text-xs"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <button type="button" onClick={handleSavePriority} disabled={pending}
                className="rounded p-0.5 text-[#5A8050] hover:bg-[#87A96B]/10">
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingPriority(true)}
              className={`text-xs font-medium px-2 py-0.5 rounded ${pStyle.bg} ${pStyle.text} hover:opacity-80`}
              title="Click to change priority"
            >
              {snag.priority}
            </button>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[snag.status]}`}>
            {STATUS_LABELS[snag.status]}
          </span>
          <span className="text-xs text-[#6B5D52]">
            Created {new Date(snag.created_at).toLocaleDateString()}
          </span>
          {snag.resolved_at && (
            <span className="text-xs text-[#5A8050]">
              Resolved {new Date(snag.resolved_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </header>

      {/* Location context */}
      <section className="rounded-lg border border-[#E8DFD3] bg-white p-4 mb-4">
        <h2 className="text-xs font-semibold text-[#6B5D52] uppercase tracking-wide mb-2">Location</h2>
        <div className="space-y-1.5">
          {blockName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#6B5D52] w-14">Block:</span>
              <span className="text-[#2B1F17] font-medium">{blockName}</span>
            </div>
          )}
          {stage && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#6B5D52] w-14">Stage:</span>
              <Link href={`/stages/${stage.id}`} className="text-[#8B5E3C] font-medium hover:underline flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                {stage.name}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Description — editable */}
      <section className="rounded-lg border border-[#E8DFD3] bg-white p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-[#6B5D52] uppercase tracking-wide">Description</h2>
          {!editingDescription && (
            <button type="button" onClick={() => { setDescriptionDraft(snag.description || ''); setEditingDescription(true) }}
              className="rounded p-1 text-[#6B5D52] hover:bg-[#F5F0E8]" aria-label="Edit description">
              <Pencil size={14} />
            </button>
          )}
        </div>
        {editingDescription ? (
          <div className="space-y-2">
            <textarea
              value={descriptionDraft}
              onChange={e => setDescriptionDraft(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Describe the snag..."
              className="w-full rounded-md border border-[#E8DFD3] px-3 py-2 text-sm resize-none"
            />
            <div className="flex gap-2">
              <button type="button" onClick={handleSaveDescription} disabled={pending}
                className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditingDescription(false)}
                className="rounded-md border border-[#E8DFD3] px-3 py-1.5 text-xs font-medium text-[#2B1F17]">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#2B1F17] whitespace-pre-wrap">
            {snag.description || <span className="text-[#A89A8C] italic">No description. Click the pencil to add one.</span>}
          </p>
        )}
      </section>

      {/* Trade — editable */}
      <section className="rounded-lg border border-[#E8DFD3] bg-white p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-[#6B5D52] uppercase tracking-wide">Assigned Trade</h2>
          {!editingTrade && (
            <button type="button" onClick={() => { setLocalTradeId(snag.trade_id || ''); setEditingTrade(true) }}
              className="rounded p-1 text-[#6B5D52] hover:bg-[#F5F0E8]" aria-label="Edit trade">
              <Pencil size={14} />
            </button>
          )}
        </div>
        {editingTrade ? (
          <div className="space-y-2">
            <select
              value={localTradeId}
              onChange={e => setLocalTradeId(e.target.value)}
              className="w-full rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-sm"
            >
              <option value="">No trade assigned</option>
              {trades.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={handleSaveTrade} disabled={pending}
                className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditingTrade(false)}
                className="rounded-md border border-[#E8DFD3] px-3 py-1.5 text-xs font-medium text-[#2B1F17]">
                Cancel
              </button>
            </div>
          </div>
        ) : currentTrade ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#2B1F17]">{currentTrade.name}</p>
            <div className="flex items-center gap-3">
              {currentTrade.phone && (
                <a href={`tel:${currentTrade.phone}`} className="flex items-center gap-1 text-xs text-[#8B5E3C] hover:underline">
                  <Phone size={12} /> {currentTrade.phone}
                </a>
              )}
              {currentTrade.email && (
                <a href={`mailto:${currentTrade.email}`} className="flex items-center gap-1 text-xs text-[#8B5E3C] hover:underline">
                  <Mail size={12} /> {currentTrade.email}
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#A89A8C] italic">No trade assigned. Click the pencil to assign one.</p>
        )}
      </section>

      {/* Photos — with upload */}
      <section className="rounded-lg border border-[#E8DFD3] bg-white p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-[#6B5D52] uppercase tracking-wide">
            Photos {photos.length > 0 && `(${photos.length})`}
          </h2>
          <label className="flex items-center gap-1 cursor-pointer rounded-md border border-[#E8DFD3] bg-[#FAF7F2] px-2.5 py-1.5 text-xs font-medium text-[#6B5D52] hover:bg-[#F3ECDF]">
            <Camera size={14} /> {uploadingPhoto ? 'Uploading…' : 'Add Photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              disabled={uploadingPhoto}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handlePhotoUpload(file)
                e.target.value = '' // reset for re-upload
              }}
            />
          </label>
        </div>
        {photos.length === 0 ? (
          <p className="text-sm text-[#A89A8C] italic">No photos yet. Add a photo to document the snag.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map(photo => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-[#E8DFD3] bg-[#FAF7F2]">
                {signedUrls[photo.id] ? (
                  <Image
                    src={signedUrls[photo.id]}
                    alt={photo.file_name}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-[#6B5D52]">
                    {photo.file_name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Status actions */}
      {snag.status !== 'resolved' && (
        <section className="rounded-lg border border-[#E8DFD3] bg-white p-4 mb-4">
          <h2 className="text-xs font-semibold text-[#6B5D52] uppercase tracking-wide mb-3">Actions</h2>
          <div className="flex gap-2">
            {snag.status === 'open' && (
              <button type="button" onClick={() => handleStatusChange('in_progress')} disabled={pending}
                className="rounded-md bg-[#D4A355]/15 px-4 py-2 text-sm font-medium text-[#8B6F2F] hover:bg-[#D4A355]/25 disabled:opacity-50">
                {pending ? 'Updating…' : 'Mark In Progress'}
              </button>
            )}
            <button type="button" onClick={() => handleStatusChange('resolved')} disabled={pending}
              className="rounded-md bg-[#87A96B]/15 px-4 py-2 text-sm font-medium text-[#5A8050] hover:bg-[#87A96B]/25 disabled:opacity-50">
              {pending ? 'Updating…' : 'Mark Resolved'}
            </button>
          </div>
        </section>
      )}

      {snag.status === 'resolved' && snag.resolved_at && (
        <div className="rounded-lg bg-[#87A96B]/10 border border-[#87A96B]/20 p-4 text-center">
          <p className="text-sm font-medium text-[#5A8050]">
            Resolved on {new Date(snag.resolved_at).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  )
}
