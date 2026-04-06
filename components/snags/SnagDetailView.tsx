'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Phone, Mail } from 'lucide-react'
import {
  updateSnagStatus,
  type SnagRow,
  type SnagPriority,
  type SnagStatus,
} from '@/app/actions/snags'

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
}

export function SnagDetailView({
  snag: initialSnag,
  stage,
  blockName,
  tradeName,
  tradeContact,
  trades,
  photos,
  signedUrls,
  projectId,
}: SnagDetailViewProps) {
  const [snag, setSnag] = useState(initialSnag)
  const [pending, startTransition] = useTransition()
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

  return (
    <div>
      {/* Header */}
      <header className="mb-6">
        <Link
          href="/snags"
          className="flex items-center gap-1 text-xs text-[#6B5D52] hover:underline mb-3"
        >
          <ArrowLeft size={14} /> Back to Snags
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-[#2B1F17]">{snag.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${pStyle.bg} ${pStyle.text}`}>
                {snag.priority}
              </span>
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
          </div>
        </div>
      </header>

      {/* Context — where is this snag? */}
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

      {/* Description */}
      {snag.description && (
        <section className="rounded-lg border border-[#E8DFD3] bg-white p-4 mb-4">
          <h2 className="text-xs font-semibold text-[#6B5D52] uppercase tracking-wide mb-2">Description</h2>
          <p className="text-sm text-[#2B1F17] whitespace-pre-wrap">{snag.description}</p>
        </section>
      )}

      {/* Trade */}
      <section className="rounded-lg border border-[#E8DFD3] bg-white p-4 mb-4">
        <h2 className="text-xs font-semibold text-[#6B5D52] uppercase tracking-wide mb-2">Assigned Trade</h2>
        {tradeContact ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#2B1F17]">{tradeContact.name}</p>
            <div className="flex items-center gap-3">
              {tradeContact.phone && (
                <a href={`tel:${tradeContact.phone}`} className="flex items-center gap-1 text-xs text-[#8B5E3C] hover:underline">
                  <Phone size={12} /> {tradeContact.phone}
                </a>
              )}
              {tradeContact.email && (
                <a href={`mailto:${tradeContact.email}`} className="flex items-center gap-1 text-xs text-[#8B5E3C] hover:underline">
                  <Mail size={12} /> {tradeContact.email}
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#6B5D52]">No trade assigned</p>
        )}
      </section>

      {/* Photos */}
      <section className="rounded-lg border border-[#E8DFD3] bg-white p-4 mb-4">
        <h2 className="text-xs font-semibold text-[#6B5D52] uppercase tracking-wide mb-2">
          Photos {photos.length > 0 && `(${photos.length})`}
        </h2>
        {photos.length === 0 ? (
          <p className="text-sm text-[#6B5D52]">No photos attached yet.</p>
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
                  <div className="flex items-center justify-center h-full text-xs text-[#6B5D52]">No preview</div>
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
              <button
                type="button"
                onClick={() => handleStatusChange('in_progress')}
                disabled={pending}
                className="rounded-md bg-[#D4A355]/15 px-4 py-2 text-sm font-medium text-[#8B6F2F] hover:bg-[#D4A355]/25 disabled:opacity-50"
              >
                {pending ? 'Updating…' : 'Mark In Progress'}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleStatusChange('resolved')}
              disabled={pending}
              className="rounded-md bg-[#87A96B]/15 px-4 py-2 text-sm font-medium text-[#5A8050] hover:bg-[#87A96B]/25 disabled:opacity-50"
            >
              {pending ? 'Updating…' : 'Mark Resolved'}
            </button>
          </div>
        </section>
      )}

      {snag.status === 'resolved' && (
        <div className="rounded-lg bg-[#87A96B]/10 border border-[#87A96B]/20 p-4 text-center">
          <p className="text-sm font-medium text-[#5A8050]">
            This snag was resolved on {new Date(snag.resolved_at!).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  )
}
