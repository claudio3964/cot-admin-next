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
      title: 'Choferes Registrados',
      value: stats.choferes,
      icon: Users,
      accent: 'text-blue-400',
      barColor: 'bg-blue-500',
      borderHover: 'hover:border-blue-500/40'
    },
    {
      title: 'Jornadas Hoy',
      value: stats.jornadasHoy,
      icon: CalendarDays,
      accent: 'text-emerald-400',
      barColor: 'bg-emerald-500',
      borderHover: 'hover:border-emerald-500/40'
    },
    {
      title: 'Alertas Pendientes',
      value: stats.alertasPendientes,
      icon: Bell,
      accent: 'text-amber-400',
      barColor: 'bg-amber-500',
      borderHover: 'hover:border-amber-500/40'
    },
    {
      title: 'Jornadas Totales',
      value: stats.jornadasTotal,
      icon: ClipboardList,
      accent: 'text-violet-400',
      barColor: 'bg-violet-500',
      borderHover: 'hover:border-violet-500/40'
    }
  ]

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header con tono editorial */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">
            Resumen <span className="font-normal text-slate-400 italic">General</span>
          </h1>
          <p className="text-sm text-slate-400">
            Monitoreo en tiempo real del estado actual de la flota y operaciones.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg w-fit">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>ESTADO: OPERATIVO</span>
        </div>
      </div>

   {/* KPI Cards con mayor contraste y foco visual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((card, i) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className={`
                group relative bg-[#12161f] border border-slate-800 
                rounded-xl p-5 transition-all duration-300 shadow-lg
                ${card.borderHover}
                ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
              style={{ transitionDelay: `${i * 75}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                {/* Título más claro y legible */}
                <span className="text-[11px] font-mono text-slate-300 uppercase tracking-wider font-semibold">
                  {card.title}
                </span>
                {/* Icono con acento de color distintivo */}
                <div className={`p-2 rounded-lg bg-slate-900/90 border border-slate-700/60 ${card.accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              
              {/* Valor numérico brillante y destacado */}
              <div className="text-3xl font-bold tracking-tight text-white mb-4 font-mono">
                {card.value}
              </div>

              {/* Barra de progreso con color temático */}
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${card.barColor} transition-all duration-1000 ease-out`}
                  style={{ width: mounted ? `${Math.min((card.value || 1) * 2 + 15, 100)}%` : '0%' }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Sección de Estadísticas / Próximamente con diseño estructurado */}
      <div className={`
        bg-[#12161f] border border-slate-800/80 rounded-xl p-8 md:p-12
        transition-all duration-500 delay-300
        ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}>
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-6">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-cyan-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-medium text-white mb-1">Métricas y Gráficos Avanzados</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Próximamente disponible: análisis histórico de rendimiento por chofer, trazabilidad de rutas y reportes de flota.
          </p>
        </div>
      </div>
    </div>
  )
}