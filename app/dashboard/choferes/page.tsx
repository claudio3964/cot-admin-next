'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-8 text-center">
        <div className="text-[#cbd5e1]">Cargando choferes...</div>
      </div>
    )
  }

  return (
    <div className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
      {/* Header con filtro y botón refrescar */}
      <div className="p-4 border-b border-[#1e2d45] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre o legajo..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="flex-1 bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#94a3b8] outline-none focus:border-[#3b82f6]"
          />
          <span className="text-xs text-[#cbd5e1] whitespace-nowrap">
            {filteredChoferes.length} choferes
          </span>
        </div>
        <button
          onClick={cargarChoferes}
          className="bg-transparent border border-[#1e2d45] rounded-lg px-4 py-2 text-sm text-[#cbd5e1] hover:border-[#3b82f6] hover:text-[#3b82f6] transition"
        >
          ↺ Actualizar
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#1c2537] border-b border-[#1e2d45]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Legajo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Base</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Device ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Registrado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Estado</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[#cbd5e1] uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredChoferes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#cbd5e1]">
                  {filtro ? 'No hay choferes que coincidan con la búsqueda' : 'No hay choferes registrados'}
                </td>
              </tr>
            ) : (
              filteredChoferes.map((c) => (
                <tr key={c.id} className="border-b border-[#1e2d45] hover:bg-[#1c2537]/30">
                  <td className="px-4 py-3 font-mono text-sm text-[#e2e8f0]">{c.legajo || '—'}</td>
                  <td className="px-4 py-3 font-medium text-white">{c.nombre || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                      {c.tipo || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#e2e8f0]">{c.base || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-[#cbd5e1]">
                      {c.device_id ? c.device_id.substring(0, 20) + '…' : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#cbd5e1]">
                    {c.registrado_at ? new Date(c.registrado_at).toLocaleDateString('es-UY') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${c.device_id ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {c.device_id ? '● Activo' : '○ Sin dispositivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.device_id && (
                      <button
                        onClick={() => enviarComandoLimpiar(c.id, c.device_id, c.nombre)}
                        className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-md px-3 py-1 text-xs hover:bg-red-500/20 transition whitespace-nowrap"
                      >
                        🗑 Limpiar jornadas
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