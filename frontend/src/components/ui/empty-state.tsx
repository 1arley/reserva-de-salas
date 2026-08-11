import type { ReactNode } from 'react'

interface EmptyStateProps {
    icon?: ReactNode
    title: string
    description?: string
    action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className='flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-200 bg-white py-16 text-center'>
            {icon && <div className='text-slate-300'>{icon}</div>}
            <div>
                <p className='text-sm font-medium text-slate-700'>{title}</p>
                {description && (
                    <p className='mt-1 text-sm text-slate-400'>{description}</p>
                )}
            </div>
            {action && <div className='mt-2'>{action}</div>}
        </div>
    )
}
