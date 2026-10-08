'use client'

import { useEffect, useState } from 'react'
import { fechaServidorUy } from '@/lib/horaServidor'
import {
  CON_QUIEN, RESULTADOS_LLAMADA, NOTA_MIN, type ConQuien, type ResultadoLlamada,
  notaValida, puedeAnular, textoBloqueo, formatearMotivo, fechaDelViaje, requiereLlamada
} from '@/lib/llamadaAnulacion'
import { parsearData, RESULTADO_SERVIDOR, type DataMensaje } from '@/lib/anulacion'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

const MOTIVO_MIN = 10  // mismo mínimo que anular_asignacion_panel

interface MensajeAsignacion {
  id: number
  para: string
  data?: unknown
}

interface ModalAnularAsignacionProps {
  mensaje: MensajeAsignacion
  onClose: () => void
  onAnulado: () => void
}

// Rechazos de anular_asignacion_panel (y de su núcleo, el de anular_viaje_panel) que el admin
// tiene que ver tal cual. VIAJE_EN_CURSO es el único que abre el protocolo de escalamiento
// (capa 2). Migración 20261006010000.
const RECHAZOS: Record<string, string> = {
  VIAJE_EN_CURSO: 'El viaje ya arrancó: no se puede anular desde el sistema.',
  VIAJE_FINALIZADO: 'El viaje ya terminó: no se puede anular.',
  JORNADA_CERRADA: 'La jornada del viaje está cerrada: no se puede anular.',
  JORNADA_BORRADA: 'La jornada del viaje está borrada.',
  VIAJE_NOT_FOUND: 'No se encontró el viaje en el servidor.',
  ITEM_AMBIGUO: 'El viaje aparece en más de un lugar. Contactá con soporte.',
  MENSAJE_NOT_FOUND: 'La asignación no existe (o es de otra empresa).',
  TIPO_INVALIDO: 'El mensaje no es una asignación.',
  DATA_INVALIDA: 'La asignación tiene los datos mal formados. Contactá con soporte.',
  MOTIVO_REQUERIDO: `El motivo tiene que tener al menos ${MOTIVO_MIN} caracteres.`
}

interface RespuestaAnulacion {
  ya_anulada?: boolean
  resultado?: string | null
  viaje_id?: string | null
}

export default function ModalAnularAsignacion({ mensaje, onClose, onAnulado }: ModalAnularAsignacionProps) {
  // Datos al abrir; se refrescan en el efecto de abajo (la lista puede tener 10 s de atraso).
  const [data, setData] = useState<DataMensaje>(() => parsearData(mensaje.data))
  // Sin sesión no hay nada que verificar (y anular() lo informa).
  const [cargando, setCargando] = useState(() => sessionStorage.getItem('admin_token') !== null)
  const [fechaServidor, setFechaServidor] = useState<string | null>(null)

  const [conQuien, setConQuien] = useState<ConQuien | null>(null)
  const [resultadoLlamada, setResultadoLlamada] = useState<ResultadoLlamada | null>(null)
  const [nota, setNota] = useState('')
  const [motivoLibre, setMotivoLibre] = useState('')

  const [anulando, setAnulando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rechazo, setRechazo] = useState<{ code: string; texto: string } | null>(null)
  const [hecho, setHecho] = useState<RespuestaAnulacion | null>(null)

  // Relee la asignación y, con la misma respuesta, la fecha de hoy según el servidor.
  useEffect(() => {
    const token = sessionStorage.getItem('admin_token')
    if (!token) return
    let vigente = true
    fetch(`${SB_URL}/rest/v1/mensajes?id=eq.${mensaje.id}&select=id,data`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        if (!vigente) return
        setFechaServidor(fechaServidorUy(res))
        if (res.ok) {
          const filas = await res.json() as Array<{ data?: unknown }>
          if (vigente && filas[0]) setData(parsearData(filas[0].data))
        }
      })
      .catch(() => { /* sin fecha del servidor: requiereLlamada pide el registro igual */ })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [mensaje.id])

  const viaje = (data.viaje || {}) as { origen?: string; destino?: string; horaSalida?: string; inicioProgramadoMs?: unknown; fechaViaje?: unknown }
  const yaAnulada = data.respuesta === 'anulado'
  const fechaViaje = fechaDelViaje(viaje)
  const pideLlamada = requiereLlamada(fechaViaje, fechaServidor)
  const bloqueo = pideLlamada ? textoBloqueo(resultadoLlamada) : null

  const formularioOk = pideLlamada
    ? conQuien !== null && puedeAnular(resultadoLlamada) && notaValida(nota)
    : motivoLibre.trim().length >= MOTIVO_MIN
  const puedeEnviar = formularioOk && !cargando && !anulando && !yaAnulada && rechazo === null && hecho === null

  const anular = async () => {
    const token = sessionStorage.getItem('admin_token')
    if (!token) {
      setError('Sesión no encontrada.')
      return
    }
    const motivo = pideLlamada && conQuien && resultadoLlamada
      ? formatearMotivo(conQuien, resultadoLlamada, nota)
      : motivoLibre.trim()
    setAnulando(true)
    setError(null)

    try {
      // El servidor elige el camino (viaje por data.viajeId o por el id ASG-<n>-*), anula,
      // marca la asignación y manda el cancelar_viaje al celular, todo en una transacción.
      const res = await fetch(`${SB_URL}/rest/v1/rpc/anular_asignacion_panel`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_mensaje_id: String(mensaje.id), p_motivo: motivo })
      })

      if (!res.ok) {
        let code = ''
        let mensajeServidor = ''
        try {
          const body = await res.json()
          code = body?.code || ''
          mensajeServidor = body?.message || ''
        } catch {}
        if (RECHAZOS[code]) {
          setRechazo({ code, texto: RECHAZOS[code] })
        } else {
          setError(mensajeServidor || 'Error al anular la asignación.')
        }
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

  // Después de anular, el modal muestra lo que hizo el servidor; recién al cerrar se recarga
  // la lista.
  const cerrar = () => { if (hecho) onAnulado(); else onClose() }

  const opcion = (activa: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium border transition ${activa
      ? 'bg-[#3b82f6] text-white border-[#3b82f6]'
      : 'bg-[#1c2537] text-[#94a3b8] border-[#1e2d45] hover:border-[#3b82f6]/50'}`

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={cerrar}>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-[#1e2d45] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#e2e8f0]">🚫 Anular asignación</h2>
          <div className="text-xs text-[#94a3b8] mt-1">
            {viaje.origen || '—'} → {viaje.destino || '—'}
            {viaje.horaSalida ? ` · ${viaje.horaSalida}` : ''}
            {fechaViaje ? ` · ${fechaViaje.slice(8, 10)}/${fechaViaje.slice(5, 7)}` : ''}
            {' '}· chofer <span className="font-mono">{mensaje.para}</span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {hecho ? (
            <div className="text-sm text-[#86efac] bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg px-4 py-3 space-y-1">
              <div className="font-semibold">
                {hecho.ya_anulada ? 'La asignación ya estaba anulada.' : 'Asignación anulada.'}
              </div>
              <div className="text-[#cbd5e1]">
                {(hecho.resultado && RESULTADO_SERVIDOR[hecho.resultado]) || hecho.resultado || '—'}
              </div>
              {hecho.viaje_id && (
                <div className="text-xs text-[#94a3b8]">Viaje <span className="font-mono">{hecho.viaje_id}</span></div>
              )}
              <div className="text-xs text-[#94a3b8]">
                La confirmación del celular aparece en la lista de mensajes.
              </div>
            </div>
          ) : rechazo ? (
            <div className="space-y-4">
              <div className="text-sm text-[#fca5a5] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-4 py-3">
                {rechazo.texto}
              </div>
              {rechazo.code === 'VIAJE_EN_CURSO' && (
                <div className="space-y-2">
                  <p className="text-xs text-[#cbd5e1]">
                    Para frenar un viaje en curso hay que seguir el protocolo de escalamiento
                    (chofer → terminal de origen → inspector), con registro del resultado.
                  </p>
                  {/* Capa 2 (escalamiento) todavía no implementada: el botón queda visible
                      pero deshabilitado hasta que existan los contactos y el registro. */}
                  <button
                    disabled
                    title="Disponible cuando esté el protocolo de escalamiento (contactos y registro)"
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Iniciar protocolo (próximamente)
                  </button>
                </div>
              )}
            </div>
          ) : cargando ? (
            <p className="text-xs text-[#94a3b8]">Verificando la asignación…</p>
          ) : yaAnulada ? (
            <p className="text-sm text-[#cbd5e1]">Esta asignación ya está anulada.</p>
          ) : pideLlamada ? (
            <>
              <p className="text-xs text-[#fcd34d] bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg px-3 py-2">
                Viaje de hoy o anterior: pudo haber iniciado sin señal. Antes de anular, llamá y
                registrá el resultado. Solo se anula si el viaje no inició.
              </p>
              <div>
                <div className="text-xs font-medium text-[#cbd5e1] uppercase tracking-wider mb-1.5">Llamada con</div>
                <div className="flex gap-2">
                  {CON_QUIEN.map(c => (
                    <button key={c} type="button" onClick={() => setConQuien(c)} className={opcion(conQuien === c)}>
                      {c === 'chofer' ? 'Chofer' : 'Guarda'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-[#cbd5e1] uppercase tracking-wider mb-1.5">Resultado</div>
                <div className="flex gap-2 flex-wrap">
                  {RESULTADOS_LLAMADA.map(r => (
                    <button key={r} type="button" onClick={() => setResultadoLlamada(r)} className={opcion(resultadoLlamada === r)}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {bloqueo && (
                <div className="text-sm text-[#fca5a5] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg px-4 py-3">
                  {bloqueo}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#cbd5e1] uppercase tracking-wider mb-1.5">
                  Nota (mínimo {NOTA_MIN} caracteres)
                </label>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={3}
                  className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#3b82f6]"
                  placeholder="Ej.: el chofer confirma que sigue en la terminal, coche sin salir"
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-[#cbd5e1]">
                Viaje de un día futuro: se anula en el servidor y el chofer recibe un aviso.
                Queda registrado con tu usuario y el motivo.
              </p>
              <div>
                <label className="block text-xs font-medium text-[#cbd5e1] uppercase tracking-wider mb-1.5">
                  Motivo (mínimo {MOTIVO_MIN} caracteres)
                </label>
                <textarea
                  value={motivoLibre}
                  onChange={(e) => setMotivoLibre(e.target.value)}
                  rows={3}
                  className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#3b82f6]"
                  placeholder="Ej.: cambio de diagrama por falta de coche"
                />
              </div>
            </>
          )}

          {error && (
            <div className="text-sm text-[#fca5a5]">{error}</div>
          )}
        </div>

        <div className="border-t border-[#1e2d45] px-6 py-4 flex justify-end gap-2">
          <button
            onClick={cerrar}
            className="px-4 py-2 rounded-lg text-sm text-[#94a3b8] hover:bg-[#1c2537] transition"
          >
            {hecho || rechazo || yaAnulada ? 'Cerrar' : 'Cancelar'}
          </button>
          {!hecho && !rechazo && !yaAnulada && (
            <button
              onClick={anular}
              disabled={!puedeEnviar}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#ef4444] text-white hover:bg-[#dc2626] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {anulando ? 'Anulando…' : 'Anular'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
