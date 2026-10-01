// Fechas y horas en hora de Montevideo, sea cual sea la zona del navegador.
// Uruguay no tiene horario de verano desde 2015: UTC-3 fijo.

const TZ = 'America/Montevideo'
const OFFSET_UY = '-03:00'

/** Fecha de hoy en Montevideo, 'YYYY-MM-DD' (misma regla que private.fecha_uy). */
export function hoyUy(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

/** inicioReal/finReal a epoch ms: número > 0 tal cual, texto ISO viejo parseado; si no, null. */
export function tiempoMs(v: unknown): number | null {
  if (typeof v === 'number') return v > 0 ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const ms = Date.parse(v)
    return Number.isNaN(ms) ? null : ms
  }
  return null
}

/** epoch ms -> { fecha: 'YYYY-MM-DD', hora: 'HH:mm' } en Montevideo. */
export function msAFechaHoraUy(ms: number): { fecha: string; hora: string } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(ms))
  const p = (t: string) => partes.find(x => x.type === t)?.value ?? ''
  return { fecha: `${p('year')}-${p('month')}-${p('day')}`, hora: `${p('hour')}:${p('minute')}` }
}

/** 'YYYY-MM-DD' + 'HH:mm' en Montevideo -> epoch ms (null si falta algo o es inválido). */
export function fechaHoraUyAMs(fecha: string, hora: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) return null
  const ms = Date.parse(`${fecha}T${hora}:00${OFFSET_UY}`)
  return Number.isNaN(ms) ? null : ms
}

/** Para mostrar: 'HH:mm', o 'DD/MM HH:mm' si cae en otro día que `fechaJornada`. */
export function formatearTiempoUy(v: unknown, fechaJornada?: string): string {
  const ms = tiempoMs(v)
  if (ms === null) return '—'
  const { fecha, hora } = msAFechaHoraUy(ms)
  if (fechaJornada && fecha !== fechaJornada) return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)} ${hora}`
  return hora
}
