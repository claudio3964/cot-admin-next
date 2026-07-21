'use client'

interface Viaje {
  origen?: string
  destino?: string
  departureTime?: string
  arrivalTime?: string
  kmEmpresa?: number
  kmAuto?: number
  tipoServicio?: string
  turno?: string
  acoplado?: boolean
  acopladoKm?: number
  coche?: string
  tomeCese?: boolean
  status?: string
}

interface Guardia {
  inicio?: string
  fin?: string
  hours?: number
  kmGuardia?: number
  type?: string
  cortadaAuto?: boolean
  viatico?: boolean
}

interface JornadaData {
  date?: string
  driverName?: string
  driverLegajo?: string
  tipo?: string
  coche?: string
  closed?: boolean
  travels?: Viaje[]
  guards?: Guardia[]
  totalsSnapshot?: {
    kmTotal?: number
    kmViajes?: number
    kmGuardias?: number
    kmTomeCese?: number
    kmAcoplados?: number
    viaticos?: number
    monto?: number
  }
  viaticos?: number
}

interface Jornada {
  id: number
  order_number: string
  chofer_id: string
  data: string | JornadaData
  created_at: string
}

interface ModalDetalleProps {
  jornada: Jornada
  onClose: () => void
  parseJornadaData: (j: Jornada) => JornadaData
  onEditar?: () => void  // ✅ Nuevo: callback para abrir edición
  esSuperAdmin?: boolean // ✅ Nuevo: saber si mostrar botón editar
}

export default function ModalDetalle({ 
  jornada, 
  onClose, 
  parseJornadaData,
  onEditar,
  esSuperAdmin = false
}: ModalDetalleProps) {
  const d = parseJornadaData(jornada)
  const travels = (d.travels || []).filter(t => t.status !== 'cancelado')
  const guards = d.guards || []
  const snap = d.totalsSnapshot || {}
  const tipo = d.tipo || 'contratado'

  const kmViajes = snap.kmViajes ?? travels.reduce((s, t) => s + (t.kmEmpresa || t.kmAuto || 0), 0)
  const kmGuardias = snap.kmGuardias ?? guards.reduce((s, g) => s + (g.kmGuardia || 0), 0)
  const kmTomeCese = snap.kmTomeCese ?? 0
  const kmAcoplados = snap.kmAcoplados ?? 0
  const kmTotal = snap.kmTotal ?? (kmViajes + kmGuardias)
  const viaticos = snap.viaticos ?? d.viaticos ?? 0
  const monto = snap.monto ?? Math.round(kmTotal * 7.637)

  const kmPorTipo: Record<string, number> = {}
  travels.forEach(v => {
    const tipoServicio = (v.tipoServicio || v.turno || 'SIN TIPO').toUpperCase()
    kmPorTipo[tipoServicio] = (kmPorTipo[tipoServicio] || 0) + (v.kmEmpresa || v.kmAuto || 0)
  })

  const ordenTipos = ['TURNO', 'DIRECTO', 'EXPRESO', 'PASAJERO', 'CONTRATADO']
  const coloresTipo: Record<string, string> = {
    TURNO: '#3b82f6',
    DIRECTO: '#06b6d4',
    EXPRESO: '#a78bfa',
    PASAJERO: '#10b981',
    CONTRATADO: '#f59e0b'
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header con botones */}
        <div className="sticky top-0 bg-[#111827] border-b border-[#1e2d45] px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-[#e2e8f0]">
            Jornada {d.date || '—'} — {d.driverName || jornada.chofer_id} ({d.driverLegajo || jornada.chofer_id})
          </h2>
          <div className="flex gap-2">
            {esSuperAdmin && onEditar && (
              <button
                onClick={onEditar}
                className="bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-md px-4 py-1.5 text-sm font-medium hover:bg-blue-500/30 transition"
              >
                ✏️ Editar
              </button>
            )}
            <button onClick={onClose} className="text-[#cbd5e1] hover:text-white text-xl">✕</button>
          </div>
        </div>

        <div className="p-6">
          {/* Tarjetas resumen - mismo código que antes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-[#1c2537] rounded-lg p-3">
              <div className="text-xs text-[#cbd5e1] uppercase">Tipo</div>
              <div className={`text-sm font-semibold mt-1 ${tipo === 'efectivo' ? 'text-blue-400' : 'text-yellow-400'}`}>{tipo}</div>
            </div>
            <div className="bg-[#1c2537] rounded-lg p-3">
              <div className="text-xs text-[#cbd5e1] uppercase">Estado</div>
              <div className={`text-sm font-semibold mt-1 ${d.closed ? 'text-green-400' : 'text-yellow-400'}`}>{d.closed ? 'Cerrada' : 'En curso'}</div>
            </div>
            <div className="bg-[#1c2537] rounded-lg p-3">
              <div className="text-xs text-[#cbd5e1] uppercase">KM Total</div>
              <div className="text-lg font-mono font-bold text-white">{Number(kmTotal).toFixed(1)}</div>
            </div>
            <div className="bg-[#1c2537] rounded-lg p-3">
              <div className="text-xs text-[#cbd5e1] uppercase">Monto</div>
              <div className="text-lg font-mono font-bold text-green-400">${Math.round(monto)}</div>
            </div>
          </div>

          {/* Desglose KM por tipo - mismo código que antes */}
          {Object.keys(kmPorTipo).length > 0 && (
            <>
              <h3 className="text-sm font-semibold mb-3 text-[#e2e8f0]">📊 KM por tipo de servicio</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {ordenTipos.filter(t => kmPorTipo[t]).map(t => (
                  <div key={t} className="bg-[#1c2537] rounded-lg p-3" style={{ borderLeft: `3px solid ${coloresTipo[t] || '#94a3b8'}` }}>
                    <div className="text-xs text-[#cbd5e1] uppercase">{t}</div>
                    <div className="text-lg font-mono font-bold" style={{ color: coloresTipo[t] || '#e2e8f0' }}>
                      {Number(kmPorTipo[t]).toFixed(1)} km
                    </div>
                    <div className="text-xs text-[#cbd5e1]">{travels.filter(v => (v.tipoServicio || v.turno || 'SIN TIPO').toUpperCase() === t).length} viaje(s)</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Viajes */}
          {travels.length > 0 && (
            <>
              <h3 className="text-sm font-semibold mb-3 text-[#e2e8f0]">🚍 Viajes ({travels.length})</h3>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead className="bg-[#1c2537]">
                    <tr>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Origen</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Destino</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Salida</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Llegada</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Km</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Tipo</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Coche</th>
                    </tr>
                  </thead>
                  <tbody>
                    {travels.map((v, i) => (
                      <tr key={i} className="border-b border-[#1e2d45]">
                        <td className="px-3 py-2 text-[#e2e8f0]">{v.origen || '—'}{v.tomeCese && <span className="text-xs text-cyan-400 ml-1">[T/C]</span>}</td>
                        <td className="px-3 py-2 text-[#e2e8f0]">{v.destino || '—'}</td>
                        <td className="px-3 py-2 font-mono text-[#e2e8f0]">{v.departureTime || '—'}</td>
                        <td className="px-3 py-2 font-mono text-[#e2e8f0]">{v.arrivalTime || '—'}</td>
                        <td className="px-3 py-2 font-mono text-[#e2e8f0]">{Number(v.kmEmpresa || v.kmAuto || 0).toFixed(1)} km</td>
                        <td className="px-3 py-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{v.tipoServicio || v.turno || '—'}</span>
                        </td>
                        <td className="px-3 py-2 text-[#e2e8f0]">{v.coche || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Guardias */}
          {guards.length > 0 && (
            <>
              <h3 className="text-sm font-semibold mb-3 text-[#e2e8f0]">🕐 Guardias ({guards.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#1c2537]">
                    <tr>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Inicio</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Fin</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Horas</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Km</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guards.map((g, i) => (
                      <tr key={i} className="border-b border-[#1e2d45]">
                        <td className="px-3 py-2 font-mono text-[#e2e8f0]">{g.inicio || '—'}</td>
                        <td className="px-3 py-2 font-mono text-[#e2e8f0]">{g.fin || '—'}</td>
                        <td className="px-3 py-2 font-mono text-[#e2e8f0]">{Number(g.hours || 0).toFixed(2)} h</td>
                        <td className="px-3 py-2 font-mono text-[#e2e8f0]">{Number(g.kmGuardia || 0).toFixed(1)} km</td>
                        <td className="px-3 py-2 text-[#e2e8f0]">{g.type || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}