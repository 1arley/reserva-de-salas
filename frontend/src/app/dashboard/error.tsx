'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { TriangleIcon } from '@/components/core/icons'

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Dashboard error:', error)
    }, [error])

    return (
        <div className='flex min-h-[400px] items-center justify-center'>
            <div className='flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-center'>
                <TriangleIcon className='h-6 w-6 text-red-600' />
                <h2 className='text-base font-semibold text-red-800'>
                    Algo deu errado
                </h2>
                <p className='text-sm text-red-700'>
                    Não foi possível carregar os dados desta página.
                </p>
                <Button variant='outline' size='sm' onClick={reset}>
                    Tentar novamente
                </Button>
            </div>
        </div>
    )
}
