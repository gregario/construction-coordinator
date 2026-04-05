interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-[#E8DFD3] rounded ${className ?? ''}`} />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-[#E8DFD3] p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  )
}
