export type RoomStatus = 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE'

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
    AVAILABLE: 'Disponível',
    MAINTENANCE: 'Em manutenção',
    INACTIVE: 'Inativa',
}

export const ROOM_STATUS_COLOR: Record<RoomStatus, 'green' | 'yellow' | 'red'> = {
    AVAILABLE: 'green',
    MAINTENANCE: 'yellow',
    INACTIVE: 'red',
}

export interface Room {
    id: string
    name: string
    description: string | null
    capacity: number
    resources: string[]
    status: RoomStatus
    createdAt: string
    updatedAt: string
}

export interface RoomFilters {
    search?: string
    minCapacity?: number
    status?: RoomStatus
    availableFrom?: string
    availableTo?: string
    page?: number
    limit?: number
}

export interface CreateRoomInput {
    name: string
    capacity: number
    description?: string
    resources?: string[]
    status?: RoomStatus
}

export type UpdateRoomInput = Partial<CreateRoomInput>
