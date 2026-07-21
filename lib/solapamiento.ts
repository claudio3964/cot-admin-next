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
