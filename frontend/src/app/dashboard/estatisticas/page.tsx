'use client'

import { useEffect, useState } from 'react'
import { reservationsApi } from '@/services/reservations'
import { getErrorMessage } from '@/utils/error'
import type { ReservationStats } from '@/types/reservation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartIcon, RoomsIcon, CalendarIcon, ClockIcon, CheckIcon } from '@/components/core/icons'
import { useAuth } from '@/context/auth-context'
import { FullScreenLoader } from '@/components/core/fullscreen-loader'

export default function StatsPage() {
    const { isAdmin, status } = useAuth()
    const [stats, setStats] = useState<ReservationStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (status !== 'authenticated' || !isAdmin) return
        let cancelled = false
        reservationsApi
            .stats()
            .then((data) => {
                if (!cancelled) setStats(data)
            })
            .catch((err) => {
                if (!cancelled) setError(getErrorMessage(err))
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [status, isAdmin])

    if (status !== 'authenticated') {
        return <FullScreenLoader />
    }

    if (!isAdmin) {
        return (
            <div className='flex min-h-64 items-center justify-center rounded-lg border border-slate-200 bg-white'>
                <p className='text-sm text-slate-500'>
                    Apenas administradores podem acessar esta página.
                </p>
            </div>
        )
    }

    const cards = [
        {
            label: 'Salas cadastradas',
            value: stats?.totalRooms ?? '—',
            icon: RoomsIcon,
        },
        {
            label: 'Reservas totais',
            value: stats?.totalReservations ?? '—',
            icon: CalendarIcon,
        },
        {
            label: 'Ativas hoje',
            value: stats?.activeToday ?? '—',
            icon: ClockIcon,
        },
        {
            label: 'Taxa de cancelamento',
            value: stats ? `${stats.cancellationRate.toFixed(1)}%` : '—',
            icon: CheckIcon,
        },
    ]

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='text-2xl font-semibold text-slate-900'>Estatísticas</h1>
                <p className='mt-1 text-sm text-slate-500'>
                    Indicadores e métricas das reservas.
                </p>
            </div>

            {error && (
                <div className='rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
                    {error}
                </div>
            )}

            {loading ? (
                <div className='flex justify-center py-16 text-sm text-slate-500'>
                    Carregando estatísticas…
                </div>
            ) : (
                <>
                    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                        {cards.map((card) => {
                            const Icon = card.icon
                            return (
                                <Card key={card.label}>
                                    <CardContent className='pt-5'>
                                        <div className='flex items-center gap-3'>
                                            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600'>
                                                <Icon className='h-5 w-5' />
                                            </div>
                                            <div>
                                                <p className='text-2xl font-semibold text-slate-900'>
                                                    {card.value}
                                                </p>
                                                <p className='text-sm text-slate-500'>
                                                    {card.label}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Salas mais utilizadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stats && stats.topRooms.length === 0 ? (
                                <div className='flex items-center gap-2 py-8 text-sm text-slate-400'>
                                    <ChartIcon className='h-5 w-5' />
                                    Nenhuma reserva confirmada até o momento.
                                </div>
                            ) : (
                                <div className='space-y-3'>
                                    {stats?.topRooms.map((room, index) => {
                                        const max = stats.topRooms[0]?.count ?? 1
                                        const width = Math.max(
                                            8,
                                            Math.round((room.count / max) * 100),
                                        )
                                        return (
                                            <div key={room.roomId} className='flex items-center gap-3'>
                                                <Badge color={index === 0 ? 'green' : 'gray'}>
                                                    {index + 1}º
                                                </Badge>
                                                <div className='min-w-0 flex-1'>
                                                    <div className='flex items-center justify-between gap-2'>
                                                        <p className='truncate text-sm font-medium text-slate-800'>
                                                            {room.name}
                                                        </p>
                                                        <p className='text-sm text-slate-500'>
                                                            {room.count} reserva
                                                            {room.count !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                    <div className='mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100'>
                                                        <div
                                                            className='h-full rounded-full bg-green-600'
                                                            style={{ width: `${width}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
