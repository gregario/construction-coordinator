'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BlockManager } from './BlockManager'
import { MethodPicker } from './MethodPicker'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '@/lib/construction/categories'
import { applySchemeToBlock, type SchemeSelection } from '@/app/actions/construction-methods'
import { activateProject } from '@/app/actions/projects'
import type { BlockRow } from '@/app/actions/blocks'

type Step = 'blocks' | 'scheme' | 'review'

interface SetupWizardProps {
  projectId: string
  initialBlocks: BlockRow[]
  startDate: string
  projectName: string
}

export function SetupWizard({ projectId, initialBlocks, startDate, projectName }: SetupWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('blocks')
  const [blocks, setBlocks] = useState<BlockRow[]>(initialBlocks)
  const [allSelections, setAllSelections] = useState<Record<string, SchemeSelection>>({})
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [blockFormOpen, setBlockFormOpen] = useState(false)

  // Step 1: Blocks
  if (step === 'blocks') {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs text-[#6B5D52] mb-1">Step 1 of 3</p>
          <h2 className="text-lg font-semibold text-[#2B1F17]">
            Buildings for &ldquo;{projectName}&rdquo;
          </h2>
          <p className="text-sm text-[#6B5D52] mt-1">
            Each block is a separate building on your site. Edit the default, add a garage, shed, or extension.
            Set the number of storeys and whether it&apos;s attached or detached.
          </p>
        </div>

        <BlockManager
          projectId={projectId}
          initialBlocks={blocks}
          onBlocksChange={setBlocks}
          onFormOpenChange={setBlockFormOpen}
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          {blockFormOpen && (
            <span className="text-xs text-[#D4A355] font-medium">
              Save or cancel your block edit before continuing
            </span>
          )}
          <button
            type="button"
            onClick={() => setStep('scheme')}
            disabled={blocks.length === 0 || blockFormOpen}
            className="rounded-md bg-[#8B5E3C] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#754C30] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Continue to Construction Scheme →
          </button>
        </div>
      </div>
    )
  }

  // Step 2: Method Picker
  if (step === 'scheme') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#6B5D52] mb-1">Step 2 of 3</p>
            <h2 className="text-lg font-semibold text-[#2B1F17]">
              Construction Scheme
            </h2>
            <p className="text-sm text-[#6B5D52] mt-1">
              Pick your construction methods for each category.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep('blocks')}
            className="rounded-md border border-[#E8DFD3] px-3 py-1.5 text-xs font-medium text-[#6B5D52] hover:bg-[#F5F0E8]"
          >
            ← Back to Blocks
          </button>
        </div>

        <MethodPicker
          projectId={projectId}
          blocks={blocks}
          startDate={startDate}
          onComplete={(selections) => {
            setAllSelections(selections)
            setStep('review')
          }}
        />
      </div>
    )
  }

  // Step 3: Review & Activate
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-[#6B5D52] mb-1">Step 3 of 3</p>
        <h2 className="text-lg font-semibold text-[#2B1F17]">
          Review &ldquo;{projectName}&rdquo;
        </h2>
        <p className="text-sm text-[#6B5D52] mt-1">
          Check your blocks and construction methods, then activate your project.
        </p>
      </div>

      {/* Block summary cards */}
      <div className="space-y-3">
        {blocks.map(block => {
          const scheme = allSelections[block.id] || {}
          const methodCount = Object.keys(scheme).length
          return (
            <div key={block.id} className="rounded-lg border border-[#E8DFD3] bg-[#FAF7F2] p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[#2B1F17]">{block.name}</h3>
                <span className="text-xs text-[#6B5D52]">
                  {block.storeys} {block.storeys === 1 ? 'storey' : 'storeys'} · {block.attachment_type}
                </span>
              </div>
              {methodCount > 0 ? (
                <p className="text-xs text-[#6B5D52]">
                  {methodCount} construction method{methodCount !== 1 ? 's' : ''} selected
                </p>
              ) : (
                <p className="text-xs text-[#B85450]">No methods selected</p>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <p role="alert" className="text-xs text-[#B85450]">{error}</p>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setStep('scheme')}
          className="rounded-md border border-[#E8DFD3] px-3 py-1.5 text-xs font-medium text-[#6B5D52] hover:bg-[#F5F0E8]"
        >
          ← Back to Scheme
        </button>
        <button
          type="button"
          onClick={() => {
            startTransition(async () => {
              setError(null)
              // Apply schemes for all blocks
              for (const block of blocks) {
                const scheme = allSelections[block.id]
                if (!scheme || Object.keys(scheme).length === 0) continue
                const result = await applySchemeToBlock(block.id, projectId, scheme, startDate)
                if (!result.ok) {
                  setError(`Failed for ${block.name}: ${result.error}`)
                  return
                }
              }
              // Activate and redirect
              await activateProject(projectId)
              router.push('/schedule')
              router.refresh()
            })
          }}
          disabled={pending || blocks.some(b => !allSelections[b.id] || Object.keys(allSelections[b.id]).length === 0)}
          className="rounded-md bg-[#8B5E3C] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#754C30] disabled:opacity-30"
        >
          {pending ? 'Creating project…' : 'Activate Project'}
        </button>
      </div>
    </div>
  )
}
