'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

// Función para actualizar el badge de alertas en el tab
const actualizarBadgeAlertas = (pendientes: number) => {
  // Buscar el tab de Alertas en el layout
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
      
      // Actualizar badge en el tab
      const alertasData = Array.isArray(data) ? data : []
const pendientes = alertasData.filter((a: Alerta) => !a.resuelto).length
      actualizarBadgeAlertas(pendientes)
      
      // También actualizar el dashboard si está visible
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
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }
    cargarAlertas()

    // Polling cada 15 segundos
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

      // 1. Si autorizamos, actualizar el device_id del chofer
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

      // 2. Marcar alerta como resuelta
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

      // 3. Recargar lista
      await cargarAlertas()
      
      // 4. Mostrar mensaje
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

  if (loading) {
    return (
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-8 text-center">
        <div className="text-[#cbd5e1]">Cargando alertas...</div>
      </div>
    )
  }

  const alertasArray = Array.isArray(alertas) ? alertas : []
const pendientes = alertasArray.filter(a => !a.resuelto)
const resueltas = alertasArray.filter(a => a.resuelto)

  return (
    <div>
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
          <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">Pendientes</div>
          <div className="text-2xl font-mono font-bold text-yellow-400">{pendientes.length}</div>
        </div>
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
          <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">Resueltas</div>
          <div className="text-2xl font-mono font-bold text-green-400">{resueltas.length}</div>
        </div>
      </div>

      {/* Header con botón refrescar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Alertas de dispositivos duplicados</h2>
        <button
          onClick={cargarAlertas}
          className="bg-transparent border border-[#1e2d45] rounded-lg px-4 py-2 text-sm text-[#cbd5e1] hover:border-[#3b82f6] hover:text-[#3b82f6] transition"
        >
          ↺ Actualizar
        </button>
      </div>

      {/* Lista de alertas */}
      <div className="space-y-3">
        {alertas.length === 0 ? (
          <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-8 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-[#cbd5e1]">Sin alertas registradas</p>
          </div>
        ) : (
          alertas.map((alerta) => {
            const esPendiente = !alerta.resuelto
            const esAutorizado = alerta.resolucion === 'autorizado'
            
            return (
              <div
                key={alerta.id}
                className={`bg-[#111827] border rounded-xl p-4 transition ${
                  esPendiente
                    ? 'border-yellow-500/30 border-l-4 border-l-yellow-500'
                    : esAutorizado
                    ? 'border-green-500/20 opacity-60'
                    : 'border-red-500/20 opacity-60'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-white">
                        {esPendiente ? '⚠️' : esAutorizado ? '✅' : '✕'} {alerta.nombre || 'Sin nombre'}
                      </span>
                      <span className="text-xs text-[#cbd5e1] font-mono">Legajo {alerta.legajo || '—'}</span>
                      {!esPendiente && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          esAutorizado ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {esAutorizado ? 'Autorizado' : 'Rechazado'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[#cbd5e1] font-mono space-y-0.5">
                      <div>Device actual: <span className="text-[#e2e8f0]">{alerta.device_id_actual || '—'}</span></div>
                      <div>Device nuevo: <span className="text-[#e2e8f0]">{alerta.device_id_nuevo || '—'}</span></div>
                      <div className="text-xs text-[#94a3b8]">{formatearFecha(alerta.intentado_at)}</div>
                    </div>
                  </div>

                  {esPendiente && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => resolverAlerta(alerta.id, true)}
                        disabled={procesando === alerta.id}
                        className="bg-green-500/20 border border-green-500/30 text-green-400 rounded-md px-4 py-2 text-sm font-medium hover:bg-green-500/30 transition disabled:opacity-50"
                      >
                        {procesando === alerta.id ? '...' : '✓ Autorizar'}
                      </button>
                      <button
                        onClick={() => resolverAlerta(alerta.id, false)}
                        disabled={procesando === alerta.id}
                        className="bg-red-500/20 border border-red-500/30 text-red-400 rounded-md px-4 py-2 text-sm font-medium hover:bg-red-500/30 transition disabled:opacity-50"
                      >
                        {procesando === alerta.id ? '...' : '✕ Rechazar'}
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