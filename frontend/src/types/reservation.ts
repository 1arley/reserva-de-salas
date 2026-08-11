import type { User } from './auth'
import type { Room } from './room'

export type ReservationStatus = 'CONFIRMED' | 'CANCELLED'

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
    CONFIRMED: 'Confirmada',
    CANCELLED: 'Cancelada',
}

export interface Reservation {
    id: string
    userId: string
    roomId: string
    startTime: string
    endTime: string
    status: ReservationStatus
    notes: string | null
    createdAt: string
    updatedAt: string
    room: Pick<Room, 'id' | 'name' | 'capacity'>
    user: Pick<User, 'id' | 'name' | 'email'>
}

export interface CreateReservationInput {
    roomId: string
    startTime: string
    endTime: string
    notes?: string
}

export interface ReservationFilters {
    status?: ReservationStatus
    from?: string
    to?: string
    roomId?: string
    page?: number
    limit?: number
}

export interface WeeklySchedule {
    weekStart: string
    reservations: Reservation[]
}

export interface ReservationStats {
    totalRooms: number
    totalReservations: number
    activeToday: number
    cancellationRate: number
    topRooms: Array<{ roomId: string; name: string; count: number }>
}
