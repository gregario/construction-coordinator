'use client'

import { useState, useTransition } from 'react'
import { applyTemplate } from '@/app/actions/templates'
import type { TemplateSummary } from '@/lib/templates/apply'

type Props = {
  projectId: string
  summaries: TemplateSummary[]
}

export function TemplateBrowser({ projectId, summaries }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    summaries[0]?.id ?? null
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selected = summaries.find(s => s.id === selectedId) ?? null

  function handleApply(templateId: string) {
    setError(null)
    startTransition(async () => {
      const res = await applyTemplate(templateId, projectId)
      if (res && res.ok === false) {
        setError(res.error)
      }
    })
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section aria-label="Available templates" className="space-y-3">
        <h2 className="text-sm font-medium text-[#6B5D52] uppercase tracking-wide">
          Templates ({summaries.length})
        </h2>
        <ul className="space-y-2" role="list">
          {summaries.map(t => {
            const isSelected = t.id === selectedId
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  aria-pressed={isSelected}
                  className={`w-full text-left rounded-lg border p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-[#8B5E3C] ${
                    isSelected
                      ? 'border-[#8B5E3C] bg-[#FDF7E8]'
                      : 'border-[#E8DFD3] bg-white hover:border-[#C8B8A4]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-[#2B1F17]">{t.name}</h3>
                      {t.description && (
                        <p className="mt-1 text-sm text-[#6B5D52]">{t.description}</p>
                      )}
                    </div>
                  </div>
                  <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6B5D52]">
                    <div>
                      <dt className="inline">Duration: </dt>
                      <dd className="inline font-medium text-[#2B1F17]">
                        {t.total_duration_days} days
                      </dd>
                    </div>
                    <div>
                      <dt className="inline">Stages: </dt>
                      <dd className="inline font-medium text-[#2B1F17]">{t.stage_count}</dd>
                    </div>
                    <div>
                      <dt className="inline">Tasks: </dt>
                      <dd className="inline font-medium text-[#2B1F17]">{t.task_count}</dd>
                    </div>
                  </dl>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section
        aria-label="Template preview"
        aria-live="polite"
        className="rounded-lg border border-[#E8DFD3] bg-white p-5"
      >
        {selected ? (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#2B1F17]">{selected.name}</h2>
              <p className="mt-1 text-sm text-[#6B5D52]">
                {selected.total_duration_days} days · {selected.stage_count} stages ·{' '}
                {selected.task_count} tasks
              </p>
            </div>

            <ol className="space-y-3 mb-5" role="list">
              {selected.stages.map((stage, idx) => (
                <li
                  key={`${selected.id}-${idx}`}
                  className="border-l-4 pl-3 py-1"
                  style={{ borderColor: stage.color }}
                >
                  <div className="font-medium text-[#2B1F17]">{stage.name}</div>
                  <div className="text-xs text-[#6B5D52] mb-1">
                    {stage.task_count} {stage.task_count === 1 ? 'task' : 'tasks'}
                  </div>
                  {stage.sample_tasks.length > 0 && (
                    <ul className="text-sm text-[#6B5D52] list-disc ml-5" role="list">
                      {stage.sample_tasks.map((name, i) => (
                        <li key={i}>{name}</li>
                      ))}
                      {stage.task_count > stage.sample_tasks.length && (
                        <li className="italic text-[#A89A8C]">
                          +{stage.task_count - stage.sample_tasks.length} more
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              ))}
            </ol>

            {error && (
              <div
                role="alert"
                className="mb-3 rounded-md border border-[#B8543A] bg-[#FDECE7] p-3 text-sm text-[#7A2E1A]"
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => handleApply(selected.id)}
              disabled={isPending}
              className="w-full rounded-md bg-[#8B5E3C] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#754D30] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#8B5E3C] focus:ring-offset-2 focus:ring-offset-[#FAF7F2]"
            >
              {isPending ? 'Applying template…' : 'Use this template'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-[#6B5D52]">Select a template to preview.</p>
        )}
      </section>
    </div>
  )
}
