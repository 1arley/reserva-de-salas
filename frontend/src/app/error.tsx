'use client'

import { Button } from '@/components/ui/button'
import { TriangleIcon } from '@/components/core/icons'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html lang='pt-BR'>
            <body>
                <div className='flex min-h-screen items-center justify-center bg-slate-50'>
                    <div className='flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center'>
                        <TriangleIcon className='h-8 w-8 text-red-600' />
                        <h2 className='text-lg font-semibold text-red-800'>
                            Algo deu errado
                        </h2>
                        <p className='text-sm text-red-700'>
                            {error?.message ?? 'Ocorreu um erro inesperado.'}
                        </p>
                        <Button variant='outline' size='sm' onClick={reset}>
                            Tentar novamente
                        </Button>
                    </div>
                </div>
            </body>
        </html>
    )
}
