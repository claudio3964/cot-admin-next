'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import StatsFlota from './components/StatsFlota'
import GridFlota from './components/GridFlota'
import ModalTaller from './components/ModalTaller'
import type { CocheEstado, TallerInfo, ViajeActivo } from './types'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

const FLOTA_MIN = 915
const FLOTA_MAX = 998

const getToken = () => sessionStorage.getItem('admin_token')

export default function FlotaPage() {
  const router = useRouter()
  const [coches, setCoches] = useState<CocheEstado[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [cocheSeleccionado, setCocheSeleccionado] = useState<number | null>(null)
  const [motivoActual, setMotivoActual] = useState('')

  const cargarFlota = async () => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    setLoading(true)
    const headers = { apikey: SB_KEY, Authorization: `Bearer ${token}` }
    const hoy = new Date().toISOString().split('T')[0]

    try {
      // 1. Obtener jornadas de hoy
      const jornadasRes = await fetch(
        `${SB_URL}/rest/v1/jornadas?empresa_id=eq.cot&fecha=eq.${hoy}&select=data,chofer_id`,
        { headers }
      )
      const jornadas = await jornadasRes.json()

      // 2. Obtener coches en taller
      const tallerRes = await fetch(
        `${SB_URL}/rest/v1/coches_taller?empresa_id=eq.cot&select=*`,
        { headers }
      )
      const taller = await tallerRes.json()

      // 3. Procesar coches en servicio
      const cochesServicio = new Set<number>()
      const cochesLibre = new Set<number>()
      const viajesActivos: ViajeActivo[] = []

      ;(jornadas || []).forEach((j: any) => {
        let d = {}
        try { d = typeof j.data === 'string' ? JSON.parse(j.data) : (j.data || {}) } catch {}
        if ((d as any).deleted) return
        const travels = (d as any).travels || []
        travels.forEach((t: any) => {
          if (t.status === 'cancelado') return
          const num = parseInt(t.coche)
          if (isNaN(num)) return
          if (t.status === 'en_curso') {
            cochesServicio.add(num)
          } else {
            cochesLibre.add(num)
          }
          viajesActivos.push({
            coche: num,
            chofer: j.chofer_id || '',
            origen: t.origen || '',
            destino: t.destino || '',
            salida: t.departureTime || '',
            llegada: t.arrivalTime || '',
            status: t.status || ''
          })
        })
      })

      const enTaller = new Set((taller || []).map((t: any) => t.coche_num))

      // 4. Armar lista de coches
      const cochesData: CocheEstado[] = []
      for (let num = FLOTA_MIN; num <= FLOTA_MAX; num++) {
        let estado: 'servicio' | 'libre' | 'inactivo' | 'taller' = 'inactivo'
        if (enTaller.has(num)) estado = 'taller'
        else if (cochesServicio.has(num)) estado = 'servicio'
        else if (cochesLibre.has(num)) estado = 'libre'

        const tallerInfo = (taller || []).find((t: any) => t.coche_num === num) || null
        cochesData.push({ num, estado, tallerInfo })
      }

      setCoches(cochesData)
    } catch (error) {
      console.error('Error cargando flota:', error)
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
    cargarFlota()
  }, [router])

  const abrirModalTaller = (num: number) => {
    const coche = coches.find(c => c.num === num)
    setCocheSeleccionado(num)
    setMotivoActual(coche?.tallerInfo?.motivo || '')
    setModalOpen(true)
  }

  const guardarTaller = async (motivo: string) => {
    const token = getToken()
    if (!token || !cocheSeleccionado) return

    const headers = {
      apikey: SB_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }

    try {
      // Eliminar si ya estaba en taller
      await fetch(
        `${SB_URL}/rest/v1/coches_taller?empresa_id=eq.cot&coche_num=eq.${cocheSeleccionado}`,
        { method: 'DELETE', headers }
      )

      // Agregar a taller
      await fetch(`${SB_URL}/rest/v1/coches_taller`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          empresa_id: 'cot',
          coche_num: cocheSeleccionado,
          motivo: motivo || 'Sin motivo',
          desde: new Date().toISOString()
        })
      })

      setModalOpen(false)
      cargarFlota()
    } catch (error) {
      console.error('Error guardando taller:', error)
      alert('❌ Error al guardar')
    }
  }

  const quitarTaller = async () => {
    const token = getToken()
    if (!token || !cocheSeleccionado) return

    const headers = {
      apikey: SB_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }

    try {
      await fetch(
        `${SB_URL}/rest/v1/coches_taller?empresa_id=eq.cot&coche_num=eq.${cocheSeleccionado}`,
        { method: 'DELETE', headers }
      )

      setModalOpen(false)
      cargarFlota()
    } catch (error) {
      console.error('Error quitando taller:', error)
      alert('❌ Error al quitar')
    }
  }

  if (loading) {
    return (
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-8 text-center">
        <div className="text-[#cbd5e1]">Cargando flota...</div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Disponibilidad de flota — hoy</h2>
        <button
          onClick={cargarFlota}
          className="bg-transparent border border-[#1e2d45] rounded-lg px-4 py-2 text-sm text-[#cbd5e1] hover:border-[#3b82f6] hover:text-[#3b82f6] transition"
        >
          ↺ Actualizar
        </button>
      </div>

      {/* Stats */}
      <StatsFlota coches={coches} />

      {/* Leyenda y filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5 text-xs text-[#cbd5e1]">
            <span className="w-3 h-3 rounded-sm bg-red-500 inline-block"></span>En servicio
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#cbd5e1]">
            <span className="w-3 h-3 rounded-sm bg-green-500 inline-block"></span>Libre
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#cbd5e1]">
            <span className="w-3 h-3 rounded-sm bg-yellow-500 inline-block"></span>Sin actividad
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#cbd5e1]">
            <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span>Taller
          </span>
        </div>

        <div className="flex gap-1">
          {['todos', 'servicio', 'libre', 'taller'].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1 text-xs rounded-full transition ${
                filtro === f
                  ? 'bg-blue-500 text-white'
                  : 'bg-[#1c2537] text-[#cbd5e1] hover:bg-[#2a3a5a]'
              }`}
            >
              {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
        <GridFlota coches={coches} filtro={filtro} onCocheClick={abrirModalTaller} />
      </div>

      {/* Modal */}
      <ModalTaller
        isOpen={modalOpen}
        cocheNum={cocheSeleccionado}
        motivoActual={motivoActual}
        onClose={() => setModalOpen(false)}
        onGuardar={guardarTaller}
        onQuitar={quitarTaller}
      />
    </div>
  )
}