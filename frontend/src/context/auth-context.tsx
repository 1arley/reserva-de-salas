'use client'

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'
import { authApi } from '@/services/auth'
import { ApiError } from '@/services/http'
import type { LoginPayload, RegisterPayload, User } from '@/types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
    user: User | null
    status: AuthStatus
    isAuthenticated: boolean
    isAdmin: boolean
    login: (payload: LoginPayload) => Promise<void>
    register: (payload: RegisterPayload) => Promise<void>
    logout: () => Promise<void>
}

const STORAGE_KEY = 'reserva-de-salas:user'

const AuthContext = createContext<AuthContextValue | null>(null)

function persistUser(user: User): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } catch {
        // Storage indisponível (ex.: modo privado) — sessão continua em memória.
    }
}

function clearPersistedUser(): void {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch {
        // Ignora.
    }
}

function readCachedUser(): User | null {
    try {
        const cached = localStorage.getItem(STORAGE_KEY)
        if (!cached) {
            return null
        }
        const parsed: unknown = JSON.parse(cached)
        if (parsed && typeof parsed === 'object' && 'id' in parsed) {
            return parsed as User
        }
        return null
    } catch {
        return null
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [status, setStatus] = useState<AuthStatus>('loading')

    useEffect(() => {
        const cached = readCachedUser()
        let cancelled = false

        const applyUser = (next: User) => {
            setUser(next)
            persistUser(next)
            setStatus('authenticated')
        }

        authApi
            .me()
            .then((me) => {
                if (!cancelled) {
                    applyUser(me)
                }
            })
            .catch((error: unknown) => {
                if (cancelled) {
                    return
                }
                const isAuthError = error instanceof ApiError && error.statusCode === 401
                if (isAuthError) {
                    setUser(null)
                    clearPersistedUser()
                    setStatus('unauthenticated')
                } else if (cached) {
                    // Falha de rede/servidor: mantém a sessão em cache sem bloquear a navegação.
                    setUser(cached)
                    setStatus('authenticated')
                } else {
                    setStatus('unauthenticated')
                }
            })

        return () => {
            cancelled = true
        }
    }, [])

    const login = useCallback(async (payload: LoginPayload) => {
        const response = await authApi.login(payload)
        setUser(response.user)
        persistUser(response.user)
        setStatus('authenticated')
    }, [])

    const register = useCallback(async (payload: RegisterPayload) => {
        await authApi.register(payload)
        // O registro não define cookies — autentica automaticamente após o cadastro.
        const response = await authApi.login({
            email: payload.email,
            password: payload.password,
        })
        setUser(response.user)
        persistUser(response.user)
        setStatus('authenticated')
    }, [])

    const logout = useCallback(async () => {
        try {
            await authApi.logout()
        } finally {
            setUser(null)
            clearPersistedUser()
            setStatus('unauthenticated')
        }
    }, [])

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            status,
            isAuthenticated: status === 'authenticated',
            isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPERADMIN',
            login,
            register,
            logout,
        }),
        [user, status, login, register, logout],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
    }
    return context
}
