'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, CalendarDays, Bell, ClipboardList, BarChart3 } from 'lucide-react'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    choferes: 0,
    jornadasHoy: 0,
    alertasPendientes: 0,
    jornadasTotal: 0
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = sessionStorage.getItem('admin_token')
    if (!token) {
      router.push('/login')
      return
    }

    const fetchData = async () => {
      const headers = { apikey: SB_KEY, Authorization: `Bearer ${token}` }

      try {
        const [choferesRes, jornadasRes, alertasRes] = await Promise.all([
          fetch(`${SB_URL}/rest/v1/choferes?empresa_id=eq.cot&select=id`, { headers }),
          fetch(`${SB_URL}/rest/v1/jornadas?empresa_id=eq.cot&select=id,data`, { headers }),
          fetch(`${SB_URL}/rest/v1/registro_alertas?select=id,resuelto`, { headers })
        ])

        const choferes = await choferesRes.json()
        const jornadasRaw = await jornadasRes.json()
        const alertas = await alertasRes.json()

        const jornadas = (jornadasRaw || []).filter((j: any) => {
          try {
            const data = typeof j.data === 'string' ? JSON.parse(j.data) : j.data
            return !data?.deleted
          } catch { return true }
        })

        const hoy = new Date().toISOString().split('T')[0]
        const jornadasHoy = jornadas.filter((j: any) => {
          try {
            const data = typeof j.data === 'string' ? JSON.parse(j.data) : j.data
            return data?.date === hoy
          } catch { return false }
        }).length

        setStats({
          choferes: choferes?.length || 0,
          jornadasHoy,
          alertasPendientes: (alertas || []).filter((a: any) => !a.resuelto).length,
          jornadasTotal: jornadas.length
        })
      } catch (error) {
        console.error('Error:', error)
      }
    }

    fetchData()
  }, [router])

  const kpiCards = [
    {
      title: 'CHOFERES REGISTRADOS',
      value: stats.choferes,
      icon: Users,
      gradient: 'from-[#3b82f6] to-[#2563eb]',
      shadow: 'shadow-[#3b82f6]/20'
    },
    {
      title: 'JORNADAS HOY',
      value: stats.jornadasHoy,
      icon: CalendarDays,
      gradient: 'from-[#10b981] to-[#059669]',
      shadow: 'shadow-[#10b981]/20'
    },
    {
      title: 'ALERTAS PENDIENTES',
      value: stats.alertasPendientes,
      icon: Bell,
      gradient: 'from-[#f59e0b] to-[#d97706]',
      shadow: 'shadow-[#f59e0b]/20'
    },
    {
      title: 'JORNADAS TOTALES',
      value: stats.jornadasTotal,
      icon: ClipboardList,
      gradient: 'from-[#8b5cf6] to-[#7c3aed]',
      shadow: 'shadow-[#8b5cf6]/20'
    }
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-1">Resumen General</h2>
        <p className="text-sm text-[#64748b]">Vista rápida del estado actual de la flota</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((card, i) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className={`
                group relative bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] 
                rounded-xl p-5 hover:border-white/10 transition-all duration-500 
                hover:-translate-y-1 hover:shadow-xl ${card.shadow}
                ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
              `}
              style={{ transitionDelay: `${i * 100 + 100}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient} bg-opacity-10`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-mono text-[#475569] uppercase tracking-wider">
                  {card.title}
                </span>
              </div>
              <div className={`text-3xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                {card.value}
              </div>
              <div className="mt-3 h-1 w-full bg-[#1e293b] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${card.gradient} transition-all duration-1000 ease-out`}
                  style={{ width: mounted ? `${Math.min(card.value * 2 + 20, 100)}%` : '0%' }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Placeholder para gráficos futuros */}
      <div className={`
        bg-[#111827]/40 backdrop-blur-sm border border-white/[0.06] rounded-xl p-8
        transition-all duration-700 delay-500
        ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
      `}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1e293b] flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-[#3b82f6]" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Estadísticas detalladas</h3>
          <p className="text-sm text-[#64748b] max-w-md">
            Próximamente: gráficos de jornadas por chofer, alertas históricas y métricas de flota.
          </p>
        </div>
      </div>
    </div>
  )
}