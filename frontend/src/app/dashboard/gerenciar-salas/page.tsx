'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { roomsApi } from '@/services/rooms'
import { getErrorMessage } from '@/utils/error'
import {
    ROOM_STATUS_COLOR,
    ROOM_STATUS_LABEL,
    type Room,
    type RoomStatus,
} from '@/types/room'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { FullScreenLoader } from '@/components/core/fullscreen-loader'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { RoomFormModal } from '@/components/rooms/room-form-modal'
import { PlusIcon, RoomsIcon, TrashIcon, UsersIcon } from '@/components/core/icons'

const PAGE_SIZE = 10

export default function ManageRoomsPage() {
    const { isAdmin, status } = useAuth()
    const [rooms, setRooms] = useState<Room[]>([])
    const [totalPages, setTotalPages] = useState(1)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<RoomStatus | ''>('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const [editingRoom, setEditingRoom] = useState<Room | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [lastUpdate, setLastUpdate] = useState(0)

    const loadRooms = useCallback(async (signal?: AbortSignal) => {
        setLoading(true)
        setError(null)
        try {
            const result = await roomsApi.list(
                {
                    search: search || undefined,
                    status: statusFilter || undefined,
                    page,
                    limit: PAGE_SIZE,
                },
                signal,
            )
            setRooms(result.data)
            setTotalPages(Math.max(1, result.totalPages))
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, statusFilter, page, lastUpdate])

    useEffect(() => {
        if (status !== 'authenticated' || !isAdmin) return
        const controller = new AbortController()
        loadRooms(controller.signal)
        return () => controller.abort()
    }, [loadRooms, status, isAdmin])

    const hasFilters = search.trim() !== '' || statusFilter !== ''

    function handleSearchSubmit(event: FormEvent) {
        event.preventDefault()
        setPage(1)
        setLastUpdate((prev) => prev + 1)
    }

    function handleClearFilters() {
        setSearch('')
        setStatusFilter('')
        setPage(1)
        setLastUpdate((prev) => prev + 1)
    }

    function handleFormSuccess() {
        setLastUpdate((prev) => prev + 1)
    }

    function handleOpenCreate() {
        setEditingRoom(null)
        setFormOpen(true)
    }

    function handleOpenEdit(room: Room) {
        setEditingRoom(room)
        setFormOpen(true)
    }

    async function handleDelete(room: Room) {
        if (!window.confirm(`Deseja excluir a sala "${room.name}"?`)) {
            return
        }
        setDeleting(room.id)
        setError(null)
        try {
            await roomsApi.remove(room.id)
            setLastUpdate((prev) => prev + 1)
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setDeleting(null)
        }
    }

    const totalLabel = useMemo(
        () => `Total: ${rooms.length > 0 ? `${(page - 1) * PAGE_SIZE + rooms.length}` : '0'} sala${rooms.length !== 1 ? 's' : ''}`,
        [rooms.length, page],
    )

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

    return (
        <div className='space-y-6'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                    <h1 className='text-2xl font-semibold text-slate-900'>
                        Gerenciar Salas
                    </h1>
                    <p className='mt-1 text-sm text-slate-500'>
                        Crie, edite e exclua salas do catálogo.
                    </p>
                </div>
                <Button onClick={handleOpenCreate}>
                    <PlusIcon className='h-4 w-4' />
                    Nova sala
                </Button>
            </div>

            <Card className='p-4'>
                <form
                    onSubmit={handleSearchSubmit}
                    className='flex flex-col gap-3 sm:flex-row sm:items-end'
                >
                    <div className='flex-1 space-y-1.5'>
                        <label
                            htmlFor='search'
                            className='block text-sm font-medium text-slate-700'
                        >
                            Buscar sala
                        </label>
                        <Input
                            id='search'
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder='Nome da sala'
                        />
                    </div>
                    <div className='w-full space-y-1.5 sm:w-48'>
                        <label
                            htmlFor='status'
                            className='block text-sm font-medium text-slate-700'
                        >
                            Status
                        </label>
                        <Select
                            id='status'
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value as RoomStatus | '')
                            }
                        >
                            <option value=''>Todos</option>
                            <option value='AVAILABLE'>Disponível</option>
                            <option value='MAINTENANCE'>Em manutenção</option>
                            <option value='INACTIVE'>Inativa</option>
                        </Select>
                    </div>
                    <div className='flex gap-2'>
                        <Button type='submit' variant='secondary'>
                            Filtrar
                        </Button>
                        {hasFilters && (
                            <Button type='button' variant='ghost' onClick={handleClearFilters}>
                                Limpar
                            </Button>
                        )}
                    </div>
                </form>
            </Card>

            {error && (
                <div className='rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
                    {error}
                </div>
            )}

            {loading ? (
                <div className='flex justify-center py-16 text-sm text-slate-500'>
                    Carregando salas…
                </div>
            ) : rooms.length === 0 ? (
                <EmptyState
                    icon={<RoomsIcon className='h-10 w-10' />}
                    title='Nenhuma sala encontrada'
                    description={
                        hasFilters
                            ? 'Ajuste os filtros para ver mais resultados.'
                            : 'Clique em "Nova sala" para cadastrar a primeira sala.'
                    }
                />
            ) : (
                <>
                    <Card className='overflow-hidden'>
                        <div className='overflow-x-auto'>
                            <table className='min-w-full divide-y divide-slate-200'>
                                <thead className='bg-slate-50'>
                                    <tr>
                                        <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500'>
                                            Sala
                                        </th>
                                        <th className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500'>
                                            Capacidade
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
                                    {rooms.map((room) => (
                                        <tr key={room.id}>
                                            <td className='px-4 py-3'>
                                                <p className='text-sm font-medium text-slate-900'>
                                                    {room.name}
                                                </p>
                                                <p className='text-xs text-slate-500'>
                                                    {room.resources.length > 0
                                                        ? room.resources.join(', ')
                                                        : 'Sem recursos cadastrados'}
                                                </p>
                                            </td>
                                            <td className='px-4 py-3 text-sm text-slate-700'>
                                                <span className='inline-flex items-center gap-1.5'>
                                                    <UsersIcon className='h-4 w-4' />
                                                    {room.capacity}
                                                </span>
                                            </td>
                                            <td className='px-4 py-3'>
                                                <Badge color={ROOM_STATUS_COLOR[room.status]}>
                                                    {ROOM_STATUS_LABEL[room.status]}
                                                </Badge>
                                            </td>
                                            <td className='px-4 py-3 text-right'>
                                                <div className='flex justify-end gap-2'>
                                                    <Button
                                                        variant='outline'
                                                        size='sm'
                                                        onClick={() => handleOpenEdit(room)}
                                                    >
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant='danger'
                                                        size='sm'
                                                        loading={deleting === room.id}
                                                        onClick={() => handleDelete(room)}
                                                    >
                                                        <TrashIcon className='h-4 w-4' />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </Card>
                    <p className='text-right text-sm text-slate-400'>{totalLabel}</p>
                </>
            )}

            <RoomFormModal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                room={editingRoom}
                onSuccess={handleFormSuccess}
            />
        </div>
    )
}