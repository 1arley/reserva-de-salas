'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { roomsApi } from '@/services/rooms'
import { getErrorMessage } from '@/utils/error'
import { ROOM_STATUS_LABEL, type Room, type RoomStatus, type CreateRoomInput } from '@/types/room'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/core/form-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface RoomFormModalProps {
    open: boolean
    onClose: () => void
    room: Room | null
    onSuccess?: () => void
}

export function RoomFormModal({ open, onClose, room, onSuccess }: RoomFormModalProps) {
    const [name, setName] = useState('')
    const [capacity, setCapacity] = useState('')
    const [description, setDescription] = useState('')
    const [resources, setResources] = useState('')
    const [status, setStatus] = useState<RoomStatus>('AVAILABLE')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const isEditing = room !== null

    useEffect(() => {
        if (open) {
            setName(room?.name ?? '')
            setCapacity(room ? String(room.capacity) : '')
            setDescription(room?.description ?? '')
            setResources(room?.resources?.join(', ') ?? '')
            setStatus(room?.status ?? 'AVAILABLE')
            setError(null)
            setLoading(false)
        }
    }, [open, room])

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)

        const capacityNumber = Number(capacity)
        if (!name.trim()) {
            setError('Informe o nome da sala.')
            return
        }
        if (!Number.isInteger(capacityNumber) || capacityNumber < 1) {
            setError('A capacidade deve ser um número inteiro maior ou igual a 1.')
            return
        }

        const input: CreateRoomInput = {
            name: name.trim(),
            capacity: capacityNumber,
            description: description.trim() || undefined,
            resources: resources
                .split(',')
                .map((resource) => resource.trim())
                .filter(Boolean),
            status,
        }

        setLoading(true)
        try {
            if (isEditing && room) {
                await roomsApi.update(room.id, input)
            } else {
                await roomsApi.create(input)
            }
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
            title={isEditing ? `Editar: ${room?.name}` : 'Nova sala'}
        >
            <form onSubmit={handleSubmit} className='space-y-4'>
                <FormError message={error} />
                <div className='space-y-1.5'>
                    <Label htmlFor='room-name'>Nome</Label>
                    <Input
                        id='room-name'
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder='Sala de Reunião A'
                        required
                        minLength={2}
                    />
                </div>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <div className='space-y-1.5'>
                        <Label htmlFor='room-capacity'>Capacidade</Label>
                        <Input
                            id='room-capacity'
                            type='number'
                            min={1}
                            step={1}
                            value={capacity}
                            onChange={(event) => setCapacity(event.target.value)}
                            placeholder='10'
                            required
                        />
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='room-status'>Status</Label>
                        <Select
                            id='room-status'
                            value={status}
                            onChange={(event) => setStatus(event.target.value as RoomStatus)}
                        >
                            {(
                                Object.entries(ROOM_STATUS_LABEL) as [RoomStatus, string][]
                            ).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>
                <div className='space-y-1.5'>
                    <Label htmlFor='room-description'>Descrição</Label>
                    <Textarea
                        id='room-description'
                        rows={2}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder='Sala com projetor e lousa'
                    />
                </div>
                <div className='space-y-1.5'>
                    <Label htmlFor='room-resources'>Recursos (separados por vírgula)</Label>
                    <Input
                        id='room-resources'
                        value={resources}
                        onChange={(event) => setResources(event.target.value)}
                        placeholder='projetor, lousa, videoconferência'
                    />
                </div>
                <div className='flex justify-end gap-2 pt-2'>
                    <Button type='button' variant='outline' onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type='submit' loading={loading}>
                        {isEditing ? 'Salvar alterações' : 'Criar sala'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}