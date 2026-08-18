'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '@/context/auth-context'
import { ErrorBoundary } from '@/components/core/error-boundary'

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ErrorBoundary>
            <AuthProvider>{children}</AuthProvider>
        </ErrorBoundary>
    )
}
