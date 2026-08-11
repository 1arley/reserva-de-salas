import type { ApiErrorBody } from '@/types/common'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX ?? '/api'

export const BASE_URL = `${API_URL}${API_PREFIX}`

export class ApiError extends Error {
    readonly statusCode: number
    readonly details: string | string[]

    constructor(statusCode: number, message: string | string[]) {
        super(Array.isArray(message) ? message.join('. ') : message)
        this.name = 'ApiError'
        this.statusCode = statusCode
        this.details = message
    }
}

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    headers?: HeadersInit
    body?: unknown
    signal?: AbortSignal
    retried?: boolean
}

const isAuthPath = (path: string): boolean => path.startsWith('/auth/')

async function parseError(response: Response): Promise<ApiError> {
    let body: Partial<ApiErrorBody> = {}
    try {
        body = (await response.json()) as Partial<ApiErrorBody>
    } catch {
        // Corpo vazio ou não-JSON.
    }
    const message = body.message ?? (response.statusText || `Erro ${response.status}`)
    return new ApiError(response.status, message)
}

async function tryRefresh(): Promise<boolean> {
    try {
        const response = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        })
        return response.ok
    } catch {
        return false
    }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', headers, body, signal, retried = false } = options

    const mergedHeaders = new Headers(headers)
    if (body !== undefined && !mergedHeaders.has('Content-Type')) {
        mergedHeaders.set('Content-Type', 'application/json')
    }

    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: mergedHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        credentials: 'include',
        signal,
    })

    if (response.status === 401 && !retried && !isAuthPath(path)) {
        const refreshed = await tryRefresh()
        if (refreshed) {
            return request<T>(path, { ...options, retried: true })
        }
    }

    if (!response.ok) {
        throw await parseError(response)
    }

    if (response.status === 204) {
        return undefined as T
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
        return (await response.json()) as T
    }
    return (await response.text()) as unknown as T
}

async function requestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
    const { method = 'GET', headers, signal, retried = false } = options

    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        credentials: 'include',
        signal,
    })

    if (response.status === 401 && !retried && !isAuthPath(path)) {
        const refreshed = await tryRefresh()
        if (refreshed) {
            return requestBlob(path, { ...options, retried: true })
        }
    }

    if (!response.ok) {
        throw await parseError(response)
    }

    return response.blob()
}

export const http = {
    get: <T>(path: string, signal?: AbortSignal): Promise<T> =>
        request<T>(path, { signal }),

    post: <T>(path: string, body?: unknown): Promise<T> =>
        request<T>(path, { method: 'POST', body }),

    patch: <T>(path: string, body?: unknown): Promise<T> =>
        request<T>(path, { method: 'PATCH', body }),

    delete: <T>(path: string): Promise<T> =>
        request<T>(path, { method: 'DELETE' }),

    getBlob: (path: string, signal?: AbortSignal): Promise<Blob> =>
        requestBlob(path, { signal }),
}

export function buildQuery(params: Record<string, unknown> | undefined): string {
    if (!params) {
        return ''
    }
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') {
            continue
        }
        searchParams.set(key, String(value))
    }
    const query = searchParams.toString()
    return query ? `?${query}` : ''
}
