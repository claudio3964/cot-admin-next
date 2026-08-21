'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Smartphone, Clock } from 'lucide-react'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

interface Alerta {
  id: string
  legajo: string
  nombre: string
  device_id_actual: string
  device_id_nuevo: string
  intentado_at: string
  resuelto: boolean
  resolucion?: string
  empresa_id: string
}

const getToken = () => sessionStorage.getItem('admin_token')

const actualizarBadgeAlertas = (pendientes: number) => {
  const tabs = document.querySelectorAll('a[href="/dashboard/alertas"]')
  tabs.forEach((tab) => {
    const parent = tab as HTMLElement
    let badge = parent.querySelector('.tab-badge') as HTMLElement | null
    if (pendientes > 0) {
      if (!badge) {
        badge = document.createElement('span')
        badge.className = 'tab-badge'
        parent.appendChild(badge)
      }
      badge.textContent = String(pendientes)
      badge.style.display = 'inline'
    } else {
      if (badge) badge.style.display = 'none'
    }
  })
}

export default function AlertasPage() {
  const router = useRouter()
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const cargarAlertas = async () => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    setLoading(true)
    const headers = { apikey: SB_KEY, Authorization: `Bearer ${token}` }

    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/registro_alertas?empresa_id=eq.cot&select=*&order=intentado_at.desc&limit=100`,
        { headers }
      )
      const data = await res.json()
      setAlertas(data || [])
      
      const alertasData = Array.isArray(data) ? data : []
      const pendientes = alertasData.filter((a: Alerta) => !a.resuelto).length
      actualizarBadgeAlertas(pendientes)
      
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('alertasActualizadas', { detail: { pendientes } }))
      }
    } catch (error) {
      console.error('Error cargando alertas:', error)
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
    cargarAlertas()

    const interval = setInterval(cargarAlertas, 15000)
    return () => clearInterval(interval)
  }, [router])

  const resolverAlerta = async (id: string, autorizar: boolean) => {
    const token = getToken()
    if (!token) return

    setProcesando(id)

    try {
      const headers = {
        apikey: SB_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }

      if (autorizar) {
        const alerta = alertas.find(a => a.id === id)
        if (alerta) {
          await fetch(
            `${SB_URL}/rest/v1/choferes?empresa_id=eq.cot&legajo=eq.${alerta.legajo}`,
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ device_id: alerta.device_id_nuevo })
            }
          )
        }
      }

      await fetch(
        `${SB_URL}/rest/v1/registro_alertas?id=eq.${id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            resuelto: true,
            resolucion: autorizar ? 'autorizado' : 'rechazado'
          })
        }
      )

      await cargarAlertas()
      alert(autorizar ? '✅ Dispositivo autorizado' : '✕ Solicitud rechazada')
    } catch (error) {
      console.error('Error resolviendo alerta:', error)
      alert('❌ Error al procesar la solicitud')
    } finally {
      setProcesando(null)
    }
  }

  const formatearFecha = (fecha: string) => {
    if (!fecha) return '—'
    try {
      return new Date(fecha).toLocaleString('es-UY', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    } catch { return fecha }
  }

  const alertasArray = Array.isArray(alertas) ? alertas : []
  const pendientes = alertasArray.filter(a => !a.resuelto)
  const resueltas = alertasArray.filter(a => a.resuelto)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-[#64748b]">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Cargando alertas...
        </div>
      </div>
    )
  }

  return (
    <div className={`
      space-y-6 transition-all duration-500
      ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
    `}>
      {/* KPIs de alertas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">Pendientes</span>
            <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div className="text-3xl font-bold text-[#f59e0b]">{pendientes.length}</div>
        </div>
        <div className="bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">Resueltas</span>
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
          </div>
          <div className="text-3xl font-bold text-[#10b981]">{resueltas.length}</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Alertas de dispositivos duplicados</h2>
        <button
          onClick={cargarAlertas}
          className="flex items-center gap-2 bg-[#1c2537] border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-[#94a3b8] hover:border-[#3b82f6]/50 hover:text-[#3b82f6] transition-all duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {alertas.length === 0 ? (
          <div className="bg-[#111827]/40 backdrop-blur-sm border border-white/[0.06] rounded-xl p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-[#10b981] mx-auto mb-3" />
            <p className="text-[#94a3b8]">Sin alertas registradas</p>
          </div>
        ) : (
          alertas.map((alerta) => {
            const esPendiente = !alerta.resuelto
            const esAutorizado = alerta.resolucion === 'autorizado'

            return (
              <div
                key={alerta.id}
                className={`
                  bg-[#111827]/60 backdrop-blur-sm border rounded-xl p-5 transition-all duration-300
                  ${esPendiente
                    ? 'border-l-4 border-l-[#f59e0b] border-white/[0.06] hover:border-[#f59e0b]/30'
                    : esAutorizado
                      ? 'border-white/[0.03] opacity-60'
                      : 'border-white/[0.03] opacity-60'
                  }
                `}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      {esPendiente ? (
                        <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
                      ) : esAutorizado ? (
                        <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#ef4444]" />
                      )}
                      <span className="font-semibold text-white">{alerta.nombre || 'Sin nombre'}</span>
                      <span className="text-[11px] text-[#64748b] font-mono">Legajo {alerta.legajo || '—'}</span>
                      {!esPendiente && (
                        <span className={`
                          text-[10px] px-2 py-0.5 rounded-full border
                          ${esAutorizado 
                            ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20' 
                            : 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20'
                          }
                        `}>
                          {esAutorizado ? 'Autorizado' : 'Rechazado'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-[#94a3b8]">
                        <Smartphone className="w-3.5 h-3.5 text-[#475569]" />
                        <span className="font-mono text-[11px]">
                          Actual: <span className="text-[#e2e8f0]">{alerta.device_id_actual?.substring(0, 20) || '—'}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[#94a3b8]">
                        <Smartphone className="w-3.5 h-3.5 text-[#475569]" />
                        <span className="font-mono text-[11px]">
                          Nuevo: <span className="text-[#e2e8f0]">{alerta.device_id_nuevo?.substring(0, 20) || '—'}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[#64748b] sm:col-span-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{formatearFecha(alerta.intentado_at)}</span>
                      </div>
                    </div>
                  </div>

                  {esPendiente && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => resolverAlerta(alerta.id, true)}
                        disabled={procesando === alerta.id}
                        className="flex items-center gap-1.5 bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#10b981]/20 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {procesando === alerta.id ? '...' : 'Autorizar'}
                      </button>
                      <button
                        onClick={() => resolverAlerta(alerta.id, false)}
                        disabled={procesando === alerta.id}
                        className="flex items-center gap-1.5 bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#ef4444]/20 transition disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        {procesando === alerta.id ? '...' : 'Rechazar'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}