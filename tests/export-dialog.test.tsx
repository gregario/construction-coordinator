import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportDialog } from '@/components/export/ExportDialog'
import { ExportButton } from '@/components/export/ExportButton'

// Mock the server action
vi.mock('@/app/actions/export', () => ({
  fetchExportData: vi.fn(),
}))

describe('ExportDialog', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
  })

  it('renders nothing when open=false', () => {
    const { container } = render(
      <ExportDialog open={false} onClose={onClose} projectName="Test Project" />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders dialog with format options when open=true', () => {
    render(<ExportDialog open={true} onClose={onClose} projectName="Test Project" />)
    expect(screen.getByText('Export Project')).toBeInTheDocument()
    expect(screen.getByText('JSON')).toBeInTheDocument()
    expect(screen.getByText('CSV')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })

  it('shows project name in the dialog', () => {
    render(<ExportDialog open={true} onClose={onClose} projectName="O'Brien House" />)
    expect(screen.getByText(/O'Brien House/)).toBeInTheDocument()
  })

  it('has three format options with descriptions (AC-EX-1)', () => {
    render(<ExportDialog open={true} onClose={onClose} projectName="Test" />)
    expect(screen.getByText(/Full data/)).toBeInTheDocument()
    expect(screen.getByText(/spreadsheets/)).toBeInTheDocument()
    expect(screen.getByText(/Gantt chart snapshot/)).toBeInTheDocument()
  })

  it('can select different formats', async () => {
    const user = userEvent.setup()
    render(<ExportDialog open={true} onClose={onClose} projectName="Test" />)

    // Default is JSON (first option should be pressed)
    const jsonButton = screen.getByText('JSON').closest('button')!
    expect(jsonButton).toHaveAttribute('aria-pressed', 'true')

    // Click CSV
    const csvButton = screen.getByText('CSV').closest('button')!
    await user.click(csvButton)
    expect(csvButton).toHaveAttribute('aria-pressed', 'true')
    expect(jsonButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('closes on Cancel click', async () => {
    const user = userEvent.setup()
    render(<ExportDialog open={true} onClose={onClose} projectName="Test" />)
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on X button click', async () => {
    const user = userEvent.setup()
    render(<ExportDialog open={true} onClose={onClose} projectName="Test" />)
    await user.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on backdrop click', async () => {
    const user = userEvent.setup()
    render(<ExportDialog open={true} onClose={onClose} projectName="Test" />)
    // Click the backdrop (the outer fixed div)
    const backdrop = screen.getByRole('dialog').parentElement!
    await user.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('has Download button', () => {
    render(<ExportDialog open={true} onClose={onClose} projectName="Test" />)
    expect(screen.getByText('Download')).toBeInTheDocument()
  })
})

describe('ExportButton', () => {
  it('renders the Export Project button', () => {
    render(<ExportButton projectName="Test" />)
    expect(screen.getByText('Export Project')).toBeInTheDocument()
  })

  it('opens dialog on click (AC-EX-1)', async () => {
    const user = userEvent.setup()
    render(<ExportButton projectName="My Project" />)
    // Dialog should not be visible initially
    expect(screen.queryByText('Export Project', { selector: 'h2' })).not.toBeInTheDocument()

    await user.click(screen.getByText('Export Project'))
    // Dialog should now be open with the h2 title
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/My Project/)).toBeInTheDocument()
  })
})
