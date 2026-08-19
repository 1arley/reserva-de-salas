'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { cn } from '@/utils/lib/tailwind-merge'
import {
    CalendarIcon,
    ChartIcon,
    DashboardIcon,
    LogOutIcon,
    RoomsIcon,
    StarIcon,
} from './icons'

interface NavItem {
    href: string
    label: string
    icon: (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element
    adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
    { href: '/dashboard/salas', label: 'Salas', icon: RoomsIcon },
    { href: '/dashboard/reservas', label: 'Minhas Reservas', icon: CalendarIcon },
    { href: '/dashboard/agenda', label: 'Agenda Semanal', icon: CalendarIcon },
    { href: '/dashboard/favoritos', label: 'Favoritos', icon: StarIcon },
    {
        href: '/dashboard/gerenciar-salas',
        label: 'Gerenciar Salas',
        icon: RoomsIcon,
        adminOnly: true,
    },
    { href: '/dashboard/estatisticas', label: 'Estatísticas', icon: ChartIcon, adminOnly: true },
]

interface SidebarProps {
    open: boolean
    onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
    const pathname = usePathname()
    const { user, isAdmin, logout } = useAuth()

    const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

    return (
        <>
            {open && (
                <div
                    className='fixed inset-0 z-30 bg-slate-900/50 lg:hidden'
                    onClick={onClose}
                    aria-hidden='true'
                />
            )}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col bg-slate-900 text-slate-300 transition-transform lg:static lg:translate-x-0',
                    open ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className='flex h-16 items-center gap-2.5 border-b border-slate-800 px-5'>
                    <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 font-bold text-white'>
                        S
                    </div>
                    <div className='leading-tight'>
                        <p className='text-sm font-semibold text-white'>Reserva de Salas</p>
                        <p className='text-xs text-slate-400'>Seed a Bit</p>
                    </div>
                </div>

                <nav className='flex-1 space-y-1 overflow-y-auto p-3'>
                    {visibleItems.map((item) => {
                        const active = pathname === item.href
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                    active
                                        ? 'bg-green-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                                )}
                                aria-current={active ? 'page' : undefined}
                            >
                                <Icon className='h-5 w-5 shrink-0' />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className='border-t border-slate-800 p-3'>
                    <div className='flex items-center gap-3 rounded-md px-3 py-2'>
                        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold uppercase text-white'>
                            {user?.name?.[0] ?? user?.email?.[0] ?? '?'}
                        </div>
                        <div className='min-w-0 flex-1 leading-tight'>
                            <p className='truncate text-sm font-medium text-white'>
                                {user?.name ?? user?.email}
                            </p>
                            <p className='truncate text-xs text-slate-400'>{user?.email}</p>
                        </div>
                        <button
                            type='button'
                            onClick={logout}
                            className='shrink-0 rounded p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white'
                            title='Sair'
                            aria-label='Sair'
                        >
                            <LogOutIcon className='h-5 w-5' />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    )
}
