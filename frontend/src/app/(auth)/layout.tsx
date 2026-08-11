'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { FullScreenLoader } from '@/components/core/fullscreen-loader'

export default function AuthLayout({ children }: { children: ReactNode }) {
    const { status } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (status === 'authenticated') {
            router.replace('/dashboard')
        }
    }, [status, router])

    if (status === 'loading') {
        return <FullScreenLoader />
    }

    return (
        <div className='flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10'>
            <div className='w-full max-w-md'>{children}</div>
        </div>
    )
}
