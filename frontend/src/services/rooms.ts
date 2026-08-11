import { buildQuery, http } from './http'
import type { Paginated } from '@/types/common'
import type { CreateRoomInput, Room, RoomFilters, UpdateRoomInput } from '@/types/room'

export const roomsApi = {
    list: (filters?: RoomFilters): Promise<Paginated<Room>> =>
        http.get<Paginated<Room>>(`/rooms${buildQuery(filters as Record<string, unknown>)}`),

    get: (id: string): Promise<Room> =>
        http.get<Room>(`/rooms/${id}`),

    create: (input: CreateRoomInput): Promise<Room> =>
        http.post<Room>('/rooms', input),

    update: (id: string, input: UpdateRoomInput): Promise<Room> =>
        http.patch<Room>(`/rooms/${id}`, input),

    remove: (id: string): Promise<{ message: string }> =>
        http.delete<{ message: string }>(`/rooms/${id}`),
}
