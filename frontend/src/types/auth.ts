import type { Role } from './common'

export interface User {
    id: string
    email: string
    name: string | null
    role: Role
    createdAt: string
    updatedAt: string
}

export interface LoginPayload {
    email: string
    password: string
}

export interface RegisterPayload {
    name: string
    email: string
    password: string
}

export interface LoginResponse {
    access_token: string
    refresh_token: string
    user: User
}

export interface RegisterResponse {
    message: string
    user: User
}

export interface RefreshResponse {
    access_token: string
    refresh_token: string
}
