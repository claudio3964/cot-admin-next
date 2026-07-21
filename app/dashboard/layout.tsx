'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const tabs = [
  { id: 'dashboard', label: '📊 Dashboard', path: '/dashboard' },
  { id: 'choferes', label: '🚗 Choferes', path: '/dashboard/choferes' },
  { id: 'jornadas', label: '📋 Jornadas', path: '/dashboard/jornadas' },
  { id: 'alertas', label: '🔔 Alertas', path: '/dashboard/alertas' },
  { id: 'rotacion', label: '🔄 Rotación', path: '/dashboard/rotacion' },
  { id: 'flota', label: '🚌 Flota', path: '/dashboard/flota' },
  { id: 'estadisticas', label: '📈 Estadísticas', path: '/dashboard/estadisticas' },
  { id: 'mensajes', label: '💬 Mensajes', path: '/dashboard/mensajes' },
  { id: 'admins', label: '👤 Admins', path: '/dashboard/admins' }, 
  { id: 'configuracion', label: '⚙️ Configuración', path: '/dashboard/configuracion' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token')
    if (!token) {
      router.push('/login')
    }
    const email = sessionStorage.getItem('admin_email')
    setUserEmail(email || '')
  }, [router])

  const handleLogout = () => {
    sessionStorage.clear()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <div className="h-14 bg-[#111827] border-b border-[#1e2d45] flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="font-mono text-xs tracking-[2px] text-[#06b6d4] uppercase">DriverLog</div>
          <div className="w-px h-5 bg-[#1e2d45]"></div>
          <div className="text-sm font-medium text-[#cbd5e1]">Panel Admin — COT</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-[#cbd5e1]">{userEmail}</div>
          <button onClick={handleLogout} className="bg-transparent border border-[#1e2d45] rounded-md px-3.5 py-1.5 text-xs text-[#cbd5e1] hover:border-[#ef4444] hover:text-[#ef4444] transition">
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="flex gap-px px-6 pt-4 border-b border-[#1e2d45] bg-[#111827] overflow-x-auto">
        {tabs.map(tab => (
          <Link
            key={tab.id}
            href={tab.path}
            className={`px-4 py-2.5 text-xs font-medium transition rounded-t-lg ${
              pathname === tab.path
                ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]'
                : 'text-[#cbd5e1] hover:bg-[#1c2537]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  )
}