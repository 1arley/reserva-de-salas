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

const DEMO_ACCOUNTS = [
    { label: 'Usuário', email: 'user@example.com', password: 'User123!' },
    { label: 'Administrador', email: 'admin@example.com', password: 'Admin123!' },
]

export default function LoginPage() {
    const { login } = useAuth()
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setError(null)
        setLoading(true)
        try {
            await login({ email, password })
            router.replace('/dashboard')
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    function fillDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
        setEmail(account.email)
        setPassword(account.password)
        setError(null)
    }

    return (
        <Card>
            <CardHeader className='text-center'>
                <div className='mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-xl font-bold text-white'>
                    S
                </div>
                <CardTitle className='text-xl'>Entrar</CardTitle>
                <CardDescription>
                    Acesse o sistema de reserva de salas
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <FormError message={error} />
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
                            autoComplete='current-password'
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder='••••••••'
                        />
                    </div>
                    <Button type='submit' className='w-full' loading={loading}>
                        Entrar
                    </Button>
                </form>

                <div className='mt-6'>
                    <p className='mb-2 text-center text-xs uppercase tracking-wide text-slate-400'>
                        Contas de demonstração
                    </p>
                    <div className='grid grid-cols-2 gap-2'>
                        {DEMO_ACCOUNTS.map((account) => (
                            <button
                                key={account.email}
                                type='button'
                                onClick={() => fillDemo(account)}
                                className='rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-600 transition-colors hover:border-green-500 hover:bg-green-50'
                            >
                                <span className='block font-medium text-slate-800'>
                                    {account.label}
                                </span>
                                {account.email}
                            </button>
                        ))}
                    </div>
                </div>

                <p className='mt-6 text-center text-sm text-slate-500'>
                    Ainda não tem conta?{' '}
                    <Link href='/registro' className='font-medium text-green-600 hover:underline'>
                        Cadastre-se
                    </Link>
                </p>
            </CardContent>
        </Card>
    )
}
