// Registro de la llamada antes de anular una asignación (bug 1 3b.2, paso 4 H; decisión
// 07/10). Un viaje de hoy o anterior pudo haber arrancado sin señal ("Iniciar ahora" antes de
// la hora oficial): solo se anula si la llamada confirma que NO inició.
//
// Va como texto en el motivo de anular_asignacion_panel, con formato fijo:
//   [LLAMADA <chofer|guarda> | <no inició|inició|no atendió>] <nota>
// La tabla propia del registro y la exigencia del lado del servidor quedan para la capa 2.

import { msAFechaHoraUy } from './horaUy'

export type ConQuien = 'chofer' | 'guarda'
export type ResultadoLlamada = 'no inició' | 'inició' | 'no atendió'

export const CON_QUIEN: ConQuien[] = ['chofer', 'guarda']
export const RESULTADOS_LLAMADA: ResultadoLlamada[] = ['no inició', 'inició', 'no atendió']

export const NOTA_MIN = 10

export function notaValida(nota: string): boolean {
  return nota.trim().length >= NOTA_MIN
}

export function puedeAnular(resultado: ResultadoLlamada | null): boolean {
  return resultado === 'no inició'
}

/** Por qué no se habilita Anular con ese resultado; null si se puede. */
export function textoBloqueo(resultado: ResultadoLlamada | null): string | null {
  if (resultado === 'inició')
    return 'El viaje inició: no se anula. Un viaje en curso lo resuelve Tránsito.'
  if (resultado === 'no atendió')
    return 'Sin confirmación telefónica no se anula: el viaje pudo haber arrancado sin señal.'
  return null
}

export function formatearMotivo(conQuien: ConQuien, resultado: ResultadoLlamada, nota: string): string {
  return `[LLAMADA ${conQuien} | ${resultado}] ${nota.trim()}`
}

const PATRON = /^\[LLAMADA (chofer|guarda) \| (no inició|inició|no atendió)\] ([\s\S]*)$/

/** Lee un motivo con registro de llamada; null si el motivo es libre. */
export function parsearMotivo(motivo: string): { conQuien: ConQuien; resultado: ResultadoLlamada; nota: string } | null {
  const m = PATRON.exec(motivo.trim())
  if (!m) return null
  return { conQuien: m[1] as ConQuien, resultado: m[2] as ResultadoLlamada, nota: m[3] }
}

/** Fecha del viaje de una asignación, 'YYYY-MM-DD' en Montevideo; null si no se puede saber. */
export function fechaDelViaje(viaje: { inicioProgramadoMs?: unknown; fechaViaje?: unknown } | undefined): string | null {
  if (!viaje) return null
  if (typeof viaje.inicioProgramadoMs === 'number' && viaje.inicioProgramadoMs > 0)
    return msAFechaHoraUy(viaje.inicioProgramadoMs).fecha
  if (typeof viaje.fechaViaje === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(viaje.fechaViaje))
    return viaje.fechaViaje
  return null
}

/**
 * El registro se pide para todo viaje con fecha de HOY O ANTERIOR (no futura) según el
 * servidor: cubre el viaje nocturno que cruza la medianoche. Sin alguna de las dos fechas se
 * pide igual (ante la duda, se protege).
 */
export function requiereLlamada(fechaViaje: string | null, fechaServidor: string | null): boolean {
  if (!fechaViaje || !fechaServidor) return true
  return fechaViaje <= fechaServidor
}
