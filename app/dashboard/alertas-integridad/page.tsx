'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, AlertTriangle, CheckCircle2, ArrowRight, MapPin, Route, Clock } from 'lucide-react'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

interface InconsistenciaContinuidad {
  id: string
  legajo: string
  origen_declarado: string
  destino_esperado: string
  mensaje_id: string | null
  confirmado_por: string | null
  creado_at: string
}

interface InconsistenciaCierre {
  id: string
  order_number: string
  legajo: string
  destino_final: string
  base_chofer: string
  creado_at: string
}

const getToken = () => sessionStorage.getItem('admin_token')

export default function AlertasIntegridadPage() {
  const router = useRouter()
  const [continuidad, setContinuidad] = useState<InconsistenciaContinuidad[]>([])
  const [cierre, setCierre] = useState<InconsistenciaCierre[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const cargar = async () => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    const headers = { apikey: SB_KEY, Authorization: `Bearer ${token}` }

    try {
      const [resContinuidad, resCierre] = await Promise.all([
        fetch(
          `${SB_URL}/rest/v1/inconsistencias_continuidad?empresa_id=eq.cot&select=*&order=creado_at.desc&limit=100`,
          { headers }
        ),
        fetch(
          `${SB_URL}/rest/v1/inconsistencias_cierre?empresa_id=eq.cot&select=*&order=creado_at.desc&limit=100`,
          { headers }
        )
      ])
      setContinuidad((await resContinuidad.json()) || [])
      setCierre((await resCierre.json()) || [])
    } catch (error) {
      console.error('Error cargando inconsistencias:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }
    cargar()

    const interval = setInterval(cargar, 15000)
    return () => clearInterval(interval)
  }, [router])

  const formatearFecha = (fecha: string) => {
    if (!fecha) return '—'
    try {
      return new Date(fecha).toLocaleString('es-UY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return fecha
    }
  }

  const verJornada = (orderNumber: string) => {
    router.push(`/dashboard/jornadas?order_number=${encodeURIComponent(orderNumber)}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-[#64748b]">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Cargando inconsistencias...
        </div>
      </div>
    )
  }

  return (
    <div className={`
      space-y-6 transition-all duration-500
      ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
    `}>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">Continuidad al asignar</span>
            <Route className="w-4 h-4 text-[#f97316]" />
          </div>
          <div className="text-3xl font-bold text-[#f97316]">{continuidad.length}</div>
        </div>
        <div className="bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">Continuidad al cerrar</span>
            <MapPin className="w-4 h-4 text-[#f97316]" />
          </div>
          <div className="text-3xl font-bold text-[#f97316]">{cierre.length}</div>
        </div>
      </div>

      {/* Botón refrescar */}
      <div className="flex items-center justify-end">
        <button
          onClick={cargar}
          className="flex items-center gap-2 bg-[#1c2537] border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-[#94a3b8] hover:border-[#3b82f6]/50 hover:text-[#3b82f6] transition-all duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Sección: Continuidad al asignar */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Route className="w-5 h-5 text-[#f97316]" />
          Continuidad al asignar
        </h2>
        <div className="space-y-3">
          {continuidad.length === 0 ? (
            <div className="bg-[#111827]/40 backdrop-blur-sm border border-white/[0.06] rounded-xl p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-[#10b981] mx-auto mb-3" />
              <p className="text-[#94a3b8]">Sin inconsistencias registradas</p>
            </div>
          ) : (
            continuidad.map((c) => (
              <div
                key={c.id}
                className="bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] border-l-4 border-l-[#f97316] rounded-xl p-5 hover:border-[#f97316]/20 transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-[#f97316]" />
                  <span className="font-semibold text-white">Legajo {c.legajo || '—'}</span>
                  {c.confirmado_por && (
                    <span className="text-[11px] text-[#64748b] bg-[#1c2537] px-2 py-0.5 rounded-full">
                      confirmado por {c.confirmado_por}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-[#94a3b8]">
                    <MapPin className="w-3.5 h-3.5 text-[#475569]" />
                    <span className="text-[11px]">
                      Origen declarado: <span className="text-[#e2e8f0] font-mono">{c.origen_declarado}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#94a3b8]">
                    <Route className="w-3.5 h-3.5 text-[#475569]" />
                    <span className="text-[11px]">
                      Destino esperado: <span className="text-[#e2e8f0] font-mono">{c.destino_esperado}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#64748b] sm:col-span-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[11px]">{formatearFecha(c.creado_at)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sección: Continuidad al cerrar jornada */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#f97316]" />
          Continuidad al cerrar jornada
        </h2>
        <div className="space-y-3">
          {cierre.length === 0 ? (
            <div className="bg-[#111827]/40 backdrop-blur-sm border border-white/[0.06] rounded-xl p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-[#10b981] mx-auto mb-3" />
              <p className="text-[#94a3b8]">Sin inconsistencias registradas</p>
            </div>
          ) : (
            cierre.map((c) => (
              <div
                key={c.id}
                className="bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] border-l-4 border-l-[#f97316] rounded-xl p-5 hover:border-[#f97316]/20 transition-all duration-300"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-[#f97316]" />
                      <span className="font-semibold text-white">Legajo {c.legajo || '—'}</span>
                      <span className="text-[11px] text-[#64748b] font-mono bg-[#1c2537] px-2 py-0.5 rounded-full">
                        Orden {c.order_number}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-[#94a3b8]">
                        <MapPin className="w-3.5 h-3.5 text-[#475569]" />
                        <span className="text-[11px]">
                          Destino final: <span className="text-[#e2e8f0] font-mono">{c.destino_final}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[#94a3b8]">
                        <Route className="w-3.5 h-3.5 text-[#475569]" />
                        <span className="text-[11px]">
                          Base esperada: <span className="text-[#e2e8f0] font-mono">{c.base_chofer}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[#64748b] sm:col-span-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{formatearFecha(c.creado_at)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => verJornada(c.order_number)}
                    className="flex items-center gap-1.5 bg-[#1c2537] border border-[#1e293b] rounded-lg px-4 py-2 text-sm text-[#94a3b8] hover:border-[#3b82f6]/50 hover:text-[#3b82f6] transition-all duration-200 flex-shrink-0"
                  >
                    Ver jornada
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}