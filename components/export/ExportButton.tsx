'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { ExportDialog } from './ExportDialog'

type Props = {
  projectName: string
}

export function ExportButton({ projectName }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#2B1F17] bg-white border border-[#E8DFD3] rounded-lg hover:bg-[#FAF7F2] hover:border-[#D4A355] transition-colors"
      >
        <Download className="w-5 h-5 text-[#8B5E3C]" />
        Export Project
      </button>
      <ExportDialog open={open} onClose={() => setOpen(false)} projectName={projectName} />
    </>
  )
}
