'use client'

import { useCallback, useEffect, useState } from 'react'
import { favoritesApi } from '@/services/favorites'
import { getErrorMessage } from '@/utils/error'
import { ROOM_STATUS_COLOR, ROOM_STATUS_LABEL, type Room } from '@/types/room'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { FavoriteButton } from '@/components/rooms/favorite-button'
import { CreateReservationModal } from '@/components/reservations/create-reservation-modal'
import { StarIcon, UsersIcon } from '@/components/core/icons'

export default function FavoritesPage() {
    const [rooms, setRooms] = useState<Room[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

    const loadFavorites = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            setRooms(await favoritesApi.list())
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadFavorites()
    }, [loadFavorites])

    function handleToggle(roomId: string, favorited: boolean) {
        if (!favorited) {
            setRooms((current) => current.filter((room) => room.id !== roomId))
        }
    }

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='text-2xl font-semibold text-slate-900'>Favoritos</h1>
                <p className='mt-1 text-sm text-slate-500'>
                    Suas salas favoritas para acesso rápido.
                </p>
            </div>

            {error && (
                <div className='rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
                    {error}
                </div>
            )}

            {loading ? (
                <div className='flex justify-center py-16 text-sm text-slate-500'>
                    Carregando favoritos…
                </div>
            ) : rooms.length === 0 ? (
                <EmptyState
                    icon={<StarIcon className='h-10 w-10' />}
                    title='Nenhuma sala favorita'
                    description='Toque na estrela em uma sala para adicioná-la aqui.'
                />
            ) : (
                <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    {rooms.map((room) => (
                        <FavoriteRoomCard
                            key={room.id}
                            room={room}
                            onReserve={() => setSelectedRoom(room)}
                            onToggle={handleToggle}
                        />
                    ))}
                </div>
            )}

            <CreateReservationModal
                open={selectedRoom !== null}
                onClose={() => setSelectedRoom(null)}
                room={selectedRoom}
            />
        </div>
    )
}

function FavoriteRoomCard({
    room,
    onReserve,
    onToggle,
}: {
    room: Room
    onReserve: () => void
    onToggle: (roomId: string, favorited: boolean) => void
}) {
    const available = room.status === 'AVAILABLE'

    return (
        <Card>
            <CardContent className='pt-5'>
                <div className='flex items-start justify-between gap-2'>
                    <div>
                        <h3 className='text-base font-semibold text-slate-900'>{room.name}</h3>
                        <Badge color={ROOM_STATUS_COLOR[room.status]} className='mt-1.5'>
                            {ROOM_STATUS_LABEL[room.status]}
                        </Badge>
                    </div>
                    <FavoriteButton
                        roomId={room.id}
                        initiallyFavorited
                        onToggle={(favorited) => onToggle(room.id, favorited)}
                    />
                </div>

                {room.description && (
                    <p className='mt-3 line-clamp-2 text-sm text-slate-500'>
                        {room.description}
                    </p>
                )}

                <div className='mt-3 flex items-center gap-4 text-sm text-slate-500'>
                    <span className='inline-flex items-center gap-1.5'>
                        <UsersIcon className='h-4 w-4' />
                        {room.capacity} pessoas
                    </span>
                    {room.resources.length > 0 && (
                        <span className='inline-flex items-center gap-1'>
                            {room.resources.slice(0, 3).join(', ')}
                            {room.resources.length > 3 && ` +${room.resources.length - 3}`}
                        </span>
                    )}
                </div>

                <Button className='mt-4 w-full' disabled={!available} onClick={onReserve}>
                    {available ? 'Reservar sala' : 'Indisponível'}
                </Button>
            </CardContent>
        </Card>
    )
}
