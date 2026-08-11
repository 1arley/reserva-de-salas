'use client'

import { useState, type ReactNode } from 'react'
import { AuthGuard } from './auth-guard'
import { Header } from './header'
import { Sidebar } from './sidebar'

export function DashboardLayout({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <AuthGuard>
            <div className='flex min-h-screen bg-slate-50'>
                <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className='flex min-w-0 flex-1 flex-col'>
                    <Header onMenuClick={() => setSidebarOpen(true)} />
                    <main className='flex-1 p-4 lg:p-6'>{children}</main>
                </div>
            </div>
        </AuthGuard>
    )
}
