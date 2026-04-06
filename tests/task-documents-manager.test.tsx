import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  TaskDocumentsManager,
  type DocumentListItem,
} from '@/components/documents/TaskDocumentsManager'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

// Mock server actions
vi.mock('@/app/actions/documents', () => ({
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
  getDocumentDownloadUrl: vi.fn(),
}))

const mkDoc = (overrides: Partial<DocumentListItem> & { id: string }): DocumentListItem => ({
  storage_path: `path/${overrides.id}`,
  file_name: `${overrides.id}.pdf`,
  file_type: 'application/pdf',
  file_size: 2_000_000,
  created_at: '2026-04-05T10:00:00Z',
  ...overrides,
})

describe('TaskDocumentsManager', () => {
  const defaultProps = {
    projectId: 'proj-1',
    entityId: 'task-1',
    entityType: 'task' as const,
    stageId: 'stage-1' as string | null,
    initialDocuments: [] as DocumentListItem[],
  }

  // AC-DS-1: attach document button exists
  it('renders Attach Document button with file input', () => {
    render(<TaskDocumentsManager {...defaultProps} />)
    expect(screen.getByText('+ Attach Document')).toBeInTheDocument()
    expect(screen.getByTestId('document-file-input')).toBeInTheDocument()
  })

  it('renders empty state when no documents', () => {
    render(<TaskDocumentsManager {...defaultProps} />)
    expect(screen.getByText(/no documents yet/i)).toBeInTheDocument()
  })

  // AC-DS-2: document rows with name, file_type icon, upload date, download button
  it('renders document rows with name, icon, date, and download button', () => {
    const docs = [
      mkDoc({ id: 'd1', file_name: 'plans.pdf', file_type: 'application/pdf', created_at: '2026-04-05T10:00:00Z' }),
      mkDoc({
        id: 'd2',
        file_name: 'budget.xlsx',
        file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        created_at: '2026-04-04T10:00:00Z',
      }),
    ]
    render(<TaskDocumentsManager {...defaultProps} initialDocuments={docs} />)
    expect(screen.getByText('plans.pdf')).toBeInTheDocument()
    expect(screen.getByText('budget.xlsx')).toBeInTheDocument()
    expect(screen.getAllByTestId('document-row')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /download/i })).toHaveLength(2)
  })

  it('shows document count in header', () => {
    const docs = [mkDoc({ id: 'd1' }), mkDoc({ id: 'd2' })]
    render(<TaskDocumentsManager {...defaultProps} initialDocuments={docs} />)
    expect(screen.getByText('(2)')).toBeInTheDocument()
  })

  it('renders file type icon labels', () => {
    const docs = [
      mkDoc({ id: 'd1', file_name: 'plan.pdf', file_type: 'application/pdf' }),
      mkDoc({ id: 'd2', file_name: 'scan.jpg', file_type: 'image/jpeg' }),
    ]
    render(<TaskDocumentsManager {...defaultProps} initialDocuments={docs} />)
    expect(screen.getByTestId('icon-pdf')).toBeInTheDocument()
    expect(screen.getByTestId('icon-image')).toBeInTheDocument()
  })

  it('renders delete buttons for each document', () => {
    const docs = [mkDoc({ id: 'd1', file_name: 'a.pdf' }), mkDoc({ id: 'd2', file_name: 'b.pdf' })]
    render(<TaskDocumentsManager {...defaultProps} initialDocuments={docs} />)
    expect(screen.getByLabelText('Delete a.pdf')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete b.pdf')).toBeInTheDocument()
  })

  // AC-DS-4: file input accepts only allowed types
  it('accepts only document file types in file input', () => {
    render(<TaskDocumentsManager {...defaultProps} />)
    const input = screen.getByTestId('document-file-input')
    expect(input).toHaveAttribute(
      'accept',
      '.pdf,.jpg,.jpeg,.png,.docx,.xlsx'
    )
  })
})
