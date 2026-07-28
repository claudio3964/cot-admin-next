// Mismo criterio que ContinuidadValidator.kt (repo Android) y el chequeo de
// obtener_ultimo_viaje_chofer.sql usado en mensajes/page.tsx al crear una
// asignación nueva (trim + case-insensitive contra el destino del último
// viaje). Acá se aplica localmente sobre travels ya cargados en vez de llamar
// de nuevo a esa RPC: en edición (ModalEditarAsignacion) el viaje que se está
// editando ya existe en jornadas.data.travels[] y suele ser el de
// inicioProgramado más alto del chofer, así que la RPC terminaría
// comparándolo contra sí mismo. excluirId evita ese caso.

export interface ViajeParaContinuidad {
  id: string
  destino?: string
  status?: string
  inicioProgramado: number
}

export function encontrarUltimoDestino(
  travels: ViajeParaContinuidad[],
  excluirId?: string
): string | undefined {
  let ultimo: ViajeParaContinuidad | undefined
  for (const viaje of travels) {
    if (viaje.id === excluirId) continue
    if (viaje.status === 'cancelado') continue
    if (!viaje.destino) continue
    if (!ultimo || viaje.inicioProgramado > ultimo.inicioProgramado) ultimo = viaje
  }
  return ultimo?.destino
}
