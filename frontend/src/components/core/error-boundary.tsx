'use client'

import React, { useState, useEffect, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { TriangleIcon } from '@/components/core/icons'

interface ErrorBoundaryProps {
    children: ReactNode
    fallback?: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | undefined
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: undefined }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }
            return (
                <div className='flex min-h-screen items-center justify-center bg-slate-50'>
                    <div className='flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center'>
                        <TriangleIcon className='h-8 w-8 text-red-600' />
                        <h2 className='text-lg font-semibold text-red-800'>
                            Algo deu errado
                        </h2>
                        <p className='text-sm text-red-700'>
                            {this.state.error?.message ?? 'Ocorreu um erro inesperado.'}
                        </p>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                                this.setState({ hasError: false, error: undefined })
                                window.location.reload()
                            }}
                        >
                            Recarregar página
                        </Button>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}

export function useErrorBoundary(callback: (error: Error) => void) {
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        if (error) {
            callback(error)
        }
    }, [error, callback])

    return setError.bind(null) as (error: Error) => void
}
