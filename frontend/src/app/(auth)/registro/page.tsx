'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { getErrorMessage } from '@/utils/error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormError } from '@/components/core/form-error'

export default function RegisterPage() {
    const { register } = useAuth()
    const router = useRouter()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)

        if (password.length < 8) {
            setError('A senha deve ter pelo menos 8 caracteres.')
            return
        }
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.')
            return
        }

        setLoading(true)
        try {
            await register({ name, email, password })
            router.replace('/dashboard')
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader className='text-center'>
                <div className='mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-xl font-bold text-white'>
                    S
                </div>
                <CardTitle className='text-xl'>Criar conta</CardTitle>
                <CardDescription>
                    Cadastre-se para reservar salas de reunião
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <FormError message={error} />
                    <div className='space-y-1.5'>
                        <Label htmlFor='name'>Nome</Label>
                        <Input
                            id='name'
                            type='text'
                            autoComplete='name'
                            required
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder='Seu nome completo'
                        />
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='email'>E-mail</Label>
                        <Input
                            id='email'
                            type='email'
                            autoComplete='email'
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder='voce@exemplo.com'
                        />
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='password'>Senha</Label>
                        <Input
                            id='password'
                            type='password'
                            autoComplete='new-password'
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder='Mínimo 8 caracteres'
                        />
                    </div>
                    <div className='space-y-1.5'>
                        <Label htmlFor='confirmPassword'>Confirmar senha</Label>
                        <Input
                            id='confirmPassword'
                            type='password'
                            autoComplete='new-password'
                            required
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder='Repita a senha'
                        />
                    </div>
                    <Button type='submit' className='w-full' loading={loading}>
                        Cadastrar
                    </Button>
                </form>

                <p className='mt-6 text-center text-sm text-slate-500'>
                    Já tem conta?{' '}
                    <Link href='/login' className='font-medium text-green-600 hover:underline'>
                        Entrar
                    </Link>
                </p>
            </CardContent>
        </Card>
    )
}
