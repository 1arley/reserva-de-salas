import { ApiError } from '@/services/http'

export function getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        if (Array.isArray(error.details)) {
            return error.details.join('. ')
        }
        return error.message
    }
    if (error instanceof Error) {
        return error.message
    }
    return 'Ocorreu um erro inesperado. Tente novamente.'
}
