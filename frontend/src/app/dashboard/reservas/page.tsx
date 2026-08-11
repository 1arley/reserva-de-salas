'use client'

import { useCallback, useEffect, useState } from 'react'
import { reservationsApi } from '@/services/reservations'
import { getErrorMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/date'
import {
    RESERVATION_STATUS_LABEL,
    type Reservation,
    type ReservationStatus,
} from '@/types/reservation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { CalendarIcon, DownloadIcon } from '@/components/core/icons'

const PAGE_SIZE = 10

export default function ReservationsPage() {
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [totalPages, setTotalPages] = useState(1)
    const [page, setPage] = useState(1)
    const [status, setStatus] = useState<ReservationStatus | ''>('')
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [cancellingId, setCancellingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const loadReservations = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await reservationsApi.list({
                status: status || undefined,
                page,
                limit: PAGE_SIZE,
            })
            setReservations(result.data)
            setTotalPages(Math.max(1, result.totalPages))
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }, [status, page])

    useEffect(() => {
        loadReservations()
    }, [loadReservations])

    async function handleCancel(reservation: Reservation) {
        if (!window.confirm(`Deseja cancelar a reserva "${reservation.room.name}"?`)) {
            return
        }
        setCancellingId(reservation.id)
        setError(null)
        try {
            await reservationsApi.cancel(reservation.id)
            await loadReservations()
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setCancellingId(null)
        }
    }

    async function handleExport() {
        setExporting(true)
        setError(null)
        try {
            const blob = await reservationsApi.exportCsv({ status: status || undefined })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `minhas-reservas-${new Date().toISOString().slice(0, 10)}.csv`
            document.body.appendChild(link)
            link.click()
            link.remove()
            URL.revokeObjectURL(url)
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className='space-y-6'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                    <h1 className='text-2xl font-semibold text-slate-900'>Minhas Reservas</h1>
                    <p className='mt-1 text-sm text-slate-500'>
                        Acompanhe, cancele e exporte suas reservas.
                    </p>
                </div>
                <Button
                    variant='outline'
                    onClick={handleExport}
                    loading={exporting}
                    disabled={reservations.length === 0}
                >
                    <DownloadIcon className='h-4 w-4' />
                    Exportar CSV
                </Button>
            </div>

            <div className='w-full sm:w-56'>
                <label
                    htmlFor='status'
                    className='block text-sm font-medium text-slate-700'
                >
                    Status
                </label>
                <Select
                    id='status'
                    className='mt-1.5'
                    value={status}
                    onChange={(event) => {
                        setStatus(event.target.value as ReservationStatus | '')
                        setPage(1)
                    }}
                >
                    <option value=''>Todas</option>
                    <option value='CONFIRMED'>Confirmadas</option>
                    <option value='CANCELLED'>Canceladas</option>
                </Select>
            </div>

            {error && (
                <div className='rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
                    {error}
                </div>
            )}

            {loading ? (
                <div className='flex justify-center py-16 text-sm text-slate-500'>
                    Carregando reservas…
                </div>
            ) : reservations.length === 0 ? (
                <EmptyState
                    icon={<CalendarIcon className='h-10 w-10' />}
                    title='Nenhuma reserva encontrada'
                    description={
                        status === 'CANCELLED'
                            ? 'Você ainda não cancelou nenhuma reserva.'
                            : 'Faça sua primeira reserva em uma das salas.'
                    }
                />
            ) : (
                <Card className='overflow-hidden'>
                    <div className='overflow-x-auto'>
                        <table className='min-w-full divide-y divide-slate-200'>
                            <thead className='bg-slate-50'>
                                <tr>
                                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500'>
                                        Sala
                                    </th>
                                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500'>
                                        Início
                                    </th>
                                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500'>
                                        Fim
                                    </th>
                                    <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500'>
                                        Status
                                    </th>
                                    <th className='px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500'>
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-slate-100 bg-white'>
                                {reservations.map((reservation) => {
                                    const cancellable =
                                        reservation.status === 'CONFIRMED' &&
                                        new Date(reservation.startTime).getTime() > Date.now()
                                    return (
                                        <tr key={reservation.id}>
                                            <td className='px-4 py-3'>
                                                <p className='text-sm font-medium text-slate-900'>
                                                    {reservation.room.name}
                                                </p>
                                                <p className='text-xs text-slate-500'>
                                                    {reservation.notes ?? '—'}
                                                </p>
                                            </td>
                                            <td className='px-4 py-3 text-sm text-slate-700'>
                                                {formatDateTime(reservation.startTime)}
                                            </td>
                                            <td className='px-4 py-3 text-sm text-slate-700'>
                                                {formatDateTime(reservation.endTime)}
                                            </td>
                                            <td className='px-4 py-3'>
                                                <Badge
                                                    color={
                                                        reservation.status === 'CONFIRMED'
                                                            ? 'green'
                                                            : 'red'
                                                    }
                                                >
                                                    {RESERVATION_STATUS_LABEL[reservation.status]}
                                                </Badge>
                                            </td>
                                            <td className='px-4 py-3 text-right'>
                                                {cancellable && (
                                                    <Button
                                                        variant='outline'
                                                        size='sm'
                                                        loading={cancellingId === reservation.id}
                                                        onClick={() => handleCancel(reservation)}
                                                    >
                                                        Cancelar
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                </Card>
            )}
        </div>
    )
}
