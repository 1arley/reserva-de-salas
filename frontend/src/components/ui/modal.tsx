'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/utils/lib/tailwind-merge'
import { XIcon } from '@/components/core/icons'

interface ModalProps {
    open: boolean
    onClose: () => void
    title: string
    children: ReactNode
    className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null)
    const dialogRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        document.addEventListener('keydown', handleKey)
        document.body.style.overflow = 'hidden'

        const previouslyFocused = document.activeElement as HTMLElement | null
        const dialog = dialogRef.current
        const firstFocusable = dialog?.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )

        firstFocusable?.focus()

        const handleTab = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !dialog) return

            const focusable = dialog.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            )
            if (focusable.length === 0) {
                e.preventDefault()
                return
            }

            const first = focusable[0]
            const last = focusable[focusable.length - 1]

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last?.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first?.focus()
            }
        }

        document.addEventListener('keydown', handleTab)

        return () => {
            document.removeEventListener('keydown', handleKey)
            document.removeEventListener('keydown', handleTab)
            document.body.style.overflow = ''
            previouslyFocused?.focus()
        }
    }, [open, onClose])

    useEffect(() => {
        if (open) {
            const overlay = overlayRef.current
            const handleOverlayClick = (e: MouseEvent) => {
                if (e.target === overlay) onClose()
            }
            overlay?.addEventListener('click', handleOverlayClick)
            return () => {
                overlay?.removeEventListener('click', handleOverlayClick)
            }
        }
    }, [open, onClose])

    if (!open) return null

    return (
        <div
            ref={overlayRef}
            className='fixed inset-0 z-50 flex items-center justify-center p-4'
        >
            <div
                className='absolute inset-0 bg-slate-900/50'
                aria-hidden='true'
            />
            <div
                ref={dialogRef}
                className={cn(
                    'relative w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl',
                    className,
                )}
                role='dialog'
                aria-modal='true'
                aria-label={title}
            >
                <div className='flex items-center justify-between border-b border-slate-200 px-5 py-4'>
                    <h2 className='text-base font-semibold text-slate-900'>{title}</h2>
                    <button
                        type='button'
                        onClick={onClose}
                        className='rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600'
                        aria-label='Fechar'
                    >
                        <XIcon className='h-5 w-5' />
                    </button>
                </div>
                <div className='p-5'>{children}</div>
            </div>
        </div>
    )
}
