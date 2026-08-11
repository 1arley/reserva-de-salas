'use client'

import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarIcon, ChartIcon, RoomsIcon, StarIcon } from '@/components/core/icons'

const SHORTCUTS = [
    {
        href: '/dashboard/salas',
        title: 'Salas',
        description: 'Consulte a disponibilidade e reserve uma sala.',
        icon: RoomsIcon,
    },
    {
        href: '/dashboard/reservas',
        title: 'Minhas Reservas',
        description: 'Acompanhe e cancele suas reservas.',
        icon: CalendarIcon,
    },
    {
        href: '/dashboard/agenda',
        title: 'Agenda Semanal',
        description: 'Visualize as reservas da semana.',
        icon: CalendarIcon,
    },
    {
        href: '/dashboard/favoritos',
        title: 'Favoritos',
        description: 'Suas salas favoritas em um só lugar.',
        icon: StarIcon,
    },
]

export default function DashboardPage() {
    const { user, isAdmin } = useAuth()

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='text-2xl font-semibold text-slate-900'>
                    Olá, {user?.name?.split(' ')[0] ?? 'bem-vindo'}!
                </h1>
                <p className='mt-1 text-sm text-slate-500'>
                    Escolha uma opção abaixo para começar.
                </p>
            </div>

            {isAdmin && (
                <div className='flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'>
                    <ChartIcon className='h-5 w-5 shrink-0' />
                    <p>
                        Você está logado como administrador. Acesse as{' '}
                        <Link
                            href='/dashboard/estatisticas'
                            className='font-medium underline'
                        >
                            estatísticas
                        </Link>{' '}
                        e o painel de gerenciamento de salas.
                    </p>
                </div>
            )}

            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                {SHORTCUTS.map((shortcut) => {
                    const Icon = shortcut.icon
                    return (
                        <Link key={shortcut.href} href={shortcut.href} className='group'>
                            <Card className='h-full transition-colors group-hover:border-green-500'>
                                <CardHeader>
                                    <div className='mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600'>
                                        <Icon className='h-5 w-5' />
                                    </div>
                                    <CardTitle>{shortcut.title}</CardTitle>
                                    <CardDescription>{shortcut.description}</CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
