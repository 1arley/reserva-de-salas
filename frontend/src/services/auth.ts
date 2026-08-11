import { http } from './http'
import type {
    LoginPayload,
    LoginResponse,
    RefreshResponse,
    RegisterPayload,
    RegisterResponse,
    User,
} from '@/types/auth'

export const authApi = {
    login: (payload: LoginPayload): Promise<LoginResponse> =>
        http.post<LoginResponse>('/auth/login', payload),

    register: (payload: RegisterPayload): Promise<RegisterResponse> =>
        http.post<RegisterResponse>('/auth/register', payload),

    refresh: (): Promise<RefreshResponse> =>
        http.post<RefreshResponse>('/auth/refresh'),

    logout: (): Promise<void> =>
        http.post<void>('/auth/logout'),

    me: (signal?: AbortSignal): Promise<User> =>
        http.get<User>('/user/me', signal),
}
