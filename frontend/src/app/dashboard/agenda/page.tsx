'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { reservationsApi } from '@/services/reservations'
import { roomsApi } from '@/services/rooms'
import { getErrorMessage } from '@/utils/error'
import { addDays, formatDayMonth, startOfWeek, toISODate } from '@/utils/date'
import type { Reservation } from '@/types/reservation'
import type { Room } from '@/types/room'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@/components/core/icons'

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function SchedulePage() {
    const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
    const [rooms, setRooms] = useState<Room[]>([])
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [schedule, roomsResult] = await Promise.all([
                reservationsApi.weeklySchedule(toISODate(weekStart)),
                roomsApi.list({ limit: 100 }),
            ])
            setReservations(schedule.reservations)
            setRooms(roomsResult.data)
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }, [weekStart])

    useEffect(() => {
        load()
    }, [load])

    const days = useMemo(
        () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
        [weekStart],
    )

    const weekLabel = useMemo(() => {
        const end = addDays(weekStart, 6)
        const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
        const startLabel = weekStart.toLocaleDateString('pt-BR', opts)
        const endLabel = end.toLocaleDateString('pt-BR', opts)
        const year = weekStart.getFullYear()
        return `${startLabel} — ${endLabel}, ${year}`
    }, [weekStart])

    const isCurrentWeek = useMemo(() => {
        const today = new Date()
        return toISODate(startOfWeek(today)) === toISODate(weekStart)
    }, [weekStart])

    const todayIndex = useMemo(() => {
        const today = new Date()
        if (toISODate(startOfWeek(today)) !== toISODate(weekStart)) return -1
        const day = today.getDay()
        return day === 0 ? 6 : day - 1
    }, [weekStart])

    function changeWeek(delta: number) {
        const next = new Date(weekStart)
        next.setDate(next.getDate() + delta * 7)
        setWeekStart(next)
    }

    const roomsWithReservations = useMemo(() => {
        const byRoom = new Map<string, Reservation[]>()
        for (const reservation of reservations) {
            const list = byRoom.get(reservation.roomId) ?? []
            list.push(reservation)
            byRoom.set(reservation.roomId, list)
        }
        return rooms.map((room) => ({
            room,
            reservations: (byRoom.get(room.id) ?? []).sort(
                (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
            ),
        }))
    }, [rooms, reservations])

    const hasData = rooms.length > 0

    return (
        <div className='space-y-6'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                    <h1 className='text-2xl font-semibold text-slate-900'>Agenda Semanal</h1>
                    <p className='mt-1 text-sm text-slate-500'>
                        Visualize as reservas de todas as salas ao longo da semana.
                    </p>
                </div>
                <div className='flex items-center gap-2'>
                    <Button variant='outline' size='sm' onClick={() => changeWeek(-1)}>
                        <ChevronLeftIcon className='h-4 w-4' />
                    </Button>
                    <span className='min-w-44 text-center text-sm font-medium text-slate-700'>
                        {weekLabel}
                    </span>
                    <Button variant='outline' size='sm' onClick={() => changeWeek(1)}>
                        <ChevronRightIcon className='h-4 w-4' />
                    </Button>
                    {!isCurrentWeek && (
                        <Button variant='ghost' size='sm' onClick={() => setWeekStart(startOfWeek(new Date()))}>
                            Hoje
                        </Button>
                    )}
                </div>
            </div>

            {error && (
                <div className='rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
                    {error}
                </div>
            )}

            {loading ? (
                <div className='flex justify-center py-16 text-sm text-slate-500'>
                    Carregando agenda…
                </div>
            ) : !hasData ? (
                <EmptyState
                    icon={<CalendarIcon className='h-10 w-10' />}
                    title='Nenhuma sala cadastrada'
                    description='As reservas da semana aparecerão aqui.'
                />
            ) : (
                <Card className='overflow-hidden'>
                    <div className='overflow-x-auto'>
                        <table className='w-full border-collapse'>
                            <thead>
                                <tr>
                                    <th className='sticky left-0 z-10 w-40 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500'>
                                        Sala
                                    </th>
                                    {days.map((day, index) => (
                                        <th
                                            key={day.toISOString()}
                                            className={`min-w-36 border-b border-slate-200 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide ${
                                                index === todayIndex
                                                    ? 'bg-green-50 text-green-700'
                                                    : 'bg-slate-50 text-slate-500'
                                            }`}
                                        >
                                            <span className='block'>{DAYS[index]}</span>
                                            <span className='block font-semibold'>
                                                {formatDayMonth(day)}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {roomsWithReservations.map(({ room, reservations: roomReservations }) => (
                                    <tr key={room.id}>
                                        <td className='sticky left-0 z-10 border-b border-slate-100 bg-white px-3 py-2'>
                                            <p className='text-sm font-medium text-slate-900'>
                                                {room.name}
                                            </p>
                                            <p className='text-xs text-slate-500'>
                                                {room.capacity} pessoas
                                            </p>
                                        </td>
                                        {days.map((day, dayIndex) => (
                                            <DayCell
                                                key={day.toISOString()}
                                                date={day}
                                                reservations={roomReservations}
                                                today={dayIndex === todayIndex}
                                            />
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    )
}

function DayCell({
    date,
    reservations,
    today,
}: {
    date: Date
    reservations: Reservation[]
    today: boolean
}) {
    const dayReservations = useMemo(
        () =>
            reservations.filter((reservation) => {
                const start = new Date(reservation.startTime)
                return (
                    start.getFullYear() === date.getFullYear() &&
                    start.getMonth() === date.getMonth() &&
                    start.getDate() === date.getDate()
                )
            }),
        [reservations, date],
    )

    return (
        <td
            className={`border-b border-slate-100 px-2 py-2 align-top ${
                today ? 'bg-green-50/50' : 'bg-white'
            }`}
        >
            {dayReservations.length === 0 ? (
                <p className='py-2 text-center text-xs text-slate-300'>—</p>
            ) : (
                <div className='space-y-1.5'>
                    {dayReservations.map((reservation) => (
                        <div
                            key={reservation.id}
                            className='rounded-md bg-green-600 px-2 py-1.5 text-xs leading-tight text-white'
                        >
                            <p className='font-medium'>
                                {new Date(reservation.startTime).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                            <p className='truncate text-green-50'>
                                {reservation.user.name ?? reservation.user.email}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </td>
    )
}
