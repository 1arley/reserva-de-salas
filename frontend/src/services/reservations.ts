import { buildQuery, http } from './http'
import type { Paginated } from '@/types/common'
import type {
    CreateReservationInput,
    Reservation,
    ReservationFilters,
    ReservationStats,
    WeeklySchedule,
} from '@/types/reservation'

export const reservationsApi = {
    create: (input: CreateReservationInput): Promise<Reservation> =>
        http.post<Reservation>('/reservations', input),

    list: (filters?: ReservationFilters): Promise<Paginated<Reservation>> =>
        http.get<Paginated<Reservation>>(
            `/reservations${buildQuery(filters as Record<string, unknown>)}`,
        ),

    get: (id: string): Promise<Reservation> =>
        http.get<Reservation>(`/reservations/${id}`),

    history: (filters?: ReservationFilters): Promise<Paginated<Reservation>> =>
        http.get<Paginated<Reservation>>(
            `/reservations/history${buildQuery(filters as Record<string, unknown>)}`,
        ),

    weeklySchedule: (weekStart?: string): Promise<WeeklySchedule> =>
        http.get<WeeklySchedule>(
            `/reservations/schedule/weekly${buildQuery({ weekStart })}`,
        ),

    cancel: (id: string): Promise<Reservation> =>
        http.patch<Reservation>(`/reservations/${id}/cancel`),

    stats: (): Promise<ReservationStats> =>
        http.get<ReservationStats>('/reservations/stats'),

    admin: (filters?: ReservationFilters): Promise<Paginated<Reservation>> =>
        http.get<Paginated<Reservation>>(
            `/reservations/admin${buildQuery(filters as Record<string, unknown>)}`,
        ),

    exportCsv: (filters?: ReservationFilters): Promise<Blob> =>
        http.getBlob(
            `/reservations/export/csv${buildQuery(filters as Record<string, unknown>)}`,
        ),
}
