// Seguimiento de una anulación de asignación (bug 1 3b.2, paso 4 H). anular_asignacion_panel
// marca la asignación (data.anulacionResultado, data.mensajeCancelacionId) y manda un
// cancelar_viaje al chofer; el celular lo confirma con responder_mensaje
// (data.confirmacion = {at: epoch ms del servidor, resultado}). Migración 20261006010000.

export type DataMensaje = Record<string, unknown>

export function parsearData(data: unknown): DataMensaje {
  if (typeof data === 'string') {
    try { return (JSON.parse(data) as DataMensaje) || {} } catch { return {} }
  }
  return data && typeof data === 'object' ? (data as DataMensaje) : {}
}

/** Lo que hizo el servidor al anular (anular_asignacion_panel -> resultado). */
export const RESULTADO_SERVIDOR: Record<string, string> = {
  cancelado: 'El viaje quedó cancelado en el servidor. Se le avisó al celular del chofer.',
  ya_cancelado: 'El viaje ya estaba cancelado en el servidor. Se le avisó igual al celular del chofer.',
  sin_viaje_en_servidor:
    'El viaje no estaba en el servidor (el celular todavía no lo había cargado). Se le avisó al celular: si lo tiene, lo cancela.'
}

/** Lo que encontró e hizo el celular (confirmación del cancelar_viaje). */
export const RESULTADO_CELULAR: Record<string, string> = {
  cancelado: 'cancelado en el celular',
  ya_cancelado: 'ya estaba cancelado en el celular',
  no_esta_en_celu: 'el viaje no estaba en el celular',
  finalizado: 'el viaje ya estaba finalizado en el celular: no se tocó',
  cancelado_en_curso: 'Anulación sobre viaje en curso, requiere revisión de Tránsito'
}

export type EstadoAnulacion =
  /** Anulación anterior a este seguimiento (sin mensaje de cancelación enlazado). */
  | { tipo: 'sin_seguimiento' }
  /** El mensaje de cancelación no está en la lista cargada. */
  | { tipo: 'desconocido' }
  /** El celular todavía no tomó el cancelar_viaje. */
  | { tipo: 'pendiente' }
  /** Leído sin confirmación: APK anterior al paso 4, o la confirmación fue rechazada. */
  | { tipo: 'leido_sin_confirmar' }
  | { tipo: 'confirmado'; resultado: string; at: number | null; nivel: 'ok' | 'atencion' | 'revision' }

export interface MensajeCancelacion {
  leido: boolean
  data?: unknown
}

export function estadoAnulacion(
  asignacionData: DataMensaje,
  cancelacion: MensajeCancelacion | null | undefined
): EstadoAnulacion {
  if (asignacionData.mensajeCancelacionId == null) return { tipo: 'sin_seguimiento' }
  if (!cancelacion) return { tipo: 'desconocido' }
  const confirmacion = parsearData(cancelacion.data).confirmacion as { at?: unknown; resultado?: unknown } | undefined
  if (confirmacion && typeof confirmacion.resultado === 'string') {
    const resultado = confirmacion.resultado
    const nivel = resultado === 'cancelado_en_curso' ? 'revision'
      : resultado === 'finalizado' ? 'atencion'
      : 'ok'
    return { tipo: 'confirmado', resultado, at: typeof confirmacion.at === 'number' ? confirmacion.at : null, nivel }
  }
  return cancelacion.leido ? { tipo: 'leido_sin_confirmar' } : { tipo: 'pendiente' }
}

/** Id del mensaje de cancelación de una asignación anulada, o null. */
export function idMensajeCancelacion(asignacionData: DataMensaje): number | null {
  const v = asignacionData.mensajeCancelacionId
  if (typeof v === 'number') return v
  if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v)
  return null
}
