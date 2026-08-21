'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  FileJson,
  Trash2,
  Loader2,
  Route,
  Clock,
  User,
  FileText
} from 'lucide-react'
import ModalDetalle from './components/ModalDetalle'
import ModalConfirmarBorrado from './components/ModalConfirmarBorrado'
import type { Jornada, JornadaData } from './types'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

const JORNADAS_POR_PAGINA = 20

const getToken = () => sessionStorage.getItem('admin_token')
const getAdminRol = () => sessionStorage.getItem('admin_rol')

const parseJornadaData = (j: Jornada): JornadaData => {
  if (typeof j.data === 'string') {
    try {
      return JSON.parse(j.data)
    } catch {
      return {}
    }
  }
  return j.data || {}
}

export default function JornadasPage() {
  const router = useRouter()
  const [allJornadas, setAllJornadas] = useState<Jornada[]>([])
  const [jornadasFiltradas, setJornadasFiltradas] = useState<Jornada[]>([])
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [selectedJornada, setSelectedJornada] = useState<Jornada | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [jornadaABorrar, setJornadaABorrar] = useState<Jornada | null>(null)
  const [mounted, setMounted] = useState(false)

  // Filtros
  const [filtroChofer, setFiltroChofer] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  const userRol = typeof window !== 'undefined' ? getAdminRol() : ''
  const esSuperAdmin = userRol === 'superadmin'

  const cargarJornadas = async () => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    setLoading(true)
    const headers = { apikey: SB_KEY, Authorization: `Bearer ${token}` }

    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/jornadas?empresa_id=eq.cot&select=*&order=id.desc&limit=500`,
        { headers }
      )
      const data = await res.json()
      setAllJornadas(data || [])
      aplicarFiltros(data || [])
    } catch (error) {
      console.error('Error cargando jornadas:', error)
    } finally {
      setLoading(false)
    }
  }

  const aplicarFiltros = (jornadas: Jornada[]) => {
    let filtradas = [...jornadas]

    filtradas = filtradas.filter(j => {
      const d = parseJornadaData(j)
      if (d.deleted) return false

      if (filtroChofer) {
        const nombre = (d.driverName || '').toLowerCase()
        const legajo = (d.driverLegajo || j.chofer_id || '').toLowerCase()
        if (!nombre.includes(filtroChofer.toLowerCase()) && !legajo.includes(filtroChofer.toLowerCase())) {
          return false
        }
      }

      if (filtroFecha && d.date !== filtroFecha) return false
      if (filtroEstado === 'cerrada' && !d.closed) return false
      if (filtroEstado === 'curso' && d.closed) return false
      if (filtroTipo && (d.tipo || 'contratado') !== filtroTipo) return false

      return true
    })

    setJornadasFiltradas(filtradas)
    setPagina(1)
  }

  useEffect(() => {
    setMounted(true)
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }
    cargarJornadas()
  }, [])

  useEffect(() => {
    aplicarFiltros(allJornadas)
  }, [filtroChofer, filtroFecha, filtroEstado, filtroTipo])

  useEffect(() => {
    if (allJornadas.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const orderNumber = params.get('order_number')
    if (!orderNumber) return

    const jornada = allJornadas.find(j => j.order_number === orderNumber)
    if (jornada && (!parseJornadaData(jornada).deleted || esSuperAdmin)) {
      abrirDetalle(jornada)
    } else {
      alert(`No se encontró la jornada ${orderNumber} entre las últimas ${allJornadas.length} cargadas.`)
    }
    router.replace('/dashboard/jornadas')
  }, [allJornadas])

  const limpiarFiltros = () => {
    setFiltroChofer('')
    setFiltroFecha('')
    setFiltroEstado('')
    setFiltroTipo('')
  }

  const totalPaginas = Math.ceil(jornadasFiltradas.length / JORNADAS_POR_PAGINA)
  const inicio = (pagina - 1) * JORNADAS_POR_PAGINA
  const jornadasPagina = jornadasFiltradas.slice(inicio, inicio + JORNADAS_POR_PAGINA)

  const abrirDetalle = (jornada: Jornada) => {
    setSelectedJornada(jornada)
    setShowModal(true)
  }

  const cerrarModal = () => {
    setShowModal(false)
    setSelectedJornada(null)
  }

  const handleEditarJornada = () => {
    alert('✏️ Edición de jornada - Próximamente')
  }

  const exportarJSON = (jornada: Jornada) => {
    const d = parseJornadaData(jornada)
    const snap = d.totalsSnapshot || {}

    const payload = {
      sistema: 'DriverLog',
      version: '1.0',
      exportado_at: new Date().toISOString(),
      jornada: {
        order_number: jornada.order_number,
        fecha: d.date || '',
        chofer_nombre: d.driverName || jornada.chofer_id || '',
        chofer_legajo: d.driverLegajo || jornada.chofer_id || '',
        tipo: d.tipo || 'contratado',
        coche: d.coche || '',
        estado: d.closed ? 'cerrada' : 'en_curso',
        km_total: Math.round((snap.kmTotal || 0) * 10) / 10,
        km_viajes: Math.round((snap.kmViajes || 0) * 10) / 10,
        km_guardias: Math.round((snap.kmGuardias || 0) * 10) / 10,
        km_tome_cese: Math.round((snap.kmTomeCese || 0) * 10) / 10,
        km_acoplados: Math.round((snap.kmAcoplados || 0) * 10) / 10,
        viaticos: snap.viaticos || 0,
        monto: Math.round(snap.monto || 0),
        viajes: (d.travels || []).filter(v => v.status !== 'cancelado').map(v => ({
          origen: v.origen || '',
          destino: v.destino || '',
          salida: v.departureTime || '',
          llegada: v.arrivalTime || '',
          km: v.kmEmpresa || v.kmAuto || 0,
          tipo_servicio: v.tipoServicio || v.turno || '',
          acoplado: v.acoplado || false,
          coche: v.coche || ''
        })),
        guardias: (d.guards || []).map(g => ({
          inicio: g.inicio || '',
          fin: g.fin || '',
          horas: Number(g.hours || 0).toFixed(2),
          km: Number(g.kmGuardia || 0).toFixed(1),
          tipo: g.type || ''
        }))
      }
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jornada_${d.driverLegajo || jornada.chofer_id || 'chofer'}_${d.date || 'fecha'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-[#64748b]">
          <Loader2 className="w-5 h-5 animate-spin" />
          Cargando jornadas...
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`
        bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-xl overflow-hidden
        transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}>
        {/* Header + Filtros */}
        <div className="p-5 border-b border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Route className="w-5 h-5 text-[#3b82f6]" />
              Jornadas registradas
            </h2>
            <span className="text-[11px] text-[#475569] font-mono">
              {jornadasFiltradas.length} registros
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
              <input
                type="text"
                placeholder="Buscar chofer o legajo..."
                value={filtroChofer}
                onChange={(e) => setFiltroChofer(e.target.value)}
                className="
                  w-full bg-[#0f172a]/60 border border-[#1e293b] rounded-lg 
                  pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#475569] 
                  outline-none transition-all duration-300
                  focus:border-[#3b82f6]/50 focus:ring-2 focus:ring-[#3b82f6]/10
                "
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="
                  bg-[#0f172a]/60 border border-[#1e293b] rounded-lg 
                  pl-10 pr-4 py-2.5 text-sm text-white outline-none 
                  transition-all duration-300 focus:border-[#3b82f6]/50
                "
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="
                bg-[#0f172a]/60 border border-[#1e293b] rounded-lg px-4 py-2.5 
                text-sm text-white outline-none transition-all duration-300 
                focus:border-[#3b82f6]/50
              "
            >
              <option value="">Todos los estados</option>
              <option value="cerrada">Cerradas</option>
              <option value="curso">En curso</option>
            </select>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="
                bg-[#0f172a]/60 border border-[#1e293b] rounded-lg px-4 py-2.5 
                text-sm text-white outline-none transition-all duration-300 
                focus:border-[#3b82f6]/50
              "
            >
              <option value="">Todos los tipos</option>
              <option value="efectivo">Efectivo</option>
              <option value="contratado">Contratado</option>
            </select>
            <button
              onClick={limpiarFiltros}
              className="flex items-center gap-1.5 bg-[#1c2537] border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-[#94a3b8] hover:border-[#ef4444]/50 hover:text-[#ef4444] transition-all duration-200"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          </div>
        </div>

        {/* Paginación */}
        <div className="px-5 py-3 border-b border-white/[0.06] flex justify-between items-center">
          <span className="text-[11px] text-[#475569] font-mono">
            {jornadasFiltradas.length ? inicio + 1 : 0}–{Math.min(inicio + JORNADAS_POR_PAGINA, jornadasFiltradas.length)} de {jornadasFiltradas.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#1e293b] text-[#94a3b8] text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#3b82f6]/50 hover:text-[#3b82f6] transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-[#64748b] font-mono px-2">
              {pagina} / {totalPaginas || 1}
            </span>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas || totalPaginas === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#1e293b] text-[#94a3b8] text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#3b82f6]/50 hover:text-[#3b82f6] transition-all duration-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0f172a]/40 border-b border-white/[0.06]">
              <tr>
                {['Fecha', 'Chofer', 'Legajo', 'Viajes', 'Guardias', 'Km Total', 'Viáticos', 'Monto', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jornadasPagina.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-[#475569]">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-[#1e293b]" />
                      <p>No hay jornadas registradas</p>
                    </div>
                  </td>
                </tr>
              ) : (
                jornadasPagina.map((j) => {
                  const d = parseJornadaData(j)
                  const driverName = d?.driverName || j?.chofer_id || 'Sin nombre'
                  const driverLegajo = d?.driverLegajo || j?.chofer_id || 'Sin legajo'
                  const fecha = d?.date || 'Sin fecha'
                  const travels = Array.isArray(d?.travels) ? d.travels.filter(t => t?.status !== 'cancelado') : []
                  const guards = Array.isArray(d?.guards) ? d.guards : []
                  const tipo = d?.tipo || 'contratado'
                  const closed = d?.closed || false

                  const snap = d?.totalsSnapshot || {}
                  const kmViajes = snap.kmViajes ?? travels.reduce((s, t) => s + (Number(t?.kmEmpresa) || Number(t?.kmAuto) || 0), 0)
                  const kmGuardias = snap.kmGuardias ?? guards.reduce((s, g) => s + (Number(g?.kmGuardia) || 0), 0)
                  const kmTotal = snap.kmTotal ?? (kmViajes + kmGuardias)
                  const viaticos = snap.viaticos ?? d?.viaticos ?? 0
                  const monto = snap.monto ?? Math.round(kmTotal * 7.637)

                  return (
                    <tr
                      key={j.id}
                      className="border-b border-white/[0.03] hover:bg-[#1c2537]/30 cursor-pointer transition-colors"
                      onClick={() => abrirDetalle(j)}
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-[#94a3b8]">{fecha}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white text-sm">{driverName}</div>
                        <span className={`
                          text-[10px] px-2 py-0.5 rounded-full border mt-1 inline-block
                          ${tipo === 'efectivo' 
                            ? 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20' 
                            : 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20'
                          }
                        `}>
                          {tipo === 'efectivo' ? 'Efectivo' : 'Contratado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#94a3b8]">{driverLegajo}</td>
                      <td className="px-4 py-3 text-center text-[#e2e8f0]">{travels.length}</td>
                      <td className="px-4 py-3 text-center text-[#e2e8f0]">{guards.length}</td>
                      <td className="px-4 py-3 font-mono text-[#e2e8f0]">{Number(kmTotal).toFixed(1)} km</td>
                      <td className="px-4 py-3 text-center text-[#e2e8f0]">{viaticos}</td>
                      <td className="px-4 py-3 font-mono text-[#e2e8f0]">${Math.round(monto)}</td>
                      <td className="px-4 py-3">
                        <span className={`
                          inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border
                          ${closed 
                            ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20' 
                            : 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20'
                          }
                        `}>
                          <Clock className="w-3 h-3" />
                          {closed ? 'Cerrada' : 'En curso'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          {closed && (
                            <button
                              onClick={() => exportarJSON(j)}
                              className="inline-flex items-center gap-1 bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[#06b6d4] rounded-md px-2.5 py-1 text-[11px] hover:bg-[#06b6d4]/20 transition"
                            >
                              <FileJson className="w-3 h-3" />
                              JSON
                            </button>
                          )}
                          {esSuperAdmin && (
                            <button
                              onClick={() => setJornadaABorrar(j)}
                              className="inline-flex items-center gap-1 bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] rounded-md px-2.5 py-1 text-[11px] hover:bg-[#ef4444]/20 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modales */}
      {showModal && selectedJornada && (
        <ModalDetalle
          jornada={selectedJornada}
          onClose={cerrarModal}
          parseJornadaData={parseJornadaData}
          esSuperAdmin={esSuperAdmin}
          onEditar={handleEditarJornada}
        />
      )}

      {jornadaABorrar && (
        <ModalConfirmarBorrado
          orderNumber={jornadaABorrar.order_number}
          onClose={() => setJornadaABorrar(null)}
          onBorrado={() => {
            setJornadaABorrar(null)
            cerrarModal()
            cargarJornadas()
          }}
        />
      )}
    </>
  )
}