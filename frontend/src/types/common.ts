export type Role = 'USER' | 'ADMIN' | 'SUPERADMIN'

export interface ApiErrorBody {
    statusCode: number
    timestamp: string
    path: string
    message: string | string[]
}

export interface Paginated<T> {
    data: T[]
    total: number
    page: number
    limit: number
    totalPages: number
}
