'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-8 text-center">
        <div className="text-[#cbd5e1]">Cargando inconsistencias...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
          <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">Continuidad al asignar</div>
          <div className="text-2xl font-mono font-bold text-orange-400">{continuidad.length}</div>
        </div>
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
          <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">Continuidad al cerrar</div>
          <div className="text-2xl font-mono font-bold text-orange-400">{cierre.length}</div>
        </div>
      </div>

      <div className="flex items-center justify-end mb-4">
        <button
          onClick={cargar}
          className="bg-transparent border border-[#1e2d45] rounded-lg px-4 py-2 text-sm text-[#cbd5e1] hover:border-[#3b82f6] hover:text-[#3b82f6] transition"
        >
          ↺ Actualizar
        </button>
      </div>

      {/* Sección: continuidad al asignar (paso 4) */}
      <h2 className="text-sm font-semibold text-white mb-3">Continuidad al asignar</h2>
      <div className="space-y-3 mb-8">
        {continuidad.length === 0 ? (
          <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-8 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-[#cbd5e1]">Sin inconsistencias registradas</p>
          </div>
        ) : (
          continuidad.map((c) => (
            <div
              key={c.id}
              className="bg-[#111827] border border-orange-500/30 border-l-4 border-l-orange-500 rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="font-semibold text-white">⚠️ Legajo {c.legajo || '—'}</span>
                {c.confirmado_por && (
                  <span className="text-xs text-[#94a3b8]">confirmado por {c.confirmado_por}</span>
                )}
              </div>
              <div className="text-sm text-[#cbd5e1] font-mono space-y-0.5">
                <div>Origen declarado: <span className="text-[#e2e8f0]">{c.origen_declarado}</span></div>
                <div>Destino esperado: <span className="text-[#e2e8f0]">{c.destino_esperado}</span></div>
                <div className="text-xs text-[#94a3b8]">{formatearFecha(c.creado_at)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sección: continuidad al cerrar jornada (paso 5) */}
      <h2 className="text-sm font-semibold text-white mb-3">Continuidad al cerrar jornada</h2>
      <div className="space-y-3">
        {cierre.length === 0 ? (
          <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-8 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-[#cbd5e1]">Sin inconsistencias registradas</p>
          </div>
        ) : (
          cierre.map((c) => (
            <div
              key={c.id}
              className="bg-[#111827] border border-orange-500/30 border-l-4 border-l-orange-500 rounded-xl p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-white">⚠️ Legajo {c.legajo || '—'}</span>
                    <span className="text-xs text-[#cbd5e1] font-mono">Orden {c.order_number}</span>
                  </div>
                  <div className="text-sm text-[#cbd5e1] font-mono space-y-0.5">
                    <div>Destino final: <span className="text-[#e2e8f0]">{c.destino_final}</span></div>
                    <div>Base esperada: <span className="text-[#e2e8f0]">{c.base_chofer}</span></div>
                    <div className="text-xs text-[#94a3b8]">{formatearFecha(c.creado_at)}</div>
                  </div>
                </div>
                <button
                  onClick={() => verJornada(c.order_number)}
                  className="bg-transparent border border-[#1e2d45] rounded-lg px-4 py-2 text-sm text-[#cbd5e1] hover:border-[#3b82f6] hover:text-[#3b82f6] transition flex-shrink-0"
                >
                  Ver jornada →
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
