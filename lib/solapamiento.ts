// Port 1:1 de SolapamientoValidator.kt (repo Android, com.driverlog.app.data).
// Una sola regla, dos lados — no cambiar la lógica acá sin cambiarla también allá.

export interface ViajeParaConflicto {
  id: string
  status: string
  inicioProgramado: number
  inicioReal: number | null
  finReal: number | null
}

const DURACION_VIAJE_DEFAULT_MS = 3 * 60 * 60 * 1000 // 3 horas

// Solapamiento estricto: nuevaInicio < existeFin && existeInicio < nuevaFin (el borde exacto NO
// solapa). Ignora cancelados. Si está finalizado usa finReal; si no, existeInicio + 3h.
// Blindaje 0L: inicioReal/finReal pueden venir en 0 como sentinel de "no seteado" — tratarlo
// como 0 real mediría solapamiento desde epoch 1970.
export function encontrarConflicto(
  nuevaInicio: number,
  nuevaFin: number,
  existentes: ViajeParaConflicto[],
  excluirId?: string
): ViajeParaConflicto | null {
  for (const viaje of existentes) {
    if (viaje.id === excluirId) continue
    if (viaje.status === 'cancelado') continue

    const existeInicio = (viaje.inicioReal && viaje.inicioReal > 0) ? viaje.inicioReal : viaje.inicioProgramado
    const existeFin = viaje.status === 'finalizado'
      ? ((viaje.finReal && viaje.finReal > 0) ? viaje.finReal : existeInicio + DURACION_VIAJE_DEFAULT_MS)
      : existeInicio + DURACION_VIAJE_DEFAULT_MS

    if (nuevaInicio < existeFin && existeInicio < nuevaFin) return viaje
  }
  return null
}

function parsearHoraMinuto(horaInicio: string): [number, number] | null {
  const partes = horaInicio.trim().split(':')
  if (partes.length !== 2) return null
  const hora = Number(partes[0].trim())
  const minuto = Number(partes[1].trim())
  if (!Number.isInteger(hora) || !Number.isInteger(minuto)) return null
  if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) return null
  return [hora, minuto]
}

// Port 1:1 de SolapamientoValidator.parsearInicioGuardiaMs (Kotlin): interpreta "HH:mm"
// como instante de HOY respecto de `ahora`; si cae en el futuro, se asume que arrancó AYER
// (cruce de medianoche). A propósito NO incluye la parte de horaInicioGuardiaValida (validar
// que la hora sea "reciente") -- esa validación está calibrada para declarar un inicio ahora
// mismo, no para editar una guardia que puede llevar horas activa (Caso B del panel).
export function parsearInicioGuardiaMs(horaInicio: string, ahora: number = Date.now()): number | null {
  const parsed = parsearHoraMinuto(horaInicio)
  if (!parsed) return null
  const [hora, minuto] = parsed
  const base = new Date(ahora)
  let inicioMs = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hora, minuto, 0, 0).getTime()
  if (inicioMs > ahora) inicioMs -= 24 * 60 * 60 * 1000
  return inicioMs
}
