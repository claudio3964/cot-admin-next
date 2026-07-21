'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

interface ViajeEstadistica {
  fecha: string
  chofer: string
  origen: string
  destino: string
  salida: string
  llegadaDecl: string
  durReal: number
  durDecl: number
  tipo: string
  coche: string
  hora: number
  diaSemana: number
  temporada: string
  kmEmpresa: number
}

const getToken = () => sessionStorage.getItem('admin_token')

// Utilidades
const formatMin = (min: number): string => {
  if (!min || min <= 0) return '—'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

const parseTimestamp = (val: any): number | null => {
  if (!val) return null
  if (typeof val === 'number' && val > 0) return val
  if (typeof val === 'string') {
    const ms = Date.parse(val)
    return isNaN(ms) ? null : ms
  }
  return null
}

export default function EstadisticasPage() {
  const router = useRouter()
  const [allViajes, setAllViajes] = useState<ViajeEstadistica[]>([])
  const [viajesFiltrados, setViajesFiltrados] = useState<ViajeEstadistica[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [franja, setFranja] = useState('')
  const [dia, setDia] = useState('')
  const [temporada, setTemporada] = useState('')
  const [horaSalida, setHoraSalida] = useState('18:00')

  // Listas para selects
  const [origenes, setOrigenes] = useState<string[]>([])
  const [destinos, setDestinos] = useState<string[]>([])

  const cargarEstadisticas = async () => {
  const token = getToken()
  if (!token) {
    router.push('/login')
    return
  }

  setLoading(true)
  const headers = { apikey: SB_KEY, Authorization: `Bearer ${token}` }

  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/jornadas?empresa_id=eq.cot&select=data,chofer_id&limit=500`,
      { headers }
    )
    const data = await res.json()

    // ✅ Asegurar que data es un array
    const jornadas = Array.isArray(data) ? data : []

    const viajes: ViajeEstadistica[] = []

    jornadas.forEach((j: any) => {
      let d = {}
      try {
        d = typeof j.data === 'string' ? JSON.parse(j.data) : (j.data || {})
      } catch {}

      const travels = (d as any).travels || []
      travels.forEach((t: any) => {
        if (t.status !== 'finalizado') return

        const ini = parseTimestamp(t.inicioReal)
        const fin = parseTimestamp(t.finReal)
        if (!ini || !fin) return

        const durReal = Math.round((fin - ini) / 60000)
        if (durReal <= 0 || durReal > 600) return

        const salida = t.departureTime || ''
        const horaNum = salida ? parseInt(salida.split(':')[0]) : -1
        if (horaNum < 0 || horaNum > 23) return

        const fecha = new Date((d as any).date || Date.now())
        const mes = fecha.getMonth() + 1

        viajes.push({
          fecha: (d as any).date || '',
          chofer: j.chofer_id || '',
          origen: t.origen || '',
          destino: t.destino || '',
          salida,
          llegadaDecl: t.arrivalTime || '',
          durReal,
          durDecl: t.duracionMinutos || 120,
          tipo: t.tipoServicio || t.turno || '',
          coche: t.coche || '—',
          hora: horaNum,
          diaSemana: fecha.getDay(),
          temporada: (mes >= 11 || mes <= 3) ? 'verano' : 'invierno',
          kmEmpresa: t.kmEmpresa || t.kmAuto || 0
        })
      })
    })

    setAllViajes(viajes)

    const origenesUnicos = [...new Set(viajes.map(v => v.origen))].filter(Boolean).sort()
    const destinosUnicos = [...new Set(viajes.map(v => v.destino))].filter(Boolean).sort()
    setOrigenes(origenesUnicos)
    setDestinos(destinosUnicos)

    aplicarFiltros(viajes)
  } catch (error) {
    console.error('Error cargando estadísticas:', error)
  } finally {
    setLoading(false)
  }
}

  const aplicarFiltros = (viajes: ViajeEstadistica[]) => {
    let filtrados = [...viajes]

    if (origen) filtrados = filtrados.filter(v => v.origen === origen)
    if (destino) filtrados = filtrados.filter(v => v.destino === destino)
    if (temporada) filtrados = filtrados.filter(v => v.temporada === temporada)
    if (dia !== '') filtrados = filtrados.filter(v => v.diaSemana === parseInt(dia))

    if (franja) {
      const [h1, h2] = franja.split('-').map(Number)
      filtrados = filtrados.filter(v => v.hora >= h1 && v.hora < h2)
    }

    setViajesFiltrados(filtrados)
  }

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }
    cargarEstadisticas()
  }, [router])

  useEffect(() => {
    aplicarFiltros(allViajes)
  }, [origen, destino, franja, dia, temporada])

  const recalcularLlegada = () => {
    const n = viajesFiltrados.length
    if (!horaSalida || !n) return '—'

    const promedio = Math.round(viajesFiltrados.reduce((s, v) => s + v.durReal, 0) / n)
    const [h, m] = horaSalida.split(':').map(Number)
    const totalMin = h * 60 + m + promedio

    return `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`
  }

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-8 text-center">
        <div className="text-[#cbd5e1]">Cargando estadísticas...</div>
      </div>
    )
  }

  const n = viajesFiltrados.length
  const promedio = n ? Math.round(viajesFiltrados.reduce((s, v) => s + v.durReal, 0) / n) : null
  const minReal = n ? Math.min(...viajesFiltrados.map(v => v.durReal)) : null
  const maxReal = n ? Math.max(...viajesFiltrados.map(v => v.durReal)) : null
  const promDecl = n ? Math.round(viajesFiltrados.reduce((s, v) => s + v.durDecl, 0) / n) : null

  const viajesConKm = viajesFiltrados.filter(v => v.kmEmpresa > 0 && v.durReal > 0)
  const velProm = viajesConKm.length
    ? Math.round(viajesConKm.reduce((s, v) => s + (v.kmEmpresa / (v.durReal / 60)), 0) / viajesConKm.length)
    : null

  const llegadaEstimada = recalcularLlegada()

  return (
    <div className="space-y-6">
      {/* ===== FILTROS ===== */}
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-[#cbd5e1] uppercase tracking-wider mb-1">Origen</label>
            <select
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
            >
              <option value="">Todos</option>
              {origenes.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#cbd5e1] uppercase tracking-wider mb-1">Destino</label>
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
            >
              <option value="">Todos</option>
              {destinos.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#cbd5e1] uppercase tracking-wider mb-1">Franja horaria</label>
            <select
              value={franja}
              onChange={(e) => setFranja(e.target.value)}
              className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
            >
              <option value="">Cualquier hora</option>
              <option value="0-6">00:00–06:00</option>
              <option value="6-10">06:00–10:00</option>
              <option value="10-14">10:00–14:00</option>
              <option value="14-18">14:00–18:00</option>
              <option value="18-22">18:00–22:00</option>
              <option value="22-24">22:00–24:00</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#cbd5e1] uppercase tracking-wider mb-1">Día</label>
            <select
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
            >
              <option value="">Todos</option>
              <option value="1">Lunes</option>
              <option value="2">Martes</option>
              <option value="3">Miércoles</option>
              <option value="4">Jueves</option>
              <option value="5">Viernes</option>
              <option value="6">Sábado</option>
              <option value="0">Domingo</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#cbd5e1] uppercase tracking-wider mb-1">Temporada</label>
            <select
              value={temporada}
              onChange={(e) => setTemporada(e.target.value)}
              className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
            >
              <option value="">Todas</option>
              <option value="invierno">Invierno (Abr–Oct)</option>
              <option value="verano">Verano (Nov–Mar)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===== TARJETAS DE ESTADÍSTICAS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
          <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">Duración promedio</div>
          <div className="text-2xl font-mono font-bold text-white mt-1">
            {promedio ? `${promedio} min` : '—'}
          </div>
          <div className="text-xs text-[#cbd5e1] mt-1">{promedio ? formatMin(promedio) : ''}</div>
          {promDecl && promedio && (
            <div className="text-xs text-[#06b6d4] mt-0.5">Declarado: {promDecl} min</div>
          )}
        </div>

        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
          <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">Rango real</div>
          <div className="text-2xl font-mono font-bold text-white mt-1">
            {minReal !== null ? `${minReal}–${maxReal}` : '—'}
          </div>
          <div className="text-xs text-[#cbd5e1] mt-1">
            {minReal !== null ? `${formatMin(minReal)} – ${formatMin(maxReal!)}` : ''}
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
          <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">Velocidad promedio</div>
          <div className="text-2xl font-mono font-bold text-white mt-1">
            {velProm ? `${velProm} km/h` : '—'}
          </div>
          <div className="text-xs text-[#cbd5e1] mt-1">
            {viajesConKm.length > 0 ? `${viajesConKm.length} viaje(s) con km` : ''}
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
          <label className="block text-xs text-[#cbd5e1] uppercase tracking-wider mb-1">Si sale a las</label>
          <input
            type="time"
            value={horaSalida}
            onChange={(e) => setHoraSalida(e.target.value)}
            className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-1 text-lg text-white font-mono outline-none focus:border-[#3b82f6]"
          />
        </div>

        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
          <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">Llegada estimada</div>
          <div className="text-2xl font-mono font-bold text-green-400 mt-1">
            {llegadaEstimada}
          </div>
          <div className="text-xs text-[#cbd5e1] mt-1">{n} viaje(s) de muestra</div>
        </div>
      </div>

      {/* ===== TABLA DE VIAJES ===== */}
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1c2537] border-b border-[#1e2d45]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Chofer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Origen</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Destino</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Salida</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Llegada decl.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Duración real</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">vs declarado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Velocidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Coche</th>
              </tr>
            </thead>
            <tbody>
              {n === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-[#cbd5e1]">
                    {allViajes.length === 0
                      ? 'No hay viajes registrados en el sistema'
                      : 'Seleccioná una ruta para ver estadísticas'}
                  </td>
                </tr>
              ) : (
                [...viajesFiltrados]
                  .reverse()
                  .slice(0, 50)
                  .map((v, i) => {
                    const diff = v.durReal - v.durDecl
                    const barra = Math.min(100, Math.round((v.durReal / ((promedio || 120) * 1.5)) * 100))
                    const color = v.durReal <= (promedio || 120)
                      ? '#10b981'
                      : v.durReal <= (promedio || 120) * 1.2
                      ? '#f59e0b'
                      : '#ef4444'
                    const diffColor = diff <= 0 ? '#10b981' : diff <= 15 ? '#f59e0b' : '#ef4444'
                    const velViaje = v.kmEmpresa > 0 ? Math.round(v.kmEmpresa / (v.durReal / 60)) : null

                    return (
                      <tr key={i} className="border-b border-[#1e2d45] hover:bg-[#1c2537]/30">
                        <td className="px-4 py-3 font-mono text-xs text-[#cbd5e1]">{v.fecha || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#cbd5e1]">{v.chofer}</td>
                        <td className="px-4 py-3 text-[#e2e8f0]">{v.origen}</td>
                        <td className="px-4 py-3 text-[#e2e8f0]">{v.destino}</td>
                        <td className="px-4 py-3 font-mono text-[#e2e8f0]">{v.salida}</td>
                        <td className="px-4 py-3 font-mono text-[#e2e8f0]">{v.llegadaDecl}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-[#1e2d45] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.min(barra, 100)}%`, background: color }}
                              />
                            </div>
                            <span className="font-mono text-sm text-[#e2e8f0]">{v.durReal} min</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm" style={{ color: diffColor }}>
                            {diff >= 0 ? `+${diff} min` : `${diff} min`}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-[#cbd5e1]">
                          {velViaje ? `${velViaje} km/h` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                            {v.tipo || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-[#cbd5e1]">{v.coche}</td>
                      </tr>
                    )
                  })
              )}
            </tbody>
          </table>
        </div>
        {n > 50 && (
          <div className="px-4 py-2 text-xs text-[#cbd5e1] border-t border-[#1e2d45]">
            Mostrando 50 de {n} viajes
          </div>
        )}
      </div>
    </div>
  )
}