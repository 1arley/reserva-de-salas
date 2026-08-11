'use client'

import { useAuth } from '@/context/auth-context'
import { MenuIcon } from './icons'

interface HeaderProps {
    onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
    const { user, isAdmin } = useAuth()

    return (
        <header className='sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6'>
            <button
                type='button'
                onClick={onMenuClick}
                className='rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden'
                aria-label='Abrir menu'
            >
                <MenuIcon className='h-6 w-6' />
            </button>

            <div className='flex-1'>
                {isAdmin && (
                    <span className='hidden rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 sm:inline-block'>
                        Administrador
                    </span>
                )}
            </div>

            <div className='flex items-center gap-3'>
                <div className='text-right leading-tight'>
                    <p className='text-sm font-medium text-slate-900'>
                        {user?.name ?? 'Usuário'}
                    </p>
                    <p className='text-xs text-slate-500'>{user?.email}</p>
                </div>
                <div className='flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-sm font-semibold uppercase text-white'>
                    {user?.name?.[0] ?? user?.email?.[0] ?? '?'}
                </div>
            </div>
        </header>
    )
}
