import { http } from './http'
import type { Room } from '@/types/room'

export const favoritesApi = {
    list: (): Promise<Room[]> =>
        http.get<Room[]>('/favorites'),

    toggle: (roomId: string): Promise<{ favorited: boolean }> =>
        http.post<{ favorited: boolean }>(`/favorites/${roomId}`),
}
