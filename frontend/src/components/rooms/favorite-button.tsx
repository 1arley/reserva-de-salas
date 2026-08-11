'use client'

import { useState } from 'react'
import { favoritesApi } from '@/services/favorites'
import { cn } from '@/utils/lib/tailwind-merge'
import { StarIcon } from '@/components/core/icons'

interface FavoriteButtonProps {
    roomId: string
    initiallyFavorited?: boolean
    className?: string
    onToggle?: (favorited: boolean) => void
}

export function FavoriteButton({
    roomId,
    initiallyFavorited = false,
    className,
    onToggle,
}: FavoriteButtonProps) {
    const [favorited, setFavorited] = useState(initiallyFavorited)
    const [loading, setLoading] = useState(false)

    async function handleToggle() {
        if (loading) return
        setLoading(true)
        try {
            const { favorited: next } = await favoritesApi.toggle(roomId)
            setFavorited(next)
            onToggle?.(next)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            type='button'
            onClick={handleToggle}
            disabled={loading}
            className={cn(
                'rounded-md p-2 transition-colors',
                favorited
                    ? 'text-amber-500'
                    : 'text-slate-300 hover:text-amber-400',
                className,
            )}
            aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            title={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
            <StarIcon className={cn('h-5 w-5', favorited && 'fill-amber-400 text-amber-400')} />
        </button>
    )
}
