'use client'

import { useState, useTransition, useEffect } from 'react'
import { Building2, Pencil, Trash2, Plus } from 'lucide-react'
import { createBlock, updateBlock, deleteBlock, type BlockRow } from '@/app/actions/blocks'

interface BlockManagerProps {
  projectId: string
  initialBlocks: BlockRow[]
  onBlocksChange?: (blocks: BlockRow[]) => void
  onFormOpenChange?: (isOpen: boolean) => void
}

type FormState = {
  name: string
  attachment_type: 'attached' | 'detached'
  storeys: number
}

const defaultForm: FormState = { name: '', attachment_type: 'attached', storeys: 2 }

export function BlockManager({ projectId, initialBlocks, onBlocksChange, onFormOpenChange }: BlockManagerProps) {
  const [blocks, setBlocks] = useState<BlockRow[]>(initialBlocks)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Notify parent when a form is open
  useEffect(() => {
    onFormOpenChange?.(showAddForm || editingId !== null)
  }, [showAddForm, editingId, onFormOpenChange])

  function updateLocalBlocks(updated: BlockRow[]) {
    setBlocks(updated)
    onBlocksChange?.(updated)
  }

  function handleOpenAdd() {
    setForm(defaultForm)
    setEditingId(null)
    setShowAddForm(true)
    setError(null)
  }

  function handleOpenEdit(block: BlockRow) {
    setForm({
      name: block.name,
      attachment_type: block.attachment_type,
      storeys: block.storeys,
    })
    setEditingId(block.id)
    setShowAddForm(false)
    setError(null)
  }

  function handleCancel() {
    setShowAddForm(false)
    setEditingId(null)
    setError(null)
  }

  function handleSaveAdd() {
    if (!form.name.trim()) {
      setError('Block name is required')
      return
    }
    startTransition(async () => {
      const result = await createBlock(projectId, form)
      if (!result.ok) {
        setError(result.error)
        return
      }
      const newBlock: BlockRow = {
        id: result.id,
        name: form.name.trim(),
        attachment_type: form.attachment_type,
        storeys: form.storeys,
        order_index: blocks.length,
        construction_scheme: {},
      }
      updateLocalBlocks([...blocks, newBlock])
      setShowAddForm(false)
      setForm(defaultForm)
      setError(null)
    })
  }

  function handleSaveEdit() {
    if (!editingId || !form.name.trim()) {
      setError('Block name is required')
      return
    }
    startTransition(async () => {
      const result = await updateBlock(editingId, form)
      if (!result.ok) {
        setError(result.error)
        return
      }
      updateLocalBlocks(
        blocks.map(b =>
          b.id === editingId
            ? { ...b, name: form.name.trim(), attachment_type: form.attachment_type, storeys: form.storeys }
            : b
        )
      )
      setEditingId(null)
      setError(null)
    })
  }

  function handleDelete(blockId: string) {
    startTransition(async () => {
      const result = await deleteBlock(blockId)
      if (!result.ok) {
        setError(result.error)
        setConfirmDeleteId(null)
        return
      }
      updateLocalBlocks(blocks.filter(b => b.id !== blockId))
      setConfirmDeleteId(null)
      setError(null)
    })
  }

  return (
    <div className="space-y-3">
      {/* Block list */}
      {blocks.map(block => (
        <div key={block.id}>
          {editingId === block.id ? (
            <BlockForm
              form={form}
              onChange={setForm}
              onSave={handleSaveEdit}
              onCancel={handleCancel}
              pending={pending}
              error={error}
              saveLabel="Save"
            />
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-[#E8DFD3] bg-white p-3">
              <div className="flex items-center gap-3">
                <Building2 size={18} className="text-[#8B5E3C]" aria-hidden />
                <div>
                  <div className="text-sm font-medium text-[#2B1F17]">{block.name}</div>
                  <div className="flex items-center gap-2 text-xs text-[#6B5D52]">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                      block.attachment_type === 'attached'
                        ? 'bg-[#87A96B]/15 text-[#5A8050]'
                        : 'bg-[#E8DFD3] text-[#6B5D52]'
                    }`}>
                      {block.attachment_type === 'attached' ? 'Attached' : 'Detached'}
                    </span>
                    <span>{block.storeys} {block.storeys === 1 ? 'storey' : 'storeys'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(block)}
                  className="rounded p-1.5 text-[#6B5D52] hover:bg-[#F5F0E8] hover:text-[#2B1F17]"
                  aria-label={`Edit ${block.name}`}
                >
                  <Pencil size={16} />
                </button>
                {blocks.length > 1 && (
                  confirmDeleteId === block.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(block.id)}
                        disabled={pending}
                        className="rounded px-2 py-1 text-xs font-medium text-white bg-[#B85450] hover:bg-[#A04440] disabled:opacity-50"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded px-2 py-1 text-xs font-medium text-[#6B5D52] hover:bg-[#F5F0E8]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(block.id)}
                      className="rounded p-1.5 text-[#6B5D52] hover:bg-[#B85450]/10 hover:text-[#B85450]"
                      aria-label={`Delete ${block.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add form */}
      {showAddForm ? (
        <BlockForm
          form={form}
          onChange={setForm}
          onSave={handleSaveAdd}
          onCancel={handleCancel}
          pending={pending}
          error={error}
          saveLabel="Add Block"
        />
      ) : (
        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#E8DFD3] bg-white py-3 text-sm font-medium text-[#6B5D52] hover:bg-[#F5F0E8] hover:text-[#2B1F17] transition-colors"
        >
          <Plus size={16} />
          Add Block
        </button>
      )}

      {/* Global error */}
      {error && !showAddForm && !editingId && (
        <p role="alert" className="text-xs text-[#B85450]">{error}</p>
      )}
    </div>
  )
}

function BlockForm({
  form,
  onChange,
  onSave,
  onCancel,
  pending,
  error,
  saveLabel,
}: {
  form: FormState
  onChange: (f: FormState) => void
  onSave: () => void
  onCancel: () => void
  pending: boolean
  error: string | null
  saveLabel: string
}) {
  return (
    <div className="rounded-lg border border-[#8B5E3C]/30 bg-[#FAF7F2] p-4 space-y-3">
      <label className="block text-xs font-medium text-[#2B1F17]">
        Name
        <input
          type="text"
          value={form.name}
          onChange={e => onChange({ ...form, name: e.target.value })}
          autoFocus
          maxLength={60}
          placeholder="e.g. Main House, Garage, Shed"
          className="mt-1 w-full rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-sm"
        />
      </label>

      <div className="flex items-center gap-4">
        <fieldset className="flex-1">
          <legend className="text-xs font-medium text-[#2B1F17] mb-1">Type</legend>
          <div className="flex rounded-md border border-[#E8DFD3] bg-white overflow-hidden">
            {(['attached', 'detached'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => onChange({ ...form, attachment_type: type })}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  form.attachment_type === type
                    ? 'bg-[#8B5E3C] text-white'
                    : 'text-[#6B5D52] hover:bg-[#F5F0E8]'
                }`}
              >
                {type === 'attached' ? 'Attached' : 'Detached'}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="w-24 text-xs font-medium text-[#2B1F17]">
          Storeys
          <input
            type="number"
            min={1}
            max={10}
            value={form.storeys}
            onChange={e => onChange({ ...form, storeys: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
            className="mt-1 w-full rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-sm text-center"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-xs text-[#B85450]">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-md border border-[#E8DFD3] bg-white px-3 py-1.5 text-xs font-medium text-[#2B1F17] hover:bg-[#FAF7F2] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A2A1E] disabled:opacity-50"
        >
          {pending ? 'Saving…' : saveLabel}
        </button>
      </div>
    </div>
  )
}
