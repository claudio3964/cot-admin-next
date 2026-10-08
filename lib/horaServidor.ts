// "Hoy" según el reloj del SERVIDOR, no el del navegador (un panel con el reloj corrido ya
// pasó: incidente del 28/09). Sale del header Date de cualquier respuesta REST de Supabase,
// que el CORS de Supabase expone (access-control-expose-headers incluye Date; verificado
// 07/10).

import { msAFechaHoraUy } from './horaUy'

/** Fecha de hoy en Montevideo, 'YYYY-MM-DD', según el header Date de [res]; null si no vino. */
export function fechaServidorUy(res: Response): string | null {
  const header = res.headers.get('date')
  if (!header) return null
  const ms = Date.parse(header)
  return Number.isNaN(ms) ? null : msAFechaHoraUy(ms).fecha
}
