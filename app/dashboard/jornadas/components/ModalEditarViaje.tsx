'use client'

import { useState } from 'react'
import type { Viaje } from '../types'
import { fechaHoraUyAMs, msAFechaHoraUy, tiempoMs } from '@/lib/horaUy'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

const MOTIVO_MIN = 10  // mismo mínimo que editar_viaje_panel

interface ModalEditarViajeProps {
  orderNumber: string
  fechaJornada: string  // 'YYYY-MM-DD'
  viaje: Viaje
  onClose: () => void
  onEditado: () => void
}

type Estado = 'finalizado' | 'cancelado'

// Valor inicial de un par fecha/hora: el tiempo cargado o, si no hay, la fecha de la jornada.
function inicial(v: unknown, fechaJornada: string) {
  const ms = tiempoMs(v)
  return ms === null ? { fecha: fechaJornada, hora: '' } : msAFechaHoraUy(ms)
}

export default function ModalEditarViaje({ orderNumber, fechaJornada, viaje, onClose, onEditado }: ModalEditarViajeProps) {
  const statusActual = viaje.status || ''
  const esEnCurso = statusActual === 'en_curso'

  // E solo puede pasar a F (E->C prohibido, D2); F/C arrancan en su propio estado.
  const [estado, setEstado] = useState<Estado>(esEnCurso ? 'finalizado' : (statusActual as Estado))
  // Sin inicioReal cargado (null, 0 o vacío) se sugiere el horario programado, marcado
  // como tal: el admin tiene que confirmarlo o cambiarlo.
  const iniSugeridoMs = tiempoMs(viaje.inicioReal) === null ? tiempoMs(viaje.inicioProgramado) : null
  const ini0 = inicial(iniSugeridoMs ?? viaje.inicioReal, fechaJornada)
  const fin0 = inicial(viaje.finReal, fechaJornada)
  const [iniFecha, setIniFecha] = useState(ini0.fecha)
  const [iniHora, setIniHora] = useState(ini0.hora)
  const [finFecha, setFinFecha] = useState(fin0.fecha)
  const [finHora, setFinHora] = useState(fin0.hora)
  const [sugeridoConfirmado, setSugeridoConfirmado] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const iniActual = tiempoMs(viaje.inicioReal)
  const finActual = tiempoMs(viaje.finReal)
  const iniNuevo = fechaHoraUyAMs(iniFecha, iniHora)
  const finNuevo = fechaHoraUyAMs(finFecha, finHora)

  // Solo se mandan los campos que cambian; NULL = no tocar (contrato de la RPC).
  const quedaFinalizado = estado === 'finalizado'
  const pStatus = estado !== statusActual ? estado : null
  const pInicio = quedaFinalizado && iniNuevo !== null && iniNuevo !== iniActual ? iniNuevo : null
  const pFin = quedaFinalizado && finNuevo !== null && finNuevo !== finActual ? finNuevo : null
  const hayCambios = pStatus !== null || pInicio !== null || pFin !== null

  // Chequeos de forma; el servidor hace la validación real (ventana, futuro, etc.).
  let aviso: string | null = null
  if (quedaFinalizado) {
    if (iniNuevo === null || finNuevo === null) aviso = 'Un viaje finalizado necesita inicio y fin reales.'
    else if (finNuevo <= iniNuevo) aviso = 'El fin tiene que ser posterior al inicio.'
  }
  // El inicio sigue siendo el sugerido (no lo tocaron) y se va a mandar: pide confirmación explícita.
  const usaSugerido = iniSugeridoMs !== null && iniNuevo === iniSugeridoMs && pInicio !== null
  const motivoOk = motivo.trim().length >= MOTIVO_MIN
  const puedeGuardar = hayCambios && motivoOk && aviso === null && !guardando
    && (!usaSugerido || sugeridoConfirmado)

  const guardar = async () => {
    // El admin lo resuelve la RPC desde el JWT de la sesión; no se manda en el body.
    const token = sessionStorage.getItem('admin_token')
    if (!token) {
      setError('Sesión no encontrada.')
      return
    }

    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(`${SB_URL}/rest/v1/rpc/editar_viaje_panel`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_viaje_id: viaje.id,
          p_motivo: motivo.trim(),
          p_status: pStatus,
          p_inicio_real: pInicio,
          p_fin_real: pFin
        })
      })

      if (!res.ok) {
        let mensaje = 'Error al editar el viaje.'
        try {
          const body = await res.json()
          if (body?.message) mensaje = body.message
        } catch {}
        setError(mensaje)
        setGuardando(false)
        return
      }

      onEditado()
    } catch {
      setError('Error de conexión.')
      setGuardando(false)
    }
  }

  const etiquetaEstado: Record<string, string> = {
    en_curso: 'En curso', finalizado: 'Finalizado', cancelado: 'Cancelado'
  }
  const inputCls = 'bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#3b82f6] disabled:opacity-50'

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-[#1e2d45] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#e2e8f0]">✏️ Corregir viaje</h2>
          <div className="text-xs text-[#94a3b8] mt-1">
            {viaje.origen || '—'} → {viaje.destino || '—'} · jornada <span className="font-mono">{orderNumber}</span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-[#cbd5e1]">
            Queda registrado con tu usuario y el motivo. Si la jornada tiene totales de cierre, se marcan
            como desactualizados: no se recalculan.
          </p>

          {/* Estado */}
          <div>
            <label className="block text-xs font-medium text-[#cbd5e1] uppercase tracking-wider mb-1.5">
              Estado (actual: {etiquetaEstado[statusActual] || statusActual})
            </label>
            {esEnCurso ? (
              <div className="text-sm text-[#e2e8f0]">
                Pasa a <span className="font-semibold">Finalizado</span>
                <span className="text-xs text-[#94a3b8] ml-1">(un viaje en curso no se puede cancelar)</span>
              </div>
            ) : (
              <div className="flex gap-2">
                {(['finalizado', 'cancelado'] as Estado[]).map(op => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setEstado(op)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm border transition ${
                      estado === op
                        ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                        : 'bg-transparent border-[#1e2d45] text-[#cbd5e1] hover:border-[#3b82f6]'
                    }`}
                  >
                    {etiquetaEstado[op]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Horarios reales: solo cuentan si el viaje queda finalizado */}
          {quedaFinalizado && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-[#cbd5e1] uppercase tracking-wider">Horarios reales (hora Uruguay)</div>
              <div>
                <div className="text-xs text-[#94a3b8] mb-1">
                  Inicio
                  {usaSugerido && (
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      sugerido (horario programado)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input type="date" value={iniFecha} onChange={e => setIniFecha(e.target.value)}
                    className={`${inputCls} ${usaSugerido ? 'border-amber-500/50' : ''}`} />
                  <input type="time" value={iniHora} onChange={e => setIniHora(e.target.value)}
                    className={`${inputCls} ${usaSugerido ? 'border-amber-500/50' : ''}`} />
                </div>
                {usaSugerido && (
                  <label className="flex items-start gap-2 mt-2 text-xs text-amber-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sugeridoConfirmado}
                      onChange={e => setSugeridoConfirmado(e.target.checked)}
                      className="mt-0.5"
                    />
                    El viaje no tiene inicio real cargado. Confirmo que el inicio fue a la hora
                    programada (o cambialo arriba).
                  </label>
                )}
              </div>
              <div>
                <div className="text-xs text-[#94a3b8] mb-1">Fin</div>
                <div className="flex gap-2">
                  <input type="date" value={finFecha} onChange={e => setFinFecha(e.target.value)} className={inputCls} />
                  <input type="time" value={finHora} onChange={e => setFinHora(e.target.value)} className={inputCls} />
                </div>
              </div>
              {aviso && <div className="text-xs text-yellow-400">{aviso}</div>}
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-xs font-medium text-[#cbd5e1] uppercase tracking-wider mb-1.5">
              Motivo (obligatorio, {MOTIVO_MIN} caracteres o más)
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg p-3 text-white outline-none focus:border-[#3b82f6] resize-none"
              placeholder="¿Por qué se corrige este viaje?"
            />
          </div>

          {error && <div className="text-[#ef4444] text-sm">{error}</div>}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={guardando}
              className="bg-transparent border border-[#1e2d45] rounded-lg px-4 py-2 text-sm text-[#cbd5e1] hover:border-[#3b82f6] hover:text-[#3b82f6] transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={!puedeGuardar}
              title={!hayCambios ? 'No hay cambios' : undefined}
              className="bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? 'Guardando...' : 'Guardar corrección'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
