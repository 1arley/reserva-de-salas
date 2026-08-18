'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { roomsApi } from '@/services/rooms'
import { favoritesApi } from '@/services/favorites'
import { getErrorMessage } from '@/utils/error'
import { ROOM_STATUS_COLOR, ROOM_STATUS_LABEL, type Room, type RoomStatus } from '@/types/room'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { FavoriteButton } from '@/components/rooms/favorite-button'
import { CreateReservationModal } from '@/components/reservations/create-reservation-modal'
import { MapPinIcon, RoomsIcon, UsersIcon } from '@/components/core/icons'

const PAGE_SIZE = 9

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([])
    const [totalPages, setTotalPages] = useState(1)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState<RoomStatus | ''>('')
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
    const [lastUpdate, setLastUpdate] = useState(0)

    const loadRooms = useCallback(async (signal?: AbortSignal) => {
        setLoading(true)
        setError(null)
        try {
            const result = await roomsApi.list({
                search: search || undefined,
                status: status || undefined,
                page,
                limit: PAGE_SIZE,
            }, signal)
            setRooms(result.data)
            setTotalPages(Math.max(1, result.totalPages))
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, status, page, lastUpdate])

    useEffect(() => {
        const controller = new AbortController()
        loadRooms(controller.signal)
        return () => controller.abort()
    }, [loadRooms])

    useEffect(() => {
        favoritesApi
            .list()
            .then((favs) => setFavoriteIds(new Set(favs.map((r) => r.id))))
            .catch((err) => {
                console.error('Falha ao carregar favoritos:', err)
            })
    }, [])

    const handleReservationCreated = useCallback(() => {
        setLastUpdate((prev) => prev + 1)
    }, [])

    const hasFilters = search.trim() !== '' || status !== ''

    const roomsWithFavorites = useMemo(
        () => rooms.map((room) => ({ ...room, favorited: favoriteIds.has(room.id) })),
        [rooms, favoriteIds],
    )

    function handleSearchSubmit(event: FormEvent) {
        event.preventDefault()
        setPage(1)
        setLastUpdate((prev) => prev + 1)
    }

    function handleClearFilters() {
        setSearch('')
        setStatus('')
        setPage(1)
        setLastUpdate((prev) => prev + 1)
    }

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='text-2xl font-semibold text-slate-900'>Salas</h1>
                <p className='mt-1 text-sm text-slate-500'>
                    Consulte a disponibilidade das salas e realize reservas.
                </p>
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
                            value={status}
                            onChange={(event) => setStatus(event.target.value as RoomStatus | '')}
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
            ) : roomsWithFavorites.length === 0 ? (
                <EmptyState
                    icon={<RoomsIcon className='h-10 w-10' />}
                    title='Nenhuma sala encontrada'
                    description={
                        hasFilters
                            ? 'Ajuste os filtros para ver mais resultados.'
                            : 'As salas cadastradas aparecerão aqui.'
                    }
                />
            ) : (
                <>
                    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                        {roomsWithFavorites.map((room) => (
                            <RoomCard
                                key={room.id}
                                room={room}
                                onReserve={() => setSelectedRoom(room)}
                            />
                        ))}
                    </div>
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </>
            )}

            <CreateReservationModal
                open={selectedRoom !== null}
                onClose={() => setSelectedRoom(null)}
                room={selectedRoom}
                onSuccess={handleReservationCreated}
            />
        </div>
    )
}

function RoomCard({
    room,
    onReserve,
}: {
    room: Room & { favorited: boolean }
    onReserve: () => void
}) {
    const available = room.status === 'AVAILABLE'

    return (
        <Card className='flex flex-col'>
            <CardContent className='flex flex-1 flex-col pt-5'>
                <div className='flex items-start justify-between gap-2'>
                    <div>
                        <h3 className='text-base font-semibold text-slate-900'>{room.name}</h3>
                        <Badge color={ROOM_STATUS_COLOR[room.status]} className='mt-1.5'>
                            {ROOM_STATUS_LABEL[room.status]}
                        </Badge>
                    </div>
                    <FavoriteButton roomId={room.id} initiallyFavorited={room.favorited} />
                </div>

                {room.description && (
                    <p className='mt-3 line-clamp-2 text-sm text-slate-500'>
                        {room.description}
                    </p>
                )}

                <div className='mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500'>
                    <span className='inline-flex items-center gap-1.5'>
                        <UsersIcon className='h-4 w-4' />
                        {room.capacity} pessoas
                    </span>
                    {room.resources.length > 0 && (
                        <span className='inline-flex items-center gap-1.5'>
                            <MapPinIcon className='h-4 w-4' />
                            {room.resources.length} recurso{room.resources.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {room.resources.length > 0 && (
                    <div className='mt-3 flex flex-wrap gap-1.5'>
                        {room.resources.slice(0, 4).map((resource) => (
                            <span
                                key={resource}
                                className='rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600'
                            >
                                {resource}
                            </span>
                        ))}
                        {room.resources.length > 4 && (
                            <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500'>
                                +{room.resources.length - 4}
                            </span>
                        )}
                    </div>
                )}

                <div className='mt-auto pt-4'>
                    <Button
                        className='w-full'
                        disabled={!available}
                        onClick={onReserve}
                    >
                        {available ? 'Reservar sala' : 'Indisponível'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
