'use client'

import { useState, useTransition } from 'react'

interface ProjectDetailsFormProps {
  projectId: string
  initialName: string
  initialAddress: string
  blocks: { name: string; attachment_type: string; storeys: number }[]
}

export function ProjectDetailsForm({
  projectId,
  initialName,
  initialAddress,
  blocks,
}: ProjectDetailsFormProps) {
  const [name, setName] = useState(initialName)
  const [address, setAddress] = useState(initialAddress)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSave() {
    if (!name.trim()) {
      setError('Project name is required')
      return
    }
    startTransition(async () => {
      const { updateProjectDetails } = await import('@/app/actions/projects')
      const result = await updateProjectDetails(projectId, {
        name: name.trim(),
        address: address.trim() || null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="space-y-4">
      <label className="block text-xs font-medium text-[#2B1F17]">
        Project Name
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setSaved(false) }}
          className="mt-1 w-full rounded-md border border-[#E8DFD3] px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-xs font-medium text-[#2B1F17]">
        Address
        <input
          type="text"
          value={address}
          onChange={e => { setAddress(e.target.value); setSaved(false) }}
          className="mt-1 w-full rounded-md border border-[#E8DFD3] px-3 py-2 text-sm"
          placeholder="Site address"
        />
      </label>

      {/* Block summary (read-only) */}
      {blocks.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-[#2B1F17] mb-2">Blocks</h3>
          <div className="space-y-1.5">
            {blocks.map((block, i) => (
              <div key={i} className="flex items-center gap-2 rounded bg-[#FAF7F2] px-3 py-2 text-xs">
                <span className="font-medium text-[#2B1F17]">{block.name}</span>
                <span className="text-[#6B5D52]">
                  {block.storeys} {block.storeys === 1 ? 'storey' : 'storeys'} · {block.attachment_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-xs text-[#B85450]">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="rounded-md bg-[#2B1F17] px-4 py-2 text-xs font-medium text-white hover:bg-[#3A2A1E] disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && <span className="text-xs text-[#5A8050]">Saved</span>}
      </div>
    </div>
  )
}
