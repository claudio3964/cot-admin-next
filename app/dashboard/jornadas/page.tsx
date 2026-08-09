'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

  // Filtros
  const [filtroChofer, setFiltroChofer] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  // Rol del usuario
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

  // Deep-link desde la tab de Inconsistencias (?order_number=XXX): abre el
  // detalle de esa jornada apenas se termina de cargar la lista.
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
    // Por ahora solo un aviso, después implementaremos el modal de edición
    alert('✏️ Edición de jornada - Próximamente')
    // Aquí irá la lógica para abrir el modal de edición
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
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-8 text-center">
        <div className="text-[#cbd5e1]">Cargando jornadas...</div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
        {/* Filtros */}
        <div className="p-4 border-b border-[#1e2d45] flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="🔍 Chofer o legajo..."
            value={filtroChofer}
            onChange={(e) => setFiltroChofer(e.target.value)}
            className="bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#94a3b8] outline-none focus:border-[#3b82f6]"
          />
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
          />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
          >
            <option value="">Todos los estados</option>
            <option value="cerrada">✓ Cerradas</option>
            <option value="curso">● En curso</option>
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
          >
            <option value="">Todos los tipos</option>
            <option value="efectivo">Efectivo</option>
            <option value="contratado">Contratado</option>
          </select>
          <button
            onClick={limpiarFiltros}
            className="bg-transparent border border-[#1e2d45] rounded-lg px-4 py-2 text-sm text-[#cbd5e1] hover:border-[#3b82f6] hover:text-[#3b82f6] transition"
          >
            ✕ Limpiar
          </button>
        </div>

        {/* Info y paginación */}
        <div className="px-4 py-2 text-xs text-[#cbd5e1] font-mono border-b border-[#1e2d45] flex justify-between items-center">
          <span>
            Mostrando {jornadasFiltradas.length ? inicio + 1 : 0}–{Math.min(inicio + JORNADAS_POR_PAGINA, jornadasFiltradas.length)} de {jornadasFiltradas.length} jornadas
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-2 py-1 rounded border border-[#1e2d45] disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#3b82f6]"
            >
              ◀
            </button>
            <span className="px-2 py-1">Pág {pagina} / {totalPaginas || 1}</span>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas || totalPaginas === 0}
              className="px-2 py-1 rounded border border-[#1e2d45] disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#3b82f6]"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1c2537] border-b border-[#1e2d45]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Chofer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Legajo</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#cbd5e1] uppercase">Viajes</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#cbd5e1] uppercase">Guardias</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Km Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#cbd5e1] uppercase">Viáticos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#cbd5e1] uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {jornadasPagina.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[#cbd5e1]">
                    No hay jornadas registradas
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
                      className="border-b border-[#1e2d45] hover:bg-[#1c2537]/30 cursor-pointer"
                      onClick={() => abrirDetalle(j)}
                    >
                      <td className="px-4 py-3 font-mono text-sm text-[#e2e8f0]">{fecha}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{driverName}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${tipo === 'efectivo' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {tipo === 'efectivo' ? 'Efectivo' : 'Contratado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-[#e2e8f0]">{driverLegajo}</td>
                      <td className="px-4 py-3 text-center text-[#e2e8f0]">{travels.length}</td>
                      <td className="px-4 py-3 text-center text-[#e2e8f0]">{guards.length}</td>
                      <td className="px-4 py-3 font-mono text-[#e2e8f0]">{Number(kmTotal).toFixed(1)} km</td>
                      <td className="px-4 py-3 text-center text-[#e2e8f0]">{viaticos}</td>
                      <td className="px-4 py-3 font-mono text-[#e2e8f0]">${Math.round(monto)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${closed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {closed ? '✓ Cerrada' : '● En curso'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          {closed && (
                            <button
                              onClick={() => exportarJSON(j)}
                              className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-md px-3 py-1 text-xs hover:bg-cyan-500/20 transition"
                            >
                              JSON
                            </button>
                          )}
                          {esSuperAdmin && (
                            <button
                              onClick={() => setJornadaABorrar(j)}
                              className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-md px-3 py-1 text-xs hover:bg-red-500/20 transition"
                            >
                              🗑
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

      {/* Modal de detalle */}
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