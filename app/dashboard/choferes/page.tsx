'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Trash2, UserCheck, Smartphone } from 'lucide-react'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

interface Chofer {
  id: string
  legajo: string
  nombre: string
  tipo: string
  base: string
  device_id: string | null
  registrado_at: string
  empresa_id: string
}

const getToken = () => sessionStorage.getItem('admin_token')

export default function ChoferesPage() {
  const router = useRouter()
  const [choferes, setChoferes] = useState<Chofer[]>([])
  const [filteredChoferes, setFilteredChoferes] = useState<Chofer[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [mounted, setMounted] = useState(false)

  const cargarChoferes = async () => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    setLoading(true)
    const headers = { apikey: SB_KEY, Authorization: `Bearer ${token}` }

    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/choferes?empresa_id=eq.cot&select=*&order=nombre.asc`,
        { headers }
      )
      const data = await res.json()
      setChoferes(data || [])
      setFilteredChoferes(data || [])
    } catch (error) {
      console.error('Error cargando choferes:', error)
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
    cargarChoferes()
  }, [router])

  useEffect(() => {
    if (!filtro.trim()) {
      setFilteredChoferes(choferes)
      return
    }

    const q = filtro.toLowerCase()
    const filtrados = choferes.filter(c =>
      (c.nombre || '').toLowerCase().includes(q) ||
      (c.legajo || '').toLowerCase().includes(q)
    )
    setFilteredChoferes(filtrados)
  }, [filtro, choferes])

  const enviarComandoLimpiar = async (choferId: string, deviceId: string | null, nombre: string) => {
    if (!deviceId) {
      alert('Este chofer no tiene dispositivo registrado')
      return
    }

    if (!confirm(`¿Limpiar todas las jornadas locales de ${nombre}?\nEsto borrará el localStorage de su celular.`)) {
      return
    }

    const token = getToken()
    if (!token) return

    try {
      const res = await fetch(`${SB_URL}/rest/v1/comandos_dispositivo`, {
        method: 'POST',
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          chofer_id: choferId,
          device_id: deviceId,
          tipo: 'limpiar_jornadas',
          empresa_id: 'cot'
        })
      })

      if (res.ok) {
        alert(`✅ Comando enviado a ${nombre} — se ejecutará al abrir la app`)
      } else {
        const err = await res.text()
        console.error('Supabase error:', err)
        alert('❌ Error al enviar comando')
      }
    } catch (error) {
      console.error('Error enviando comando:', error)
      alert('❌ Error al enviar comando')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-[#64748b]">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Cargando choferes...
        </div>
      </div>
    )
  }

  return (
    <div className={`
      bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-xl overflow-hidden
      transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
    `}>
      {/* Header */}
      <div className="p-5 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
            <input
              type="text"
              placeholder="Buscar por nombre o legajo..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="
                w-full bg-[#0f172a]/60 border border-[#1e293b] rounded-lg 
                pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#475569] 
                outline-none transition-all duration-300
                focus:border-[#3b82f6]/50 focus:ring-2 focus:ring-[#3b82f6]/10
              "
            />
          </div>
          <span className="text-xs text-[#475569] font-mono whitespace-nowrap">
            {filteredChoferes.length} choferes
          </span>
        </div>
        <button
          onClick={cargarChoferes}
          className="flex items-center gap-2 bg-[#1c2537] border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-[#94a3b8] hover:border-[#3b82f6]/50 hover:text-[#3b82f6] transition-all duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#0f172a]/40 border-b border-white/[0.06]">
            <tr>
              {['Legajo', 'Nombre', 'Tipo', 'Base', 'Device ID', 'Registrado', 'Estado', 'Acciones'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredChoferes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[#475569]">
                  <div className="flex flex-col items-center gap-2">
                    <UserCheck className="w-8 h-8 text-[#1e293b]" />
                    <p>{filtro ? 'No hay choferes que coincidan con la búsqueda' : 'No hay choferes registrados'}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredChoferes.map((c) => (
                <tr key={c.id} className="border-b border-white/[0.03] hover:bg-[#1c2537]/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-[#94a3b8]">{c.legajo || '—'}</td>
                  <td className="px-4 py-3 font-medium text-white">{c.nombre || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20">
                      {c.tipo || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8]">{c.base || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11px] text-[#475569]">
                      {c.device_id ? c.device_id.substring(0, 16) + '…' : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[#64748b]">
                    {c.registrado_at ? new Date(c.registrado_at).toLocaleDateString('es-UY') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`
                      inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border
                      ${c.device_id 
                        ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20' 
                        : 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20'
                      }
                    `}>
                      {c.device_id ? <Smartphone className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                      {c.device_id ? 'Activo' : 'Sin dispositivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.device_id && (
                      <button
                        onClick={() => enviarComandoLimpiar(c.id, c.device_id, c.nombre)}
                        className="inline-flex items-center gap-1.5 bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] rounded-md px-3 py-1.5 text-[11px] hover:bg-[#ef4444]/20 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        Limpiar jornadas
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}