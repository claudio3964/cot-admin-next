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

// Vista public.inconsistencias_horario (migración 20261023010000, cadena del adelanto pieza 2).
interface InconsistenciaHorario {
  id: string
  tipo: 'ADELANTO_LINEA' | 'FIN_ANTERIOR_A_INICIO'
  order_number: string
  legajo: string
  fecha: string | null
  viaje_id: string
  origen: string | null
  destino: string | null
  tipo_servicio: string | null
  coche: string | null
  status: string | null
  programado_ms: number | null
  solicitado_ms: number | null
  servidor_en_ms: number | null
  minutos_adelanto: number | string | null
  inicio_real_ms: number | null
  fin_real_ms: number | null
  minutos_fin_antes: number | string | null
  ajuste: string | null
  motivo: string | null
  orden_transito: boolean
  ocurrido_ms: number | null
}

const TZ_UY = 'America/Montevideo'

// HH:mm (o HH:mm:ss) en hora de Montevideo; antepone dd/mm si el día no es el de la jornada.
const horaUy = (ms: number | null, conSegundos: boolean, fechaJornada: string | null) => {
  if (ms == null) return '—'
  const d = new Date(Number(ms))
  const hora = d.toLocaleTimeString('es-UY', {
    timeZone: TZ_UY,
    hour: '2-digit',
    minute: '2-digit',
    ...(conSegundos ? { second: '2-digit' as const } : {}),
    hour12: false
  })
  const dia = d.toLocaleDateString('en-CA', { timeZone: TZ_UY }) // YYYY-MM-DD
  if (fechaJornada && dia !== fechaJornada) {
    const [, mes, dd] = dia.split('-')
    return `${dd}/${mes} ${hora}`
  }
  return hora
}

const fechaJornadaUy = (fecha: string | null) => {
  if (!fecha) return '—'
  const [anio, mes, dd] = fecha.split('-')
  return `${dd}/${mes}/${anio}`
}

const minutosUy = (m: number | string | null) =>
  m == null ? '—' : Number(m).toLocaleString('es-UY', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// El panel guarda el semidirecto como SEMI; la app, como SEMIDIRECTO. Se muestra igual que la app.
const tipoServicioUy = (t: string | null) => (t?.toUpperCase() === 'SEMI' ? 'SEMIDIRECTO' : t || '—')

const ESTADO_VIAJE: Record<string, { texto: string; clase: string }> = {
  cancelado: { texto: 'cancelado', clase: 'text-[#94a3b8] bg-[#1c2537]' },
  en_curso: { texto: 'en curso', clase: 'text-[#60a5fa] bg-[#3b82f6]/10' },
  programado: { texto: 'programado', clase: 'text-[#94a3b8] bg-[#1c2537]' }
}

const getToken = () => sessionStorage.getItem('admin_token')

export default function AlertasIntegridadPage() {
  const router = useRouter()
  const [continuidad, setContinuidad] = useState<InconsistenciaContinuidad[]>([])
  const [cierre, setCierre] = useState<InconsistenciaCierre[]>([])
  const [horario, setHorario] = useState<InconsistenciaHorario[]>([])
  const [errorHorario, setErrorHorario] = useState(false)
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
      const [resHorario, resContinuidad, resCierre] = await Promise.all([
        fetch(
          `${SB_URL}/rest/v1/inconsistencias_horario?empresa_id=eq.cot&select=*&order=ocurrido_ms.desc&limit=100`,
          { headers }
        ),
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

      // Si la vista falla, solo esta sección muestra el error; las otras dos siguen.
      const dataHorario = resHorario.ok ? await resHorario.json() : null
      if (Array.isArray(dataHorario)) {
        setHorario(dataHorario)
        setErrorHorario(false)
      } else {
        console.error('Error cargando inconsistencias_horario:', resHorario.status, dataHorario)
        setHorario([])
        setErrorHorario(true)
      }
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
      ${mounted ? 'opacity-100 translate-none' : 'opacity-0 translate-y-4'}
    `}>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">Horario</span>
            <Clock className="w-4 h-4 text-[#ef4444]" />
          </div>
          <div className="text-3xl font-bold text-[#ef4444]">{errorHorario ? '—' : horario.length}</div>
          <div className="text-[11px] text-[#64748b] mt-1">
            {`${horario.filter((h) => h.tipo === 'ADELANTO_LINEA').length} adelantos · ${horario.filter((h) => h.tipo === 'FIN_ANTERIOR_A_INICIO').length} fin < inicio`}
          </div>
        </div>
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

      {/* Sección: Horario (adelanto en línea y fin anterior al inicio) */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#ef4444]" />
          Horario: adelanto y fin anterior al inicio
        </h2>
        <div className="space-y-3">
          {errorHorario ? (
            <div className="bg-[#111827]/40 backdrop-blur-sm border border-white/[0.06] rounded-xl p-8 text-center">
              <p className="text-[#94a3b8]">No se pudo cargar esta sección. Las demás no se ven afectadas.</p>
            </div>
          ) : horario.length === 0 ? (
            <div className="bg-[#111827]/40 backdrop-blur-sm border border-white/[0.06] rounded-xl p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-[#10b981] mx-auto mb-3" />
              <p className="text-[#94a3b8]">Sin inconsistencias registradas</p>
            </div>
          ) : (
            horario.map((h) => {
              const esAdelanto = h.tipo === 'ADELANTO_LINEA'
              const color = esAdelanto ? '#f97316' : '#ef4444'
              const estado = h.status && h.status !== 'finalizado'
                ? ESTADO_VIAJE[h.status] ?? { texto: h.status, clase: 'text-[#94a3b8] bg-[#1c2537]' }
                : null
              const detalleOrden = h.orden_transito && h.motivo
                ? h.motivo.replace(/^Orden de tránsito:?\s*/i, '')
                : ''
              return (
                <div
                  key={h.id}
                  className="bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] border-l-4 rounded-xl p-5 transition-all duration-300"
                  style={{ borderLeftColor: color }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4" style={{ color }} />
                        <span className="font-semibold text-white">Legajo {h.legajo || '—'}</span>
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ color, backgroundColor: `${color}1a` }}
                        >
                          {esAdelanto ? 'Adelanto en línea' : 'Fin antes del inicio'}
                        </span>
                        <span className="text-[11px] text-[#64748b] font-mono bg-[#1c2537] px-2 py-0.5 rounded-full">
                          Orden {h.order_number}
                        </span>
                        <span className="text-[11px] text-[#94a3b8] bg-[#1c2537] px-2 py-0.5 rounded-full">
                          {tipoServicioUy(h.tipo_servicio)}
                        </span>
                        {estado && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${estado.clase}`}>
                            {estado.texto}
                          </span>
                        )}
                      </div>

                      {esAdelanto ? (
                        <div className="space-y-1.5 text-[12px] text-[#94a3b8]">
                          <div className="flex flex-wrap items-center gap-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#475569]" />
                            <span>Programado <span className="text-[#e2e8f0] font-mono">{horaUy(h.programado_ms, false, h.fecha)}</span></span>
                            <span>·</span>
                            <span>
                              Toque <span className="text-[#e2e8f0] font-mono">{horaUy(h.solicitado_ms, true, h.fecha)}</span>{' '}
                              <span className="text-[#f97316] font-semibold">(−{minutosUy(h.minutos_adelanto)} min)</span>
                            </span>
                            {h.servidor_en_ms != null && (
                              <>
                                <span>·</span>
                                <span>Servidor <span className="text-[#e2e8f0] font-mono">{horaUy(h.servidor_en_ms, true, h.fecha)}</span></span>
                              </>
                            )}
                            <span>·</span>
                            <span>Registrado <span className="text-[#e2e8f0] font-mono">{horaUy(h.inicio_real_ms, false, h.fecha)}</span></span>
                            {h.ajuste === 'ADELANTO_MAYOR_AL_LIMITE' && (
                              <span className="text-[#64748b]">(registrado con la hora programada: más de 10 min de adelanto)</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {h.orden_transito ? (
                              <>
                                <span className="text-[11px] font-semibold text-[#60a5fa] bg-[#3b82f6]/10 px-2 py-0.5 rounded-full">
                                  Orden de tránsito
                                </span>
                                {detalleOrden && <span className="text-[#e2e8f0]">{detalleOrden}</span>}
                              </>
                            ) : h.motivo ? (
                              <span>Motivo: <span className="text-[#e2e8f0]">{h.motivo}</span></span>
                            ) : (
                              <span className="text-[#64748b] italic">Sin motivo</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-[#94a3b8]">
                          <Clock className="w-3.5 h-3.5 text-[#475569]" />
                          <span>Inicio <span className="text-[#e2e8f0] font-mono">{horaUy(h.inicio_real_ms, false, h.fecha)}</span></span>
                          <span>·</span>
                          <span>
                            Fin <span className="text-[#e2e8f0] font-mono">{horaUy(h.fin_real_ms, true, h.fecha)}</span>{' '}
                            <span className="text-[#ef4444] font-semibold">({minutosUy(h.minutos_fin_antes)} min antes del inicio)</span>
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-1.5 mt-2 text-[11px] text-[#64748b]">
                        <span className="font-mono">{h.viaje_id}</span>
                        <span>·</span>
                        <span>{h.origen || '—'} → {h.destino || '—'}</span>
                        {h.coche && (
                          <>
                            <span>·</span>
                            <span>Coche {h.coche}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>Jornada {fechaJornadaUy(h.fecha)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => verJornada(h.order_number)}
                      className="flex items-center gap-1.5 bg-[#1c2537] border border-[#1e293b] rounded-lg px-4 py-2 text-sm text-[#94a3b8] hover:border-[#3b82f6]/50 hover:text-[#3b82f6] transition-all duration-200 flex-shrink-0"
                    >
                      Ver jornada
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
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