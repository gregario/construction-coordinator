'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  applyCustomization,
  finalizeProject,
  type AddedTaskInput,
} from '@/app/actions/customization'
import {
  buildCustomizationTree,
  tasksWithBrokenDependencies,
  type CustomizationStage,
  type CustomizationTask,
  type TaskDependencyRow,
} from '@/lib/customization/tree'
import {
  suggestFromMessage,
  applySuggestion,
  type AssistantSuggestion,
  type CustomizationDraft,
} from '@/lib/customization/assistant'

type Props = {
  projectId: string
  projectName: string
  stages: CustomizationStage[]
  tasks: CustomizationTask[]
  dependencies: TaskDependencyRow[]
}

type ChatEntry = {
  id: string
  role: 'user' | 'assistant'
  text: string
  suggestion?: AssistantSuggestion
  applied?: boolean
  dismissed?: boolean
}

export function CustomizationScreen({
  projectId,
  projectName,
  stages,
  tasks,
  dependencies,
}: Props) {
  const [toggledOff, setToggledOff] = useState<Set<string>>(new Set())
  const [addedTasks, setAddedTasks] = useState<AddedTaskInput[]>([])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [chat, setChat] = useState<ChatEntry[]>([])
  const [draftMessage, setDraftMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSave] = useTransition()
  const [isCreating, startCreate] = useTransition()

  const tree = useMemo(() => buildCustomizationTree(stages, tasks), [stages, tasks])
  const brokenDeps = useMemo(
    () => tasksWithBrokenDependencies(tasks, dependencies, toggledOff),
    [tasks, dependencies, toggledOff]
  )

  const activeTaskCount =
    tasks.length - toggledOff.size + addedTasks.length

  function toggleTask(id: string) {
    setToggledOff(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleStage(stageId: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })
  }

  function removeAddedTask(index: number) {
    setAddedTasks(prev => prev.filter((_, i) => i !== index))
  }

  function handleSend() {
    const message = draftMessage.trim()
    if (message.length === 0) return
    const userEntry: ChatEntry = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: message,
    }
    const suggestion = suggestFromMessage(message, { stages, tasks })
    const assistantEntry: ChatEntry = suggestion
      ? {
          id: suggestion.id,
          role: 'assistant',
          text: suggestion.rationale,
          suggestion,
        }
      : {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text:
            "I don't have a specific suggestion for that yet — try keywords like ICF, insulation, or solar.",
        }
    setChat(prev => [...prev, userEntry, assistantEntry])
    setDraftMessage('')
  }

  function acceptSuggestion(entryId: string) {
    setChat(prev => {
      const entry = prev.find(e => e.id === entryId)
      if (!entry || !entry.suggestion) return prev
      const draft: CustomizationDraft = {
        toggledOffTaskIds: toggledOff,
        addedTasks,
      }
      const next = applySuggestion(draft, entry.suggestion)
      setToggledOff(next.toggledOffTaskIds)
      setAddedTasks(next.addedTasks)
      return prev.map(e => (e.id === entryId ? { ...e, applied: true } : e))
    })
  }

  function rejectSuggestion(entryId: string) {
    setChat(prev =>
      prev.map(e => (e.id === entryId ? { ...e, dismissed: true } : e))
    )
  }

  function handleCreateProject() {
    setError(null)
    // First persist toggles + additions, then finalize
    startSave(async () => {
      const saveRes = await applyCustomization({
        projectId,
        removedTaskIds: Array.from(toggledOff),
        addedTasks,
      })
      if (!saveRes.ok) {
        setError(saveRes.error)
        return
      }
      startCreate(async () => {
        const finRes = await finalizeProject(projectId)
        // finalizeProject redirects on success; only error returns
        if (finRes && finRes.ok === false) setError(finRes.error)
      })
    })
  }

  const pending = isSaving || isCreating

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section aria-label="Project customization tree">
        <header className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-[#6B5D52] uppercase tracking-wide">
              Customize
            </h2>
            <p className="text-xs text-[#A89A8C]">
              {activeTaskCount} active {activeTaskCount === 1 ? 'substage' : 'substages'}
              {toggledOff.size > 0 && ` · ${toggledOff.size} off`}
              {addedTasks.length > 0 && ` · ${addedTasks.length} added`}
            </p>
          </div>
        </header>

        <ol className="space-y-4" role="list">
          {tree.map(stage => {
            const isCollapsed = collapsed.has(stage.id)
            const addedForStage = addedTasks
              .map((t, i) => ({ t, i }))
              .filter(({ t }) => t.stage_id === stage.id)
            return (
              <li
                key={stage.id}
                className="rounded-lg border border-[#E8DFD3] bg-white"
              >
                <button
                  type="button"
                  onClick={() => toggleStage(stage.id)}
                  aria-expanded={!isCollapsed}
                  className="flex w-full items-center justify-between gap-3 p-3 text-left focus:outline-none focus:ring-2 focus:ring-[#8B5E3C] rounded-t-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: stage.color }}
                      aria-hidden
                    />
                    <span className="font-medium text-[#2B1F17]">{stage.name}</span>
                    <span className="text-xs text-[#A89A8C]">
                      {stage.tasks.length + addedForStage.length}{' '}
                      {stage.tasks.length + addedForStage.length === 1 ? 'substage' : 'substages'}
                    </span>
                  </div>
                  <span className="text-[#6B5D52] text-sm">
                    {isCollapsed ? '▸' : '▾'}
                  </span>
                </button>

                {!isCollapsed && (
                  <ul className="border-t border-[#E8DFD3]" role="list">
                    {stage.tasks.map(task => {
                      const isOff = toggledOff.has(task.id)
                      const isBroken = brokenDeps.has(task.id)
                      return (
                        <li
                          key={task.id}
                          className={`flex items-center justify-between gap-3 px-3 py-2 border-b border-[#F3ECE1] last:border-b-0 ${
                            isOff ? 'opacity-50' : ''
                          }`}
                        >
                          <label className="flex items-center gap-3 flex-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!isOff}
                              onChange={() => toggleTask(task.id)}
                              aria-label={`Include ${task.name}`}
                              className="h-4 w-4 rounded border-[#C8B8A4] text-[#8B5E3C] focus:ring-[#8B5E3C]"
                            />
                            <span
                              className={`text-sm ${
                                isOff
                                  ? 'line-through text-[#A89A8C]'
                                  : 'text-[#2B1F17]'
                              }`}
                            >
                              {task.name}
                            </span>
                            <span className="text-xs text-[#A89A8C]">
                              {task.duration_days}d
                            </span>
                          </label>
                          {isBroken && !isOff && (
                            <span
                              role="img"
                              aria-label="Depends on a task that is turned off"
                              title="A task this depends on has been toggled off"
                              className="text-[#B8543A] text-sm"
                            >
                              ⚠
                            </span>
                          )}
                        </li>
                      )
                    })}
                    {addedForStage.map(({ t, i }) => (
                      <li
                        key={`added-${i}`}
                        className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[#F3ECE1] last:border-b-0 bg-[#FDF7E8]"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span
                            className="inline-block h-4 w-4 text-[#6B8F3F] text-xs font-semibold text-center leading-4"
                            aria-hidden
                          >
                            +
                          </span>
                          <span className="text-sm text-[#2B1F17]">{t.name}</span>
                          <span className="text-xs text-[#A89A8C]">{t.duration_days}d</span>
                          <span className="text-xs text-[#6B8F3F] font-medium">new</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAddedTask(i)}
                          aria-label={`Remove added task ${t.name}`}
                          className="text-xs text-[#6B5D52] hover:text-[#B8543A] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C] rounded px-1"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                    {stage.tasks.length === 0 && addedForStage.length === 0 && (
                      <li className="px-3 py-2 text-xs text-[#A89A8C] italic">
                        No tasks in this stage
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-[#B8543A] bg-[#FDECE7] p-3 text-sm text-[#7A2E1A]"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-[#6B5D52]">
            Ready? We&rsquo;ll save your customizations and start your build.
          </p>
          <button
            type="button"
            onClick={handleCreateProject}
            disabled={pending || activeTaskCount === 0}
            className="rounded-md bg-[#8B5E3C] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#754D30] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#8B5E3C] focus:ring-offset-2 focus:ring-offset-[#FAF7F2]"
          >
            {pending ? 'Creating project…' : 'Create project'}
          </button>
        </div>
      </section>

      <aside
        aria-label="AI assist"
        className="rounded-lg border border-[#E8DFD3] bg-white p-4 flex flex-col h-[600px]"
      >
        <header className="mb-3">
          <h2 className="text-sm font-medium text-[#6B5D52] uppercase tracking-wide">
            AI Assist
          </h2>
          <p className="text-xs text-[#A89A8C]">
            Describe your build. I&rsquo;ll suggest adjustments for &ldquo;{projectName}&rdquo;.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
          {chat.length === 0 && (
            <p className="text-xs text-[#A89A8C] italic">
              Try: &ldquo;I&rsquo;m doing ICF foundation not traditional pour&rdquo;
            </p>
          )}
          {chat.map(entry => (
            <div
              key={entry.id}
              className={`rounded-md p-3 text-sm ${
                entry.role === 'user'
                  ? 'bg-[#F3ECE1] text-[#2B1F17] ml-6'
                  : 'bg-[#FDF7E8] text-[#2B1F17] mr-6'
              }`}
            >
              {entry.suggestion && !entry.dismissed && (
                <div className="font-medium text-[#2B1F17] mb-1">
                  {entry.suggestion.title}
                </div>
              )}
              <p className="text-sm">{entry.text}</p>
              {entry.suggestion && !entry.applied && !entry.dismissed && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => acceptSuggestion(entry.id)}
                    className="rounded-md bg-[#6B8F3F] px-3 py-1 text-xs font-medium text-white hover:bg-[#567232] focus:outline-none focus:ring-2 focus:ring-[#6B8F3F]"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectSuggestion(entry.id)}
                    className="rounded-md border border-[#C8B8A4] px-3 py-1 text-xs font-medium text-[#6B5D52] hover:bg-[#F3ECE1] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
                  >
                    Reject
                  </button>
                </div>
              )}
              {entry.applied && (
                <p className="mt-2 text-xs text-[#6B8F3F]">✓ Applied to project</p>
              )}
              {entry.dismissed && (
                <p className="mt-2 text-xs text-[#A89A8C]">Dismissed</p>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={e => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={draftMessage}
            onChange={e => setDraftMessage(e.target.value)}
            placeholder="Describe your build…"
            aria-label="Describe your build for AI assist"
            className="flex-1 rounded-md border border-[#C8B8A4] bg-white px-3 py-2 text-sm text-[#2B1F17] placeholder:text-[#A89A8C] focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
          />
          <button
            type="submit"
            disabled={draftMessage.trim().length === 0}
            className="rounded-md bg-[#8B5E3C] px-4 py-2 text-sm font-medium text-white hover:bg-[#754D30] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
          >
            Send
          </button>
        </form>
      </aside>
    </div>
  )
}
