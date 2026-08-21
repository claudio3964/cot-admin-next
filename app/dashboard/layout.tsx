'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Bell,
  AlertTriangle,
  RefreshCw,
  Bus,
  BarChart3,
  MessageSquare,
  Shield,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react'
import { useSessionGuard } from './useSessionGuard'

const tabs = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'choferes', label: 'Choferes', path: '/dashboard/choferes', icon: Users },
  { id: 'jornadas', label: 'Jornadas', path: '/dashboard/jornadas', icon: CalendarDays },
  { id: 'alertas', label: 'Alertas', path: '/dashboard/alertas', icon: Bell },
  { id: 'alertas-integridad', label: 'Inconsistencias', path: '/dashboard/alertas-integridad', icon: AlertTriangle },
  { id: 'rotacion', label: 'Rotación', path: '/dashboard/rotacion', icon: RefreshCw },
  { id: 'flota', label: 'Flota', path: '/dashboard/flota', icon: Bus },
  { id: 'estadisticas', label: 'Estadísticas', path: '/dashboard/estadisticas', icon: BarChart3 },
  { id: 'mensajes', label: 'Mensajes', path: '/dashboard/mensajes', icon: MessageSquare },
  { id: 'admins', label: 'Admins', path: '/dashboard/admins', icon: Shield },
  { id: 'configuracion', label: 'Configuración', path: '/dashboard/configuracion', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  useSessionGuard()

  useEffect(() => {
    setMounted(true)
    const email = sessionStorage.getItem('admin_email')
    setUserEmail(email || '')
  }, [])

  const handleLogout = () => {
    sessionStorage.clear()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* ═══════════════════════════════════════
          NAVBAR STICKY CON GLASSMORPHISM
          ═══════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-6 h-14 flex items-center justify-between">
          {/* Izquierda: Brand */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#06b6d4] animate-pulse" />
              <span className="font-mono text-[11px] tracking-[3px] text-[#06b6d4] uppercase font-semibold">
                DriverLog
              </span>
            </div>
            <div className="w-px h-4 bg-[#1e293b]" />
            <span className="text-sm text-[#94a3b8]">
              Panel Admin — <span className="text-white font-medium">COT</span>
            </span>
          </div>

          {/* Derecha: Usuario + Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] flex items-center justify-center text-xs font-bold text-white">
                {userEmail.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="hidden sm:inline">{userEmail}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#94a3b8] hover:text-white border border-[#1e293b] hover:border-[#ef4444]/50 rounded-lg hover:bg-[#ef4444]/10 transition-all duration-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            TABS HORIZONTALES
            ═══════════════════════════════════════ */}
        <div className="px-6 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path
            const Icon = tab.icon
            return (
              <Link
                key={tab.id}
                href={tab.path}
                className={`
                  flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap
                  border-b-2 transition-all duration-200 relative
                  ${isActive
                    ? 'border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/5'
                    : 'border-transparent text-[#64748b] hover:text-[#94a3b8] hover:bg-white/[0.02]'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* CONTENIDO */}
      <main className={`
        p-6 max-w-7xl mx-auto transition-all duration-500
        ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}>
        {children}
      </main>
    </div>
  )
}