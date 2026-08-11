import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/lib/tailwind-merge'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
    function Select({ className, children, ...props }, ref) {
        return (
            <select
                ref={ref}
                className={cn(
                    'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900',
                    'focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    className,
                )}
                {...props}
            >
                {children}
            </select>
        )
    },
)
