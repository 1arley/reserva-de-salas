'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { FullScreenLoader } from './fullscreen-loader'

export function AuthGuard({ children }: { children: ReactNode }) {
    const { status } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/login')
        }
    }, [status, router])

    if (status !== 'authenticated') {
        return <FullScreenLoader />
    }

    return <>{children}</>
}
