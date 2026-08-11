import { AlertIcon } from './icons'

export function FormError({ message }: { message: string | null }) {
    if (!message) {
        return null
    }
    return (
        <div
            className='flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'
            role='alert'
        >
            <AlertIcon className='mt-0.5 h-4 w-4 shrink-0' />
            <span>{message}</span>
        </div>
    )
}
