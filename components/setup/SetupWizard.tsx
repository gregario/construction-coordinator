'use client'

import { useState } from 'react'
import { BlockManager } from './BlockManager'
import { MethodPicker } from './MethodPicker'
import type { BlockRow } from '@/app/actions/blocks'

type Step = 'blocks' | 'scheme'

interface SetupWizardProps {
  projectId: string
  initialBlocks: BlockRow[]
  startDate: string
  projectName: string
}

export function SetupWizard({ projectId, initialBlocks, startDate, projectName }: SetupWizardProps) {
  const [step, setStep] = useState<Step>('blocks')
  const [blocks, setBlocks] = useState<BlockRow[]>(initialBlocks)

  if (step === 'blocks') {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs text-[#6B5D52] mb-1">Step 1 of 2</p>
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
        />

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => setStep('scheme')}
            disabled={blocks.length === 0}
            className="rounded-md bg-[#8B5E3C] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#754C30] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Continue to Construction Scheme →
          </button>
        </div>
      </div>
    )
  }

  // Step 2: Method Picker
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#6B5D52] mb-1">Step 2 of 2</p>
          <h2 className="text-lg font-semibold text-[#2B1F17]">
            Construction Scheme
          </h2>
          <p className="text-sm text-[#6B5D52] mt-1">
            Pick your construction methods for each category. This generates your substages.
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
      />
    </div>
  )
}
