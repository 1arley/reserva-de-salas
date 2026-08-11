import { Button } from './button'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/core/icons'

interface PaginationProps {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null

    return (
        <div className='flex items-center justify-between border-t border-slate-200 px-4 py-3'>
            <p className='text-sm text-slate-500'>
                Página <span className='font-medium text-slate-700'>{page}</span> de{' '}
                <span className='font-medium text-slate-700'>{totalPages}</span>
            </p>
            <div className='flex gap-2'>
                <Button
                    variant='outline'
                    size='sm'
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    <ChevronLeftIcon className='h-4 w-4' />
                    Anterior
                </Button>
                <Button
                    variant='outline'
                    size='sm'
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    Próxima
                    <ChevronRightIcon className='h-4 w-4' />
                </Button>
            </div>
        </div>
    )
}
