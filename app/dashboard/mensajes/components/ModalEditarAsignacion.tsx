'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { encontrarConflicto, parsearInicioGuardiaMs, type ViajeParaConflicto } from '@/lib/solapamiento'
import { encontrarUltimoDestino, type ViajeParaContinuidad } from '@/lib/continuidad'
import { buscarJornadasDelChofer, type GuardiaRaw } from '@/lib/jornadas'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

// Mismo catálogo que usa el composer de asignaciones en mensajes/page.tsx — se duplica acá
// siguiendo la convención ya existente en el repo (constantes por archivo, no compartidas).
const RUTAS_CATALOGO = [
  { origen: "Montevideo", destino: "Colonia", km: 178 },
  { origen: "Montevideo", destino: "Punta del Este", km: 140 },
  { origen: "Montevideo", destino: "Punta del Este x Piriápolis", km: 145 },
  { origen: "Montevideo", destino: "Piriápolis", km: 97 },
  { origen: "Montevideo", destino: "Punta Negra", km: 112 },
  { origen: "Montevideo", destino: "Laguna Garzón", km: 183 },
  { origen: "Montevideo", destino: "La Paloma", km: 220 },
  { origen: "Montevideo", destino: "Rocha", km: 220 },
  { origen: "Montevideo", destino: "Chuy", km: 345 },
  { origen: "Colonia", destino: "Montevideo", km: 178 },
  { origen: "Punta del Este", destino: "Montevideo", km: 140 },
  { origen: "Piriápolis", destino: "Montevideo", km: 97 },
  { origen: "Punta Negra", destino: "Montevideo", km: 112 },
  { origen: "Laguna Garzón", destino: "Montevideo", km: 183 },
  { origen: "La Paloma", destino: "Montevideo", km: 220 },
  { origen: "Rocha", destino: "Montevideo", km: 220 },
  { origen: "Chuy", destino: "Montevideo", km: 345 },
  { origen: "Punta del Este", destino: "Piriápolis", km: 40 },
  { origen: "Punta del Este", destino: "Punta Negra", km: 28 },
  { origen: "Punta del Este", destino: "Laguna Garzón", km: 50 },
  { origen: "Piriápolis", destino: "Punta del Este", km: 40 },
  { origen: "Punta Negra", destino: "Punta del Este", km: 28 },
  { origen: "Laguna Garzón", destino: "Punta del Este", km: 50 },
  { origen: "Rocha", destino: "Chuy", km: 120 },
  { origen: "Rocha", destino: "La Paloma", km: 35 },
  { origen: "Chuy", destino: "Rocha", km: 120 },
  { origen: "La Paloma", destino: "Rocha", km: 35 },
]

function buscarKm(origen: string, destino: string): number | null {
  const match = RUTAS_CATALOGO.find(
    r => r.origen.toLowerCase() === origen.toLowerCase() && r.destino.toLowerCase() === destino.toLowerCase()
  )
  return match ? match.km : null
}

const getToken = () => sessionStorage.getItem('admin_token')
const getAdminEmail = () => sessionStorage.getItem('admin_email')

interface Mensaje {
  id: number
  para: string
  tipo: string
  leido: boolean
  data?: unknown
}

interface TravelRaw {
  id: string
  origen?: string
  destino?: string
  departureTime?: string
  arrivalTime?: string
  status?: string
  inicioProgramado?: number
  inicioReal?: number | string | null
  finReal?: number | string | null
  coche?: string
  tipoServicio?: string
  kmEmpresa?: number
}

interface ModalEditarAsignacionProps {
  mensaje: Mensaje
  onClose: () => void
  onGuardado: () => void
}

function toMs(v: unknown): number | null {
  if (typeof v === 'number') return v > 0 ? v : null
  if (typeof v === 'string') {
    const parsed = Date.parse(v)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function parseData(raw: unknown): Record<string, any> {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return (raw as Record<string, any>) || {}
}

function travelsAConflicto(travels: TravelRaw[]): ViajeParaConflicto[] {
  return travels.map(t => ({
    id: t.id,
    status: t.status || 'programado',
    inicioProgramado: Number(t.inicioProgramado) || 0,
    inicioReal: toMs(t.inicioReal),
    finReal: toMs(t.finReal),
  }))
}

function travelsAContinuidad(travels: TravelRaw[]): ViajeParaContinuidad[] {
  return travels.map(t => ({
    id: t.id,
    destino: t.destino,
    status: t.status || 'programado',
    inicioProgramado: Number(t.inicioProgramado) || 0,
  }))
}

export default function ModalEditarAsignacion({ mensaje, onClose, onGuardado }: ModalEditarAsignacionProps) {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Contexto resuelto según el caso (A: no leído / B: ya creado)
  const [travelsExistentes, setTravelsExistentes] = useState<ViajeParaConflicto[]>([])
  const [travelsInfo, setTravelsInfo] = useState<Record<string, { origen?: string; destino?: string; departureTime?: string }>>({})
  const [excluirId, setExcluirId] = useState<string | undefined>(undefined)
  const [inicioBase, setInicioBase] = useState<number | null>(null) // epoch del día del viaje (para recombinar con horaSalida)
  const [kmOriginal, setKmOriginal] = useState<number>(0) // CASO B: km actual del viaje, fallback si no hay match en el catálogo

  // Form
  const [esGuardia, setEsGuardia] = useState(false)
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [horaSalida, setHoraSalida] = useState('')
  const [tipoServicio, setTipoServicio] = useState('TURNO')
  const [coche, setCoche] = useState('')
  const [horaInicioGuardia, setHoraInicioGuardia] = useState('')
  const [tipoGuardia, setTipoGuardia] = useState('comun')
  // Caso B de guardias: id de la guardia real (jornadas.data.guards[]) que se está editando.
  const [guardiaIdEditando, setGuardiaIdEditando] = useState<string | undefined>(undefined)

  const [conflicto, setConflicto] = useState<ViajeParaConflicto | null>(null)
  const [confirmarPeseAConflicto, setConfirmarPeseAConflicto] = useState(false)

  // Guard de "jornada colgada" (capa 1, extendido acá): mismo criterio que
  // verificarJornadaColgada en mensajes/page.tsx — jornada activa
  // (data.closed !== true) con fecha anterior a hoy para el chofer
  // destinatario. Bloquea sin "guardar de todas formas". Solo aplica a
  // Caso A (mensaje no leído, guardarCasoA/guardarGuardia); Caso B
  // (guardarCasoB, viaje ya creado) queda fuera a propósito.
  const [jornadaColgada, setJornadaColgada] = useState<{ orderNumber: string; fecha: string } | null>(null)

  // Continuidad geográfica: todos los travels del legajo (todas las jornadas
  // cruzando días, no solo la del viaje en edición) — mismo alcance que
  // obtener_ultimo_viaje_chofer, para poder calcularlo localmente.
  const [todosLosTravels, setTodosLosTravels] = useState<ViajeParaContinuidad[]>([])
  const [advertenciaContinuidad, setAdvertenciaContinuidad] = useState<string | null>(null)
  const [confirmarPeseAContinuidad, setConfirmarPeseAContinuidad] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      const token = getToken()
      if (!token) { setError('Sesión no encontrada.'); setCargando(false); return }

      const data = parseData(mensaje.data)

      if (mensaje.tipo === 'guardia') {
        setEsGuardia(true)

        if (!mensaje.leido) {
          // CASO A: todavía no procesada por el chofer — sin cambios.
          const g = data.guardia || data
          setHoraInicioGuardia(g.horaInicio || g.inicio || '')
          setTipoGuardia(g.tipo || 'comun')
          setCargando(false)
          return
        }

        // CASO B: mensaje ya leído — la guardia real vive en jornadas.data.guards[]
        const guardiaId: string | undefined = data.guardiaId
        if (!guardiaId) {
          setError('No se puede editar: guardia sin vincular. Contactá con soporte.')
          setCargando(false)
          return
        }

        try {
          const jornadas = await buscarJornadasDelChofer(mensaje.para, token)

          let guardiaEncontrada: GuardiaRaw | null = null
          let travelsDeLaJornada: TravelRaw[] = []
          for (const j of jornadas) {
            const guards: GuardiaRaw[] = j.data?.guards || []
            const found = guards.find(g => g.id === guardiaId)
            if (found) {
              guardiaEncontrada = found
              travelsDeLaJornada = j.data?.travels || []
              break
            }
          }

          if (!guardiaEncontrada) {
            setError('No se encontró la guardia en la jornada del chofer.')
            setCargando(false)
            return
          }

          if (guardiaEncontrada.status !== 'en_curso') {
            setError(`Solo se pueden editar guardias en curso; esta ya está ${guardiaEncontrada.status}.`)
            setCargando(false)
            return
          }

          setHoraInicioGuardia(guardiaEncontrada.inicio || '')
          setTipoGuardia(guardiaEncontrada.type || 'comun')
          setGuardiaIdEditando(guardiaId)

          const infoMap: Record<string, { origen?: string; destino?: string; departureTime?: string }> = {}
          travelsDeLaJornada.forEach(t => { infoMap[t.id] = { origen: t.origen, destino: t.destino, departureTime: t.departureTime } })
          setTravelsExistentes(travelsAConflicto(travelsDeLaJornada))
          setTravelsInfo(infoMap)
        } catch {
          setError('No se pudo cargar la jornada del chofer — reintentá en un momento.')
        }
        setCargando(false)
        return
      }

      // tipo === 'asignacion'
      const viaje = data.viaje || data
      setOrigen(viaje.origen || '')
      setDestino(viaje.destino || '')
      setHoraSalida(viaje.horaSalida || '')
      setTipoServicio(viaje.tipoServicio || 'TURNO')
      setCoche(viaje.coche || '')

      if (!mensaje.leido) {
        // CASO A: todavía no procesado — comparar contra travels[] de la jornada de esa fecha
        // + otras asignaciones pendientes (leido:false) del mismo chofer para la misma fecha.
        const fechaViaje = viaje.fechaViaje
        if (!fechaViaje) {
          setError('Este mensaje no tiene fecha de viaje asociada — no se puede validar solapamiento de forma confiable.')
          setCargando(false)
          return
        }

        try {
          const jornadas = await buscarJornadasDelChofer(mensaje.para, token)
          const jornada = jornadas.find(j => j.data?.date === fechaViaje)
          const travels: TravelRaw[] = jornada ? (jornada.data.travels || []) : []

          const todosTravelsRaw: TravelRaw[] = jornadas.flatMap(j => j.data?.travels || [])
          setTodosLosTravels(travelsAContinuidad(todosTravelsRaw))

          const infoMap: Record<string, { origen?: string; destino?: string; departureTime?: string }> = {}
          travels.forEach(t => { infoMap[t.id] = { origen: t.origen, destino: t.destino, departureTime: t.departureTime } })

          const resSiblings = await fetch(
            `${SB_URL}/rest/v1/mensajes?para=eq.${mensaje.para}&tipo=eq.asignacion&leido=eq.false&select=id,data`,
            { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` } }
          )
          const siblings = await resSiblings.json()
          const siblingsConflicto: ViajeParaConflicto[] = []
          if (Array.isArray(siblings)) {
            for (const s of siblings) {
              if (s.id === mensaje.id) continue
              const sData = parseData(s.data)
              const sViaje = sData.viaje || sData
              if (sViaje.fechaViaje !== fechaViaje || !sViaje.horaSalida) continue
              const sInicio = new Date(`${fechaViaje}T${sViaje.horaSalida}:00`).getTime()
              const synthId = `MSG-${s.id}`
              siblingsConflicto.push({ id: synthId, status: 'programado', inicioProgramado: sInicio, inicioReal: null, finReal: null })
              infoMap[synthId] = { origen: sViaje.origen, destino: sViaje.destino, departureTime: sViaje.horaSalida }
            }
          }

          setTravelsExistentes([...travelsAConflicto(travels), ...siblingsConflicto])
          setTravelsInfo(infoMap)
          setInicioBase(new Date(`${fechaViaje}T00:00:00`).getTime())
        } catch {
          setError('No se pudo verificar solapamiento contra otros viajes — reintentá en un momento.')
        }
        setCargando(false)
        return
      }

      // CASO B: mensaje ya leído — el viaje real vive en jornadas.data.travels[]
      const viajeId: string | undefined = data.viajeId
      if (!viajeId) {
        setError('No se puede editar: viaje sin vincular. Contactá con soporte.')
        setCargando(false)
        return
      }

      try {
        const jornadas = await buscarJornadasDelChofer(mensaje.para, token)

        const todosTravelsRaw: TravelRaw[] = jornadas.flatMap(j => j.data?.travels || [])
        setTodosLosTravels(travelsAContinuidad(todosTravelsRaw))

        let travelEncontrado: TravelRaw | null = null
        let travelsDeLaJornada: TravelRaw[] = []
        for (const j of jornadas) {
          const travels: TravelRaw[] = j.data?.travels || []
          const found = travels.find(t => t.id === viajeId)
          if (found) {
            travelEncontrado = found
            travelsDeLaJornada = travels
            break
          }
        }

        if (!travelEncontrado) {
          setError('No se encontró el viaje en la jornada del chofer.')
          setCargando(false)
          return
        }

        if (travelEncontrado.status !== 'programado') {
          setError(`Solo se pueden editar viajes programados; este está ${travelEncontrado.status}.`)
          setCargando(false)
          return
        }

        setOrigen(travelEncontrado.origen || '')
        setDestino(travelEncontrado.destino || '')
        setHoraSalida(travelEncontrado.departureTime || '')
        setTipoServicio(travelEncontrado.tipoServicio || 'TURNO')
        setCoche(travelEncontrado.coche || '')
        setKmOriginal(travelEncontrado.kmEmpresa ?? 0)

        const infoMap: Record<string, { origen?: string; destino?: string; departureTime?: string }> = {}
        travelsDeLaJornada.forEach(t => { infoMap[t.id] = { origen: t.origen, destino: t.destino, departureTime: t.departureTime } })

        setTravelsExistentes(travelsAConflicto(travelsDeLaJornada))
        setTravelsInfo(infoMap)
        setExcluirId(viajeId)
        setInicioBase(Number(travelEncontrado.inicioProgramado) || Date.now())
      } catch {
        setError('No se pudo cargar la jornada del chofer — reintentá en un momento.')
      }
      setCargando(false)
    }

    cargar()
  }, [mensaje])

  const combinarFechaHora = (baseMs: number, horaHHMM: string): number => {
    const base = new Date(baseMs)
    const [hh, mm] = horaHHMM.split(':').map(Number)
    return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hh || 0, mm || 0, 0, 0).getTime()
  }

  const chequearConflicto = (): ViajeParaConflicto | null => {
    if (inicioBase === null || !horaSalida) return null
    const nuevaInicio = combinarFechaHora(inicioBase, horaSalida)
    const nuevaFin = nuevaInicio + 3 * 60 * 60 * 1000
    return encontrarConflicto(nuevaInicio, nuevaFin, travelsExistentes, excluirId)
  }

  // Caso B excluye el propio viaje (ya existe en travels[]); Caso A no
  // excluye nada porque el viaje todavía no existe.
  const chequearContinuidad = (): string | null => {
    const excluir = mensaje.leido ? excluirId : undefined
    const destinoUltimo = encontrarUltimoDestino(todosLosTravels, excluir)
    if (!destinoUltimo) return null
    if (destinoUltimo.trim().toLowerCase() !== origen.trim().toLowerCase()) return destinoUltimo
    return null
  }

  // Si el admin cambia el origen después de ver la advertencia de continuidad,
  // la advertencia vieja ya no aplica a este origen nuevo — mismo criterio que
  // el reset de mensajes/page.tsx (líneas 202-205) para el mismo caso.
  useEffect(() => {
    setAdvertenciaContinuidad(null)
    setConfirmarPeseAContinuidad(false)
  }, [origen])

  // Mismo problema del lado del solapamiento: si cambia la hora de salida, o
  // qué viaje se está editando (excluirId), el conflicto detectado antes ya
  // no es necesariamente el mismo — no tenía este reset (gap preexistente).
  useEffect(() => {
    setConflicto(null)
    setConfirmarPeseAConflicto(false)
  }, [horaSalida, excluirId, horaInicioGuardia])

  // Equivalente de chequearConflicto() para Caso B de guardias: misma ventana de 3h que usa
  // encontrarConflictoGuardia en Kotlin (que es un alias 1:1 de encontrarConflicto), pero
  // interpretando horaInicioGuardia con la semántica de cruce de medianoche de una guardia
  // (parsearInicioGuardiaMs) en vez de combinarFechaHora (que es específico de viajes).
  const chequearConflictoGuardia = (): ViajeParaConflicto | null => {
    const nuevaInicio = parsearInicioGuardiaMs(horaInicioGuardia)
    if (nuevaInicio === null) return null
    const nuevaFin = nuevaInicio + 3 * 60 * 60 * 1000
    return encontrarConflicto(nuevaInicio, nuevaFin, travelsExistentes)
  }

  const verificarJornadaColgada = async (
    legajo: string,
    token: string
  ): Promise<{ orderNumber: string; fecha: string } | null> => {
    const hoyAdmin = new Date()
    const fechaHoy = `${hoyAdmin.getFullYear()}-${String(hoyAdmin.getMonth() + 1).padStart(2, '0')}-${String(hoyAdmin.getDate()).padStart(2, '0')}`
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/jornadas?legajo=eq.${legajo}&fecha=lt.${fechaHoy}&select=order_number,fecha,data&order=fecha.desc&limit=10`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` } }
      )
      const rows = await res.json()
      if (!Array.isArray(rows)) return null
      for (const row of rows) {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {})
        if (data.deleted) continue
        if (!data.closed) {
          return { orderNumber: row.order_number, fecha: row.fecha }
        }
      }
      return null
    } catch (err) {
      console.warn('No se pudo verificar jornada colgada:', err)
      return null
    }
  }

  const registrarInconsistenciaContinuidad = async (token: string) => {
    if (!advertenciaContinuidad) return
    try {
      await fetch(`${SB_URL}/rest/v1/inconsistencias_continuidad`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          empresa_id: 'cot',
          legajo: mensaje.para,
          origen_declarado: origen,
          destino_esperado: advertenciaContinuidad,
          mensaje_id: String(mensaje.id),
          confirmado_por: getAdminEmail()
        })
      })
    } catch (err) {
      console.warn('No se pudo registrar la inconsistencia de continuidad:', err)
    }
  }

  const guardarGuardia = async () => {
    const token = getToken()
    if (!token) return

    const colgada = await verificarJornadaColgada(mensaje.para, token)
    if (colgada) {
      setJornadaColgada(colgada)
      return
    }

    setGuardando(true)
    try {
      const dataOriginal = parseData(mensaje.data)
      const nuevaData = {
        ...dataOriginal,
        guardia: { ...(dataOriginal.guardia || {}), horaInicio: horaInicioGuardia, tipo: tipoGuardia }
      }
      await fetch(`${SB_URL}/rest/v1/mensajes?id=eq.${mensaje.id}`, {
        method: 'PATCH',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ data: nuevaData })
      })
      onGuardado()
      onClose()
    } catch {
      alert('❌ Error al guardar la edición')
    } finally {
      setGuardando(false)
    }
  }

  const guardarGuardiaCasoB = async () => {
    const token = getToken()
    if (!token || !guardiaIdEditando) return

    const colgada = await verificarJornadaColgada(mensaje.para, token)
    if (colgada) {
      setJornadaColgada(colgada)
      return
    }

    if (!confirmarPeseAConflicto) {
      const detectado = chequearConflictoGuardia()
      if (detectado) {
        setConflicto(detectado)
        setConfirmarPeseAConflicto(true)
        return
      }
    }

    setGuardando(true)
    try {
      const res = await fetch(`${SB_URL}/rest/v1/rpc/editar_guardia_en_jornada`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_guardia_id: guardiaIdEditando,
          p_inicio: horaInicioGuardia
        })
      })

      if (!res.ok) {
        alert('❌ Error al editar la guardia en la jornada')
        setGuardando(false)
        return
      }

      // Avisar al chofer para que reconcilie Room/WorkManager — las guardias no tienen
      // ningún otro mecanismo de sync desde Supabase (a diferencia de los viajes, que sí
      // tienen sync_jornada). MensajesPollingWorker aplica inicio directo y, si tipo
      // cambió, delega en cambiarTipoGuardia() (cierra la guardia vieja y abre una nueva —
      // por eso el "tipo" nunca se escribe acá arriba en el jsonb, solo viaja en el mensaje).
      await fetch(`${SB_URL}/rest/v1/mensajes`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          empresa_id: 'cot',
          de: 'admin',
          para: mensaje.para,
          tipo: 'editar_guardia',
          texto: 'Tu guardia fue modificada por tránsito.',
          leido: false,
          data: { guardiaId: guardiaIdEditando, inicio: horaInicioGuardia, tipo: tipoGuardia }
        })
      })

      onGuardado()
      onClose()
    } catch {
      alert('❌ Error al guardar la edición')
    } finally {
      setGuardando(false)
    }
  }

  const guardarCasoA = async () => {
    const token = getToken()
    if (!token) return

    const colgada = await verificarJornadaColgada(mensaje.para, token)
    if (colgada) {
      setJornadaColgada(colgada)
      return
    }

    if (!confirmarPeseAConflicto) {
      const detectado = chequearConflicto()
      if (detectado) {
        setConflicto(detectado)
        setConfirmarPeseAConflicto(true)
        return
      }
    }
    if (!confirmarPeseAContinuidad) {
      const destinoEsperado = chequearContinuidad()
      if (destinoEsperado) {
        setAdvertenciaContinuidad(destinoEsperado)
        setConfirmarPeseAContinuidad(true)
        return
      }
    }

    setGuardando(true)
    try {
      const dataOriginal = parseData(mensaje.data)
      const viajeOriginal = dataOriginal.viaje || {}
      const fechaViaje = viajeOriginal.fechaViaje
      const inicioProgramadoMs = fechaViaje ? new Date(`${fechaViaje}T${horaSalida}:00`).getTime() : viajeOriginal.inicioProgramadoMs
      const kmMatch = buscarKm(origen, destino)

      const nuevaData = {
        ...dataOriginal,
        viaje: {
          ...viajeOriginal,
          origen,
          destino,
          horaSalida,
          tipoServicio,
          coche,
          inicioProgramadoMs,
          km: kmMatch ?? viajeOriginal.km
        }
      }

      await fetch(`${SB_URL}/rest/v1/mensajes?id=eq.${mensaje.id}`, {
        method: 'PATCH',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ data: nuevaData })
      })
      await registrarInconsistenciaContinuidad(token)
      onGuardado()
      onClose()
    } catch {
      alert('❌ Error al guardar la edición')
    } finally {
      setGuardando(false)
    }
  }

  const guardarCasoB = async () => {
    if (!confirmarPeseAConflicto) {
      const detectado = chequearConflicto()
      if (detectado) {
        setConflicto(detectado)
        setConfirmarPeseAConflicto(true)
        return
      }
    }
    if (!confirmarPeseAContinuidad) {
      const destinoEsperado = chequearContinuidad()
      if (destinoEsperado) {
        setAdvertenciaContinuidad(destinoEsperado)
        setConfirmarPeseAContinuidad(true)
        return
      }
    }

    const token = getToken()
    if (!token || inicioBase === null) return
    const dataOriginal = parseData(mensaje.data)
    const viajeId: string = dataOriginal.viajeId
    const inicioProgramado = combinarFechaHora(inicioBase, horaSalida)
    const kmMatch = buscarKm(origen, destino)

    setGuardando(true)
    try {
      const res = await fetch(`${SB_URL}/rest/v1/rpc/editar_viaje_en_jornada`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_viaje_id: viajeId,
          p_origen: origen,
          p_destino: destino,
          p_departure_time: horaSalida,
          p_inicio_programado: inicioProgramado,
          p_coche: coche,
          p_tipo_servicio: tipoServicio,
          p_km_empresa: kmMatch ?? kmOriginal
        })
      })

      if (!res.ok) {
        alert('❌ Error al editar el viaje en la jornada')
        setGuardando(false)
        return
      }

      // Avisar al chofer para que sincronice ya, sin esperar a que abra la app.
      await fetch(`${SB_URL}/rest/v1/mensajes`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          empresa_id: 'cot',
          de: 'admin',
          para: mensaje.para,
          tipo: 'sync_jornada',
          texto: `El viaje ${origen} → ${destino} fue modificado por tránsito.`,
          leido: false
        })
      })

      await registrarInconsistenciaContinuidad(token)
      onGuardado()
      onClose()
    } catch {
      alert('❌ Error al guardar la edición')
    } finally {
      setGuardando(false)
    }
  }

  const handleGuardar = () => {
    if (esGuardia) {
      if (mensaje.leido) { guardarGuardiaCasoB(); return }
      guardarGuardia()
      return
    }
    if (mensaje.leido) { guardarCasoB(); return }
    guardarCasoA()
  }

  const infoConflicto = conflicto ? travelsInfo[conflicto.id] : null

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#111827] border-b border-[#1e2d45] px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-[#e2e8f0]">✏️ Editar {esGuardia ? 'guardia' : 'asignación'}</h2>
          <button onClick={onClose} className="text-[#cbd5e1] hover:text-white text-xl">✕</button>
        </div>

        <div className="p-6">
          {cargando ? (
            <div className="text-[#cbd5e1] text-sm">Cargando...</div>
          ) : error ? (
            <div className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">{error}</div>
          ) : esGuardia ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#cbd5e1] mb-1">Hora inicio</label>
                <input
                  type="time"
                  value={horaInicioGuardia}
                  onChange={(e) => setHoraInicioGuardia(e.target.value)}
                  className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#cbd5e1] mb-1">Tipo de guardia</label>
                <select
                  value={tipoGuardia}
                  onChange={(e) => setTipoGuardia(e.target.value)}
                  className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
                >
                  <option value="comun">🛡️ Común</option>
                  <option value="especial">⚡ Especial</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#cbd5e1] mb-1">Origen</label>
                  <input
                    type="text"
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                    className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cbd5e1] mb-1">Destino</label>
                  <input
                    type="text"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
                  />
                </div>
              </div>
              {buscarKm(origen, destino) && (
                <div className="text-xs text-green-400">Km ruta: {buscarKm(origen, destino)} km</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#cbd5e1] mb-1">Hora salida</label>
                  <input
                    type="time"
                    value={horaSalida}
                    onChange={(e) => setHoraSalida(e.target.value)}
                    className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cbd5e1] mb-1">N° Coche</label>
                  <input
                    type="text"
                    value={coche}
                    onChange={(e) => setCoche(e.target.value)}
                    className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#cbd5e1] mb-1">Tipo servicio</label>
                <select
                  value={tipoServicio}
                  onChange={(e) => setTipoServicio(e.target.value)}
                  className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
                >
                  <option value="TURNO">Turno</option>
                  <option value="SEMI">Semi-directo</option>
                  <option value="DIRECTO">Directo</option>
                  <option value="EXPRESO">Expreso</option>
                  <option value="CONTRATADO">Contratado</option>
                  <option value="PASAJERO">Pasajero</option>
                </select>
              </div>
            </div>
          )}

          {conflicto && (
            <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              ⚠️ Conflicto de horario con otro viaje
              {infoConflicto?.origen && infoConflicto?.destino && (
                <> — <span className="text-white">{infoConflicto.origen} → {infoConflicto.destino}</span></>
              )}
              {infoConflicto?.departureTime && <> a las <span className="text-white">{infoConflicto.departureTime}</span></>}.
              Guardá de nuevo para confirmar igualmente.
            </div>
          )}

          {advertenciaContinuidad && (
            <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              ⚠️ El chofer no está en {origen}: su último viaje registrado llegó a{' '}
              <span className="text-white">{advertenciaContinuidad}</span>.
              Guardá de nuevo para confirmar igualmente.
            </div>
          )}

          {jornadaColgada && (
            <div className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              🚫 Este chofer tiene una jornada abierta del <span className="text-white">{jornadaColgada.fecha}</span> sin cerrar — no se puede editar hasta resolverla.{' '}
              <Link
                href={`/dashboard/jornadas?order_number=${jornadaColgada.orderNumber}`}
                className="underline text-red-300 hover:text-white"
              >
                Ver jornada
              </Link>
            </div>
          )}

          {!cargando && !error && (
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={onClose}
                className="bg-transparent border border-[#1e2d45] rounded-lg px-4 py-2 text-sm text-[#cbd5e1] hover:border-[#3b82f6] transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando || !!jornadaColgada}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                  (conflicto || advertenciaContinuidad) ? 'bg-red-500/80 text-white hover:opacity-85' : 'bg-[#3b82f6] text-white hover:opacity-85'
                }`}
              >
                {guardando ? 'Guardando...' :
                 jornadaColgada ? '🚫 Jornada colgada — no se puede guardar' :
                 (conflicto || advertenciaContinuidad) ? '⚠️ Guardar de todas formas' : 'Guardar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
