// Guardia programada (fase B, paso 5). Reglas espejo de TransicionesGuardia (:shared de la
// app) y de la migración 20261010010000_guardia_programada_paso2.sql:
//   - estados: programada | en_curso | finalizada | cancelado;
//   - un chofer tiene como máximo UNA guardia viva (programada o en curso);
//   - las programadas no se editan: se anulan y se reasignan;
//   - inicioMs (epoch ms) viaja junto con "HH:mm": el panel lo arma con el día elegido.

import { buscarJornadasDelChofer } from './jornadas'
import { fechaHoraUyAMs, hoyUy, msAFechaHoraUy } from './horaUy'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

export const MOTIVO_MIN_GUARDIA = 10  // mismo mínimo que anular_guardia_panel

export type DiaGuardia = 'hoy' | 'manana'

export interface GuardiaServidor {
  id: string
  inicio?: string
  fin?: string
  type?: string
  status?: string
  hours?: number
  inicioMs?: number
  asignacionId?: number | string
}

export function guardiaViva(status: string | undefined): boolean {
  return status === 'programada' || status === 'en_curso'
}

/** 'YYYY-MM-DD' + n días (aritmética de calendario, sin zona). */
function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10)
}

/**
 * Inicio con fecha de una guardia que se está asignando: el día elegido (hoy o mañana, en
 * hora de Montevideo) + "HH:mm". `fechaHoy` es la fecha del servidor cuando se conoce (un
 * panel con el reloj corrido ya pasó: incidente del 28/09); si no, la del navegador.
 */
export function inicioMsDeGuardia(dia: DiaGuardia, hora: string, fechaHoy: string = hoyUy()): number | null {
  return fechaHoraUyAMs(dia === 'manana' ? sumarDias(fechaHoy, 1) : fechaHoy, hora)
}

/**
 * Inicio corregido de una guardia EN CURSO: misma fecha que tenía (o hoy si no tenía
 * inicioMs) con la hora nueva. null si la hora es inválida.
 */
export function inicioMsEditado(inicioMsActual: number | undefined, hora: string): number | null {
  const fecha = typeof inicioMsActual === 'number' && inicioMsActual > 0
    ? msAFechaHoraUy(inicioMsActual).fecha
    : hoyUy()
  return fechaHoraUyAMs(fecha, hora)
}

/** 'DD/MM HH:mm' en Montevideo, o solo 'HH:mm' si es hoy. */
export function formatearInicioGuardia(inicioMs: number, fechaHoy: string = hoyUy()): string {
  const { fecha, hora } = msAFechaHoraUy(inicioMs)
  return fecha === fechaHoy ? hora : `${fecha.slice(8, 10)}/${fecha.slice(5, 7)} ${hora}`
}

export interface GuardiaEncontrada {
  guardia: GuardiaServidor
  orderNumber: string
  jornadaCerrada: boolean
}

/**
 * La guardia de una asignación en las jornadas del chofer: por el enlace que escribe el
 * celular (data.guardiaId) o por guards[].asignacionId. Si hay un tramo vivo, ese (un cambio
 * de tipo deja el anterior finalizado con la misma asignación).
 */
export async function buscarGuardiaDeAsignacion(
  legajo: string,
  mensajeId: number,
  guardiaId: string | undefined,
  token: string
): Promise<GuardiaEncontrada | null> {
  const jornadas = await buscarJornadasDelChofer(legajo, token)
  const candidatas: GuardiaEncontrada[] = []
  for (const j of jornadas) {
    const guards: GuardiaServidor[] = Array.isArray(j.data?.guards) ? j.data.guards : []
    for (const g of guards) {
      if ((guardiaId && g.id === guardiaId) || String(g.asignacionId ?? '') === String(mensajeId)) {
        candidatas.push({ guardia: g, orderNumber: j.orderNumber, jornadaCerrada: j.data?.closed === true })
      }
    }
  }
  return candidatas.find(c => guardiaViva(c.guardia.status)) ?? candidatas[0] ?? null
}

export type BloqueoAsignacion =
  | { tipo: 'guardia'; guardia: GuardiaServidor; orderNumber: string }
  | { tipo: 'asignacion_pendiente'; mensajeId: number; horaInicio: string; inicioMs: number | null }

/**
 * Por qué no se le puede asignar otra guardia al chofer, o null si se puede: ya tiene una
 * guardia viva en una jornada abierta, o una asignación de guardia que el celular todavía
 * no tomó (el servidor solo frena el alta de la guardia, no el mensaje).
 */
export async function bloqueoParaAsignarGuardia(legajo: string, token: string): Promise<BloqueoAsignacion | null> {
  const jornadas = await buscarJornadasDelChofer(legajo, token)
  for (const j of jornadas) {
    if (j.data?.closed === true) continue
    const guards: GuardiaServidor[] = Array.isArray(j.data?.guards) ? j.data.guards : []
    const viva = guards.find(g => guardiaViva(g.status))
    if (viva) return { tipo: 'guardia', guardia: viva, orderNumber: j.orderNumber }
  }

  const res = await fetch(
    `${SB_URL}/rest/v1/mensajes?para=eq.${encodeURIComponent(legajo)}&tipo=eq.guardia&leido=eq.false&empresa_id=eq.cot&select=id,data&order=id.desc&limit=5`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` } }
  )
  const filas = await res.json()
  if (!Array.isArray(filas)) return null
  for (const f of filas) {
    let data: Record<string, unknown> = {}
    try { data = (typeof f.data === 'string' ? JSON.parse(f.data) : f.data) || {} } catch {}
    if (data.respuesta === 'anulado') continue
    const g = (data.guardia || {}) as { horaInicio?: string; inicioMs?: unknown }
    return {
      tipo: 'asignacion_pendiente',
      mensajeId: f.id,
      horaInicio: g.horaInicio || '',
      inicioMs: typeof g.inicioMs === 'number' ? g.inicioMs : null
    }
  }
  return null
}

export function textoBloqueoAsignacion(b: BloqueoAsignacion): string {
  if (b.tipo === 'guardia') {
    const cuando = typeof b.guardia.inicioMs === 'number'
      ? formatearInicioGuardia(b.guardia.inicioMs)
      : (b.guardia.inicio || '—')
    return b.guardia.status === 'programada'
      ? `El chofer ya tiene una guardia programada para ${cuando}. Un chofer tiene una sola guardia: si hay que cambiarla, anulala y volvé a asignarla.`
      : `El chofer ya tiene una guardia en curso desde ${cuando}. Si tiene que seguir, es la misma guardia; si no, tiene que finalizarla antes de asignarle otra.`
  }
  const cuando = b.inicioMs != null ? formatearInicioGuardia(b.inicioMs) : (b.horaInicio || '—')
  return `El chofer ya tiene una asignación de guardia pendiente (${cuando}) que su celular todavía no tomó. Anulala antes de asignarle otra.`
}

/** Lo que hizo el servidor al anular (anular_guardia_panel -> resultado). */
export const RESULTADO_ANULACION_GUARDIA: Record<string, string> = {
  cancelado: 'La guardia quedó cancelada en el servidor. Se le avisó al celular del chofer.',
  ya_cancelado: 'La guardia ya estaba cancelada en el servidor. Se le avisó igual al celular del chofer.',
  sin_guardia_en_servidor:
    'La guardia no estaba en el servidor (el celular todavía no la había tomado). Se le avisó al celular: si la tiene, la cancela.'
}

/** Rechazos de anular_guardia_panel que el admin tiene que ver tal cual. */
export const RECHAZOS_ANULACION_GUARDIA: Record<string, string> = {
  GUARDIA_FINALIZADA: 'La guardia ya terminó: no se puede anular.',
  JORNADA_CERRADA: 'La jornada de la guardia está cerrada: no se puede anular.',
  JORNADA_BORRADA: 'La jornada de la guardia está borrada.',
  ITEM_AMBIGUO: 'La asignación tiene más de una guardia viva. Contactá con soporte.',
  ESTADO_NO_EDITABLE: 'La guardia está en un estado que no se anula por acá. Contactá con soporte.',
  MENSAJE_NOT_FOUND: 'La asignación no existe (o es de otra empresa).',
  TIPO_INVALIDO: 'El mensaje no es una asignación de guardia.',
  DATA_INVALIDA: 'La asignación tiene los datos mal formados. Contactá con soporte.',
  MOTIVO_REQUERIDO: `El motivo tiene que tener al menos ${MOTIVO_MIN_GUARDIA} caracteres.`
}

/** Rechazos de editar_guardia_en_jornada. */
export const RECHAZOS_EDICION_GUARDIA: Record<string, string> = {
  GUARDIA_PROGRAMADA_NO_EDITABLE: 'Una guardia programada no se edita: anulala y volvé a asignarla.',
  INICIO_FUTURO: 'Una guardia en curso no puede empezar en el futuro. Si tiene que empezar más tarde, el chofer la finaliza y se le asigna otra.',
  INICIO_MS_REQUERIDO: 'Falta la fecha del inicio. Recargá el panel (Ctrl+F5) y probá de nuevo.',
  GUARDIA_NOT_FOUND: 'No se encontró la guardia en el servidor.'
}

/** Horas en curso de una guardia (para avisar lo que se pierde al anularla), o null. */
export function horasEnCurso(g: GuardiaServidor, ahora: number = Date.now()): number | null {
  if (g.status !== 'en_curso' || typeof g.inicioMs !== 'number' || g.inicioMs <= 0) return null
  return Math.max(0, (ahora - g.inicioMs) / 3_600_000)
}

export function kmDeGuardia(g: GuardiaServidor, horas: number): number {
  return horas * (g.type === 'especial' ? 40 : 30)
}
