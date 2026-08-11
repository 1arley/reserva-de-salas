import { cn } from '@/utils/lib/tailwind-merge'

type BadgeColor = 'green' | 'yellow' | 'red' | 'gray' | 'blue'

const colorClasses: Record<BadgeColor, string> = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-700',
}

interface BadgeProps {
    color?: BadgeColor
    children: React.ReactNode
    className?: string
}

export function Badge({ color = 'gray', children, className }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                colorClasses[color],
                className,
            )}
        >
            {children}
        </span>
    )
}
