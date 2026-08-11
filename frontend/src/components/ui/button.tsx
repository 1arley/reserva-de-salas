import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/lib/tailwind-merge'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500',
    secondary: 'bg-slate-800 text-white hover:bg-slate-900 focus-visible:ring-slate-500',
    outline:
        'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
}

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-6 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props },
    ref,
) {
    return (
        <button
            ref={ref}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-60',
                variantClasses[variant],
                sizeClasses[size],
                className,
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <span
                    className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent'
                    aria-hidden='true'
                />
            )}
            {children}
        </button>
    )
})
