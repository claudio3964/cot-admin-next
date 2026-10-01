'use client'

import type { Jornada, JornadaData, Viaje } from '../types'
import { formatearTiempoUy, hoyUy } from '@/lib/horaUy'

interface ModalDetalleProps {
  jornada: Jornada
  onClose: () => void
  parseJornadaData: (j: Jornada) => JornadaData
  onEditarViaje?: (viaje: Viaje) => void
  esSuperAdmin?: boolean
}

const ESTADOS_VIAJE: Record<string, { label: string; cls: string }> = {
  programado: { label: 'Programado', cls: 'bg-slate-500/20 text-slate-300' },
  en_curso:   { label: 'En curso',   cls: 'bg-yellow-500/20 text-yellow-400' },
  finalizado: { label: 'Finalizado', cls: 'bg-green-500/20 text-green-400' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-red-500/20 text-red-400' },
}

export default function ModalDetalle({
  jornada,
  onClose,
  parseJornadaData,
  onEditarViaje,
  esSuperAdmin = false
}: ModalDetalleProps) {
  const d = parseJornadaData(jornada)
  const todosLosViajes = d.travels || []
  // Los totales de respaldo (sin snapshot) siguen excluyendo los cancelados.
  const travels = todosLosViajes.filter(t => t.status !== 'cancelado')
  const guards = d.guards || []
  const fechaJornada = jornada.fecha || d.date || ''

  // Mismas condiciones que editar_viaje_panel: jornada cerrada, no borrada y de un día
  // anterior (hoy en Montevideo); viaje F, C o E. El servidor vuelve a validar todo.
  const jornadaEditable = esSuperAdmin && !!onEditarViaje && d.closed === true && !d.deleted
    && fechaJornada !== '' && fechaJornada < hoyUy()
  const viajeEditable = (v: Viaje) =>
    jornadaEditable && !!v.id && ['finalizado', 'cancelado', 'en_curso'].includes(v.status || '')
  const td = d.totalsDesactualizados
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
          <button onClick={onClose} className="text-[#cbd5e1] hover:text-white text-xl">✕</button>
        </div>

        <div className="p-6">
          {d.deleted && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 text-sm text-red-400">
              🗑 Jornada borrada por <span className="font-semibold">{d.deleted_by || '—'}</span>
              {d.deleted_at && ` el ${new Date(d.deleted_at).toLocaleString('es-UY')}`}
              {d.deleted_reason && <div className="mt-1 text-red-300">Motivo: {d.deleted_reason}</div>}
            </div>
          )}

          {td && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6 text-sm text-amber-400">
              ⚠ Totales desactualizados: un viaje se corrigió después del cierre
              {td.at && ` (${new Date(td.at).toLocaleString('es-UY', { timeZone: 'America/Montevideo' })})`}
              {td.edicion_id && <span className="text-amber-300"> — edición #{td.edicion_id}</span>}.
              <div className="mt-1 text-amber-300">
                KM, viáticos y monto son los del cierre original; no se recalcularon.
              </div>
            </div>
          )}

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

          {/* Viajes: todos, incluidos los cancelados */}
          {todosLosViajes.length > 0 && (
            <>
              <h3 className="text-sm font-semibold mb-3 text-[#e2e8f0]">
                🚍 Viajes ({todosLosViajes.length}
                {todosLosViajes.length !== travels.length && `, ${todosLosViajes.length - travels.length} cancelado(s)`})
              </h3>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead className="bg-[#1c2537]">
                    <tr>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Origen</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Destino</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Estado</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Salida</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Llegada</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs" title="Hora Uruguay">Inicio real</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs" title="Hora Uruguay">Fin real</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Km</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Tipo</th>
                      <th className="px-3 py-2 text-left text-[#cbd5e1] text-xs">Coche</th>
                      {jornadaEditable && <th className="px-3 py-2" />}
                    </tr>
                  </thead>
                  <tbody>
                    {todosLosViajes.map((v, i) => {
                      const estado = ESTADOS_VIAJE[v.status || ''] || { label: v.status || '—', cls: 'bg-slate-500/20 text-slate-300' }
                      const cancelado = v.status === 'cancelado'
                      return (
                        <tr key={v.id || i} className={`border-b border-[#1e2d45] ${cancelado ? 'opacity-60' : ''}`}>
                          <td className="px-3 py-2 text-[#e2e8f0]">{v.origen || '—'}{v.tomeCese && <span className="text-xs text-cyan-400 ml-1">[T/C]</span>}</td>
                          <td className="px-3 py-2 text-[#e2e8f0]">{v.destino || '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${estado.cls}`}>{estado.label}</span>
                          </td>
                          <td className="px-3 py-2 font-mono text-[#e2e8f0]">{v.departureTime || '—'}</td>
                          <td className="px-3 py-2 font-mono text-[#e2e8f0]">{v.arrivalTime || '—'}</td>
                          <td className="px-3 py-2 font-mono text-[#e2e8f0]">{formatearTiempoUy(v.inicioReal, fechaJornada)}</td>
                          <td className="px-3 py-2 font-mono text-[#e2e8f0]">{formatearTiempoUy(v.finReal, fechaJornada)}</td>
                          <td className="px-3 py-2 font-mono text-[#e2e8f0]">{Number(v.kmEmpresa || v.kmAuto || 0).toFixed(1)} km</td>
                          <td className="px-3 py-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{v.tipoServicio || v.turno || '—'}</span>
                          </td>
                          <td className="px-3 py-2 text-[#e2e8f0]">{v.coche || '—'}</td>
                          {jornadaEditable && (
                            <td className="px-3 py-2 text-right">
                              {viajeEditable(v) && (
                                <button
                                  onClick={() => onEditarViaje!(v)}
                                  className="bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-md px-2.5 py-1 text-xs font-medium hover:bg-blue-500/30 transition whitespace-nowrap"
                                >
                                  ✏️ Editar
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
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