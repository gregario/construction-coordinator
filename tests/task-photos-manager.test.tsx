import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskPhotosManager, type PhotoListItem } from '@/components/photos/TaskPhotosManager'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

// Mock next/image to render a plain <img> for testing
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, sizes, ...rest } = props
    return <img {...rest} data-fill={fill ? 'true' : undefined} data-sizes={sizes as string} />
  },
}))

// Mock server actions
vi.mock('@/app/actions/photos', () => ({
  uploadPhoto: vi.fn(),
  deletePhoto: vi.fn(),
}))

const mkPhoto = (overrides: Partial<PhotoListItem> & { id: string }): PhotoListItem => ({
  storage_path: `path/${overrides.id}`,
  file_name: `${overrides.id}.jpg`,
  file_size: 2_000_000,
  taken_at: null,
  created_at: '2026-04-05T10:00:00Z',
  ...overrides,
})

describe('TaskPhotosManager', () => {
  const defaultProps = {
    projectId: 'proj-1',
    taskId: 'task-1',
    stageId: 'stage-1',
    initialPhotos: [] as PhotoListItem[],
    signedUrls: {} as Record<string, string>,
  }

  it('renders empty state when no photos', () => {
    render(<TaskPhotosManager {...defaultProps} />)
    expect(screen.getByText(/no photos yet/i)).toBeInTheDocument()
  })

  it('renders photo thumbnails with file info', () => {
    const photos = [
      mkPhoto({ id: 'p1', file_name: 'foundation.jpg', file_size: 2_500_000, created_at: '2026-04-05T10:00:00Z' }),
      mkPhoto({ id: 'p2', file_name: 'framing.jpg', file_size: 1_000_000, created_at: '2026-04-04T10:00:00Z' }),
    ]
    render(
      <TaskPhotosManager
        {...defaultProps}
        initialPhotos={photos}
        signedUrls={{ p1: 'https://example.com/p1.jpg', p2: 'https://example.com/p2.jpg' }}
      />
    )
    expect(screen.getByText('foundation.jpg')).toBeInTheDocument()
    expect(screen.getByText('framing.jpg')).toBeInTheDocument()
    expect(screen.getAllByTestId('photo-thumb')).toHaveLength(2)
  })

  it('shows photo count in header', () => {
    const photos = [mkPhoto({ id: 'p1' }), mkPhoto({ id: 'p2' })]
    render(<TaskPhotosManager {...defaultProps} initialPhotos={photos} />)
    expect(screen.getByText('(2)')).toBeInTheDocument()
  })

  it('renders Add Photo button with file input', () => {
    render(<TaskPhotosManager {...defaultProps} />)
    expect(screen.getByText('+ Add Photo')).toBeInTheDocument()
    expect(screen.getByTestId('photo-file-input')).toBeInTheDocument()
  })

  it('shows "No preview" when signed URL is missing', () => {
    const photos = [mkPhoto({ id: 'p1' })]
    render(<TaskPhotosManager {...defaultProps} initialPhotos={photos} signedUrls={{}} />)
    expect(screen.getByText('No preview')).toBeInTheDocument()
  })

  // @criterion: AC-NI-2
  // AC-NI-2: next/image used in TaskPhotosManager — thumbnails render via next/image with fill prop.
  it('renders next/image with fill prop when signed URL is available', () => {
    const photos = [mkPhoto({ id: 'p1', file_name: 'site.jpg' })]
    render(
      <TaskPhotosManager
        {...defaultProps}
        initialPhotos={photos}
        signedUrls={{ p1: 'https://example.com/signed.jpg' }}
      />
    )
    const img = screen.getByAltText('site.jpg')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/signed.jpg')
    expect(img).toHaveAttribute('data-fill', 'true')
  })

  // @criterion: AC-NI-4
  // AC-NI-4: Photo thumbnails retain aspect-square object-cover styling after next/image swap.
  it('preserves object-cover styling on next/image', () => {
    const photos = [mkPhoto({ id: 'p1', file_name: 'site.jpg' })]
    render(
      <TaskPhotosManager
        {...defaultProps}
        initialPhotos={photos}
        signedUrls={{ p1: 'https://example.com/signed.jpg' }}
      />
    )
    const img = screen.getByAltText('site.jpg')
    expect(img.className).toContain('object-cover')
  })

  it('renders delete buttons for each photo', () => {
    const photos = [mkPhoto({ id: 'p1', file_name: 'a.jpg' }), mkPhoto({ id: 'p2', file_name: 'b.jpg' })]
    render(<TaskPhotosManager {...defaultProps} initialPhotos={photos} />)
    expect(screen.getByLabelText('Delete a.jpg')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete b.jpg')).toBeInTheDocument()
  })

  it('accepts camera capture on mobile via capture attribute', () => {
    render(<TaskPhotosManager {...defaultProps} />)
    const input = screen.getByTestId('photo-file-input')
    expect(input).toHaveAttribute('capture', 'environment')
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/heic')
  })
})
