import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UpcomingOrderCards, type UpcomingOrderCard } from '@/components/briefing/UpcomingOrderCards'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

// Mock server action
vi.mock('@/app/actions/materials', () => ({
  updateMaterialStatus: vi.fn().mockResolvedValue({ ok: true }),
}))

function makeCard(overrides: Partial<UpcomingOrderCard> = {}): UpcomingOrderCard {
  return {
    id: 'mat-1',
    name: 'Ready Mix Concrete',
    order_by_date: '2026-06-15',
    task_id: 'task-1',
    task_name: 'Pour Foundation',
    days_remaining: 5,
    badge: 'due_soon',
    supplier_name: 'Kilsaran',
    quantity: '12 cubic metres',
    estimated_cost_formatted: '€2,400.00',
    lead_time_days: 3,
    notes: 'Confirm pump availability',
    ...overrides,
  }
}

// @criterion: AC-UO-2, AC-UO-3
// AC-UO-2: card shows material name, task name, days remaining, supplier
describe('UpcomingOrderCards — AC-UO-2', () => {
  it('renders material name, task name, days remaining, and supplier', () => {
    render(<UpcomingOrderCards cards={[makeCard()]} projectId="proj-1" />)

    expect(screen.getByText('Ready Mix Concrete')).toBeInTheDocument()
    expect(screen.getByText('Pour Foundation')).toBeInTheDocument()
    expect(screen.getByText('5d left')).toBeInTheDocument()
    expect(screen.getByText('Kilsaran')).toBeInTheDocument()
  })

  it('shows overdue label for negative days', () => {
    render(
      <UpcomingOrderCards
        cards={[makeCard({ days_remaining: -2 })]}
        projectId="proj-1"
      />
    )
    expect(screen.getByText('2d overdue')).toBeInTheDocument()
  })

  it('shows "Due today" for zero days remaining', () => {
    render(
      <UpcomingOrderCards
        cards={[makeCard({ days_remaining: 0 })]}
        projectId="proj-1"
      />
    )
    expect(screen.getByText('Due today')).toBeInTheDocument()
  })

  it('omits supplier when not set', () => {
    render(
      <UpcomingOrderCards
        cards={[makeCard({ supplier_name: null })]}
        projectId="proj-1"
      />
    )
    expect(screen.queryByText('Kilsaran')).not.toBeInTheDocument()
  })
})

// AC-UO-3: tap to expand — quantity, cost, lead time, notes, Mark Ordered button
describe('UpcomingOrderCards — AC-UO-3 expand', () => {
  it('does not show detail by default', () => {
    render(<UpcomingOrderCards cards={[makeCard()]} projectId="proj-1" />)
    expect(screen.queryByTestId('order-detail-mat-1')).not.toBeInTheDocument()
  })

  it('expands on click to show quantity, cost, lead time, notes, and Mark Ordered', () => {
    render(<UpcomingOrderCards cards={[makeCard()]} projectId="proj-1" />)
    fireEvent.click(screen.getByTestId('order-card-mat-1'))

    const detail = screen.getByTestId('order-detail-mat-1')
    expect(detail).toBeInTheDocument()
    expect(screen.getByText('12 cubic metres')).toBeInTheDocument()
    expect(screen.getByText('€2,400.00')).toBeInTheDocument()
    expect(screen.getByText('3 days')).toBeInTheDocument()
    expect(screen.getByText('Confirm pump availability')).toBeInTheDocument()
    expect(screen.getByTestId('mark-ordered-mat-1')).toBeInTheDocument()
  })

  it('collapses on second click', () => {
    render(<UpcomingOrderCards cards={[makeCard()]} projectId="proj-1" />)
    const card = screen.getByTestId('order-card-mat-1')
    fireEvent.click(card)
    expect(screen.getByTestId('order-detail-mat-1')).toBeInTheDocument()
    fireEvent.click(card)
    expect(screen.queryByTestId('order-detail-mat-1')).not.toBeInTheDocument()
  })

  it('shows singular "day" for lead_time_days === 1', () => {
    render(
      <UpcomingOrderCards
        cards={[makeCard({ lead_time_days: 1 })]}
        projectId="proj-1"
      />
    )
    fireEvent.click(screen.getByTestId('order-card-mat-1'))
    expect(screen.getByText('1 day')).toBeInTheDocument()
  })
})
