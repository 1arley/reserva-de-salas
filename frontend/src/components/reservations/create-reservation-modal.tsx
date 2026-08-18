'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { reservationsApi } from '@/services/reservations'
import { getErrorMessage } from '@/utils/error'
import { toDateTimeLocal } from '@/utils/date'
import type { Room } from '@/types/room'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/core/form-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { UsersIcon } from '@/components/core/icons'

interface CreateReservationModalProps {
    open: boolean
    onClose: () => void
    room: Room | null
    onSuccess?: () => void
}

export function CreateReservationModal({ open, onClose, room, onSuccess }: CreateReservationModalProps) {
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [notes, setNotes] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) {
            setStartTime('')
            setEndTime('')
            setNotes('')
            setError(null)
            setLoading(false)
        }
    }, [open])

    const minStart = useMemo(() => {
        const d = new Date()
        d.setMinutes(d.getMinutes() + 1)
        return toDateTimeLocal(d)
    }, [])

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        if (!room) return
        setError(null)

        if (!startTime || !endTime) {
            setError('Informe os horários da reserva.')
            return
        }
        if (new Date(endTime) <= new Date(startTime)) {
            setError('O horário final deve ser posterior ao horário inicial.')
            return
        }
        if (new Date(endTime).getTime() - new Date(startTime).getTime() > 24 * 60 * 60 * 1000) {
            setError('A reserva não pode exceder 24 horas.')
            return
        }

        setLoading(true)
        try {
            await reservationsApi.create({
                roomId: room.id,
                startTime: new Date(startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
                notes: notes.trim() || undefined,
            })
            onSuccess?.()
            onClose()
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={room ? `Reservar: ${room.name}` : 'Nova reserva'}
        >
            {room && (
                <div className='mb-4 flex items-center gap-2 text-sm text-slate-500'>
                    <UsersIcon className='h-4 w-4' />
                    Capacidade: {room.capacity} pessoas
                </div>
            )}
            <form onSubmit={handleSubmit} className='space-y-4'>
                <FormError message={error} />
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <div className='space-y-1.5'>
                        <Label htmlFor='startTime'>Início</Label>
                        <Input
                            id='startTime'
                            type='datetime-local'
                            required
                            min={minStart}
                            value={startTime}
                            onChange={(event) => setStartTime(event.target.value)}
                        />
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='endTime'>Fim</Label>
                        <Input
                            id='endTime'
                            type='datetime-local'
                            required
                            min={startTime || minStart}
                            value={endTime}
                            onChange={(event) => setEndTime(event.target.value)}
                        />
                    </div>
                </div>
                <div className='space-y-1.5'>
                    <Label htmlFor='notes'>Observações (opcional)</Label>
                    <Textarea
                        id='notes'
                        rows={3}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder='Motivo, pauta, participantes…'
                    />
                </div>
                <div className='flex justify-end gap-2 pt-2'>
                    <Button type='button' variant='outline' onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type='submit' loading={loading}>
                        Confirmar reserva
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
