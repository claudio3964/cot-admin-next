'use client'

import { useEffect, useState } from 'react'
import { parsearData, type DataMensaje } from '@/lib/anulacion'
import {
  MOTIVO_MIN_GUARDIA, RECHAZOS_ANULACION_GUARDIA, RESULTADO_ANULACION_GUARDIA,
  buscarGuardiaDeAsignacion, formatearInicioGuardia, horasEnCurso, kmDeGuardia,
  type GuardiaEncontrada
} from '@/lib/guardias'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

interface MensajeGuardia {
  id: number
  para: string
  data?: unknown
}

interface ModalAnularGuardiaProps {
  mensaje: MensajeGuardia
  onClose: () => void
  onAnulado: () => void
}

interface RespuestaAnulacion {
  ya_anulada?: boolean
  resultado?: string | null
  guardia_id?: string | null
  estado_anterior?: string | null
}

// Anular una guardia asignada (programada o en curso) con anular_guardia_panel: el servidor
// busca la guardia, la cancela, audita, marca la asignación y avisa al celular, todo en una
// transacción. Reemplaza el PATCH + cancelar_guardia que armaba el panel (y que dependía de
// que el celular hubiera enlazado la guardia). Migración 20261010010000.
export default function ModalAnularGuardia({ mensaje, onClose, onAnulado }: ModalAnularGuardiaProps) {
  const [data, setData] = useState<DataMensaje>(() => parsearData(mensaje.data))
  const [encontrada, setEncontrada] = useState<GuardiaEncontrada | null>(null)
  const [cargando, setCargando] = useState(() => sessionStorage.getItem('admin_token') !== null)
  const [motivo, setMotivo] = useState('')
  const [anulando, setAnulando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rechazo, setRechazo] = useState<string | null>(null)
  const [hecho, setHecho] = useState<RespuestaAnulacion | null>(null)

  // Relee la asignación (la lista puede tener 10 s de atraso) y busca la guardia en el servidor.
  useEffect(() => {
    const token = sessionStorage.getItem('admin_token')
    if (!token) return
    let vigente = true
    const cargar = async () => {
      try {
        const res = await fetch(`${SB_URL}/rest/v1/mensajes?id=eq.${mensaje.id}&select=id,data`, {
          headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` }
        })
        let actual = parsearData(mensaje.data)
        if (res.ok) {
          const filas = await res.json() as Array<{ data?: unknown }>
          if (filas[0]) actual = parsearData(filas[0].data)
        }
        const guardiaId = typeof actual.guardiaId === 'string' ? actual.guardiaId : undefined
        const g = await buscarGuardiaDeAsignacion(mensaje.para, mensaje.id, guardiaId, token)
        if (!vigente) return
        setData(actual)
        setEncontrada(g)
      } catch {
        // Sin la guardia a la vista se puede anular igual: el servidor decide.
      } finally {
        if (vigente) setCargando(false)
      }
    }
    cargar()
    return () => { vigente = false }
  }, [mensaje.id, mensaje.para, mensaje.data])

  const asignada = (data.guardia || {}) as { horaInicio?: string; tipo?: string; inicioMs?: unknown }
  const yaAnulada = data.respuesta === 'anulado'
  const guardia = encontrada?.guardia
  const estado = guardia?.status
  const horas = guardia ? horasEnCurso(guardia) : null
  const cuando = typeof guardia?.inicioMs === 'number'
    ? formatearInicioGuardia(guardia.inicioMs)
    : typeof asignada.inicioMs === 'number'
      ? formatearInicioGuardia(asignada.inicioMs)
      : (guardia?.inicio || asignada.horaInicio || '—')

  const noAnulable = estado === 'finalizada'
  const puedeEnviar = motivo.trim().length >= MOTIVO_MIN_GUARDIA &&
    !cargando && !anulando && !yaAnulada && !noAnulable && rechazo === null && hecho === null

  const anular = async () => {
    const token = sessionStorage.getItem('admin_token')
    if (!token) { setError('Sesión no encontrada.'); return }
    setAnulando(true)
    setError(null)
    try {
      const res = await fetch(`${SB_URL}/rest/v1/rpc/anular_guardia_panel`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_mensaje_id: String(mensaje.id), p_motivo: motivo.trim() })
      })
      if (!res.ok) {
        let code = ''
        let mensajeServidor = ''
        try {
          const body = await res.json()
          code = body?.code || ''
          mensajeServidor = body?.message || ''
        } catch {}
        if (RECHAZOS_ANULACION_GUARDIA[code]) setRechazo(RECHAZOS_ANULACION_GUARDIA[code])
        else setError(mensajeServidor || 'Error al anular la guardia.')
        setAnulando(false)
        return
      }
      setHecho(await res.json() as RespuestaAnulacion)
      setAnulando(false)
    } catch {
      setError('Error de conexión.')
      setAnulando(false)
    }
  }

  // Después de anular, el modal muestra lo que hizo el servidor; recién al cerrar se recarga la lista.
  const cerrar = () => { if (hecho) onAnulado(); else onClose() }
  const terminado = hecho !== null || rechazo !== null || yaAnulada || noAnulable

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={cerrar}>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-[#1e2d45] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#e2e8f0]">🚫 Anular guardia</h2>
          <div className="text-xs text-[#94a3b8] mt-1">
            Guardia {(guardia?.type || asignada.tipo) === 'especial' ? 'especial' : 'común'} · {cuando}
            {' '}· chofer <span className="font-mono">{mensaje.para}</span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {hecho ? (
            <div className="text-sm text-[#86efac] bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg px-4 py-3 space-y-1">
              <div className="font-semibold">
                {hecho.ya_anulada ? 'La asignación ya estaba anulada.' : 'Guardia anulada.'}
              </div>
              <div className="text-[#cbd5e1]">
                {(hecho.resultado && RESULTADO_ANULACION_GUARDIA[hecho.resultado]) || hecho.resultado || '—'}
              </div>
              {hecho.estado_anterior === 'en_curso' && (
                <div className="text-xs text-[#fcd34d]">Estaba en curso: las horas trabajadas no se pagan.</div>
              )}
              {hecho.guardia_id && (
                <div className="text-xs text-[#94a3b8]">Guardia <span className="font-mono">{hecho.guardia_id}</span></div>
              )}
            </div>
          ) : rechazo ? (
            <div className="text-sm text-[#fca5a5] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-4 py-3">
              {rechazo}
            </div>
          ) : cargando ? (
            <p className="text-xs text-[#94a3b8]">Verificando la guardia…</p>
          ) : yaAnulada ? (
            <p className="text-sm text-[#cbd5e1]">Esta asignación ya está anulada.</p>
          ) : noAnulable ? (
            <div className="text-sm text-[#fca5a5] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-4 py-3">
              La guardia ya terminó ({guardia?.inicio || '—'}–{guardia?.fin || '—'}): no se puede anular.
            </div>
          ) : (
            <>
              {estado === 'en_curso' ? (
                <div className="text-sm text-[#fcd34d] bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg px-4 py-3 space-y-1">
                  <div className="font-semibold">⚠️ La guardia está EN CURSO.</div>
                  {horas !== null && guardia ? (
                    <div>
                      Lleva {Math.floor(horas)} h {Math.round((horas % 1) * 60)} min
                      (≈ {kmDeGuardia(guardia, horas).toFixed(1)} km). Si la anulás,
                      <span className="font-semibold"> esas horas NO se pagan.</span>
                    </div>
                  ) : (
                    <div>
                      Empezó a las {guardia?.inicio || '—'}. Si la anulás,
                      <span className="font-semibold"> las horas trabajadas NO se pagan.</span>
                    </div>
                  )}
                  <div className="text-xs text-[#cbd5e1]">
                    Si el chofer la trabajó y solo tiene que terminar, pedile que la finalice él.
                  </div>
                </div>
              ) : estado === 'programada' ? (
                <p className="text-xs text-[#cbd5e1]">
                  Guardia programada, todavía no empezó: se anula en el servidor y el chofer recibe
                  un aviso. Queda registrado con tu usuario y el motivo.
                </p>
              ) : estado === 'cancelado' ? (
                <p className="text-xs text-[#cbd5e1]">
                  La guardia ya figura cancelada en el servidor. Se marca la asignación como anulada
                  y se le avisa igual al celular.
                </p>
              ) : (
                <p className="text-xs text-[#cbd5e1]">
                  El celular del chofer todavía no tomó esta asignación: se anula y se le avisa. Si
                  llegó a crearla, la cancela.
                </p>
              )}
              <div>
                <label className="block text-xs font-medium text-[#cbd5e1] uppercase tracking-wider mb-1.5">
                  Motivo (mínimo {MOTIVO_MIN_GUARDIA} caracteres)
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#3b82f6]"
                  placeholder="Ej.: se asignó al chofer equivocado, se reasigna"
                />
              </div>
            </>
          )}

          {error && <div className="text-sm text-[#fca5a5]">{error}</div>}
        </div>

        <div className="border-t border-[#1e2d45] px-6 py-4 flex justify-end gap-2">
          <button onClick={cerrar} className="px-4 py-2 rounded-lg text-sm text-[#94a3b8] hover:bg-[#1c2537] transition">
            {terminado ? 'Cerrar' : 'Cancelar'}
          </button>
          {!terminado && (
            <button
              onClick={anular}
              disabled={!puedeEnviar}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#ef4444] text-white hover:bg-[#dc2626] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {anulando ? 'Anulando…' : estado === 'en_curso' ? 'Anular igual' : 'Anular'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
