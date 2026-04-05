import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  TradesManager,
  type TradeListItem,
} from '@/components/trades/TradesManager'

// lib/supabase/types.ts lacks Relationships[] (foundation-eval finding).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

export default async function TradesPage() {
  const supabase = (await createClient()) as unknown as LooseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectRes = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const project = projectRes.data as
    | { id: string; name: string; status: string }
    | null
  if (!project) redirect('/setup')

  const tradesRes = await supabase
    .from('trades')
    .select('id, name, specialty, phone, email, notes')
    .eq('project_id', project.id)
    .order('name', { ascending: true })
  const tradeRows =
    (tradesRes.data as Array<{
      id: string
      name: string
      specialty: string | null
      phone: string | null
      email: string | null
      notes: string | null
    }> | null) ?? []

  // AC-TR-4 surface: count task assignments per trade so the delete warning
  // can quote the right number without a round trip.
  const assignmentCounts = new Map<string, number>()
  if (tradeRows.length > 0) {
    const assignmentsRes = await supabase
      .from('tasks')
      .select('trade_id')
      .eq('project_id', project.id)
      .not('trade_id', 'is', null)
    const assignments =
      (assignmentsRes.data as Array<{ trade_id: string | null }> | null) ?? []
    for (const row of assignments) {
      if (!row.trade_id) continue
      assignmentCounts.set(row.trade_id, (assignmentCounts.get(row.trade_id) ?? 0) + 1)
    }
  }

  const trades: TradeListItem[] = tradeRows.map(t => ({
    ...t,
    assigned_task_count: assignmentCounts.get(t.id) ?? 0,
  }))

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#2B1F17] mb-1">Trades</h1>
        <p className="text-[#6B5D52] text-sm">
          Subcontractors and tradespeople on {project.name}.
        </p>
      </header>
      <TradesManager projectId={project.id} initialTrades={trades} />
    </div>
  )
}
