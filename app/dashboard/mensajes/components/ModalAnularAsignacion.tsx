'use client'

import { useState } from 'react'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

const MOTIVO_MIN = 10  // mismo mínimo que anular_viaje_panel

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

// Rechazos de anular_viaje_panel que el admin tiene que ver tal cual. VIAJE_EN_CURSO es el
// único que abre el protocolo de escalamiento (capa 2).
const RECHAZOS: Record<string, string> = {
  VIAJE_EN_CURSO: 'El viaje ya arrancó: no se puede anular desde el sistema.',
  VIAJE_FINALIZADO: 'El viaje ya terminó: no se puede anular.',
  JORNADA_CERRADA: 'La jornada del viaje está cerrada: no se puede anular.',
  JORNADA_BORRADA: 'La jornada del viaje está borrada.',
  VIAJE_NOT_FOUND: 'No se encontró el viaje en el servidor.',
  ITEM_AMBIGUO: 'El viaje aparece en más de una jornada. Contactá con soporte.',
  MOTIVO_REQUERIDO: `El motivo tiene que tener al menos ${MOTIVO_MIN} caracteres.`
}

type DataMensaje = Record<string, unknown>

function parsearData(data: unknown): DataMensaje {
  if (typeof data === 'string') { try { return JSON.parse(data) as DataMensaje } catch { return {} } }
  return (data as DataMensaje) || {}
}

export default function ModalAnularAsignacion({ mensaje, onClose, onAnulado }: ModalAnularAsignacionProps) {
  const dataOriginal = parsearData(mensaje.data)
  const viajeId = typeof dataOriginal.viajeId === 'string' ? dataOriginal.viajeId : undefined
  const viaje = (dataOriginal.viaje || {}) as { origen?: string; destino?: string; horaSalida?: string }

  const [motivo, setMotivo] = useState('')
  const [anulando, setAnulando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rechazo, setRechazo] = useState<{ code: string; texto: string } | null>(null)

  const motivoOk = motivo.trim().length >= MOTIVO_MIN
  const puedeAnular = motivoOk && !anulando && rechazo === null

  // Marca la asignación como anulada en el panel (el chofer no la procesa más si
  // todavía no la leyó). Con viajeId, el aviso al chofer (cancelar_viaje) ya lo
  // insertó la RPC; acá no se manda otro.
  const marcarAsignacionAnulada = async (token: string, extra: DataMensaje) => {
    const res = await fetch(`${SB_URL}/rest/v1/mensajes?id=eq.${mensaje.id}`, {
      method: 'PATCH',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        leido: true,
        data: {
          ...dataOriginal,
          respuesta: 'anulado',
          anuladoAt: new Date().toISOString(),
          anuladoPor: sessionStorage.getItem('admin_email'),
          anuladoMotivo: motivo.trim(),
          ...extra
        }
      })
    })
    return res.ok
  }

  const anular = async () => {
    const token = sessionStorage.getItem('admin_token')
    if (!token) {
      setError('Sesión no encontrada.')
      return
    }
    setAnulando(true)
    setError(null)

    try {
      if (!viajeId) {
        // El celu todavía no creó el viaje (asignación sin procesar): no hay nada que
        // anular en el servidor. Se anula el mensaje para que el celu no lo cree, y se
        // avisa al chofer.
        const okPatch = await marcarAsignacionAnulada(token, { anuladoSinViaje: true })
        if (!okPatch) {
          setError('No se pudo marcar la asignación como anulada.')
          setAnulando(false)
          return
        }
        await fetch(`${SB_URL}/rest/v1/mensajes`, {
          method: 'POST',
          headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({
            empresa_id: 'cot', de: 'admin', para: mensaje.para, tipo: 'urgente',
            texto: '🚫 Una asignación de viaje fue anulada por tránsito. Consultá con tu despachador.', leido: false
          })
        })
        onAnulado()
        return
      }

      // El viaje existe: lo anula el servidor (P -> C, auditoría y aviso al chofer en una
      // sola transacción). El admin lo resuelve la RPC desde el JWT; no va en el body.
      const res = await fetch(`${SB_URL}/rest/v1/rpc/anular_viaje_panel`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_viaje_id: viajeId, p_motivo: motivo.trim() })
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
          setError(mensajeServidor || 'Error al anular el viaje.')
        }
        setAnulando(false)
        return
      }

      const r = await res.json()
      // ya_cancelado: lo había cancelado otro admin o el propio chofer; igual se cierra la
      // asignación en el panel.
      await marcarAsignacionAnulada(token, {
        edicionId: r?.edicion_id ?? null,
        mensajeCancelacionId: r?.mensaje_id ?? null,
        yaCancelado: r?.ya_cancelado === true
      })
      onAnulado()
    } catch {
      setError('Error de conexión.')
      setAnulando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-[#1e2d45] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#e2e8f0]">🚫 Anular asignación</h2>
          <div className="text-xs text-[#94a3b8] mt-1">
            {viaje.origen || '—'} → {viaje.destino || '—'}
            {viaje.horaSalida ? ` · ${viaje.horaSalida}` : ''} · chofer <span className="font-mono">{mensaje.para}</span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {rechazo ? (
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
          ) : (
            <>
              <p className="text-xs text-[#cbd5e1]">
                {viajeId
                  ? 'El viaje se anula en el servidor y el chofer recibe un aviso. Queda registrado con tu usuario y el motivo. Si el viaje ya arrancó, no se anula y se te avisa.'
                  : 'El celular del chofer todavía no tomó esta asignación: se anula el mensaje y se le avisa al chofer.'}
              </p>
              <div>
                <label className="block text-xs font-medium text-[#cbd5e1] uppercase tracking-wider mb-1.5">
                  Motivo (mínimo {MOTIVO_MIN} caracteres)
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
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
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-[#94a3b8] hover:bg-[#1c2537] transition"
          >
            {rechazo ? 'Cerrar' : 'Cancelar'}
          </button>
          {!rechazo && (
            <button
              onClick={anular}
              disabled={!puedeAnular}
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
