'use client'

import { Component, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="text-[#B85450] mb-3" size={32} aria-hidden />
          <h3 className="font-semibold text-[#2B1F17] mb-1">Something went wrong</h3>
          <p className="text-sm text-[#6B5D52] mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-lg bg-[#8B5E3C] text-[#FAF7F2] text-sm font-medium hover:bg-[#754C30] transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
