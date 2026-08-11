'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ModalEditarAsignacion from './components/ModalEditarAsignacion'
import { buscarJornadasDelChofer, type GuardiaRaw } from '@/lib/jornadas'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

// Definición de rutas para typeahead (mismo que tu HTML)
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

// Tipos
interface Mensaje {
  id: number
  empresa_id: string
  de: string
  para: string
  tipo: string
  texto: string
  leido: boolean
  cerrado: boolean
  data?: any
  creado_at: string
  cerrado_at?: string
  cerrado_por?: string
}

interface Chofer {
  legajo: string
  nombre: string
  device_id?: string
  fcm_token?: string
}

interface ViajeData {
  viaje: {
    origen: string
    destino: string
    horaSalida: string
    horaLlegada?: string
    tipoServicio: string
    coche: string
    km: number
    inicioProgramadoMs: number
    fechaViaje: string
  }
  respuesta: string | null
  respondidoAt: string | null
  anuladoAt?: string
  anuladoPor?: string
}

const getToken = () => sessionStorage.getItem('admin_token')
const getAdminRol = () => sessionStorage.getItem('admin_rol')
const getAdminEmail = () => sessionStorage.getItem('admin_email')

export default function MensajesPage() {
  const router = useRouter()
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [choferes, setChoferes] = useState<Chofer[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')

  // Estado del formulario de nuevo mensaje
  const [para, setPara] = useState('todos')
  const [tipo, setTipo] = useState('mensaje')
  const [texto, setTexto] = useState('')

  // Campos de asignación
  const [asigOrigen, setAsigOrigen] = useState('')
  const [asigOrigenInput, setAsigOrigenInput] = useState('')
  const [asigDestino, setAsigDestino] = useState('')
  const [asigDestinoInput, setAsigDestinoInput] = useState('')
  const [asigHoraSalida, setAsigHoraSalida] = useState('')
  const [asigHoraLlegada, setAsigHoraLlegada] = useState('')
  const [asigTipoServicio, setAsigTipoServicio] = useState('TURNO')
  const [asigCoche, setAsigCoche] = useState('')
  const [asigKm, setAsigKm] = useState<number | null>(null)
  const [showOrigenList, setShowOrigenList] = useState(false)
  const [showDestinoList, setShowDestinoList] = useState(false)

  // Campos de guardia
  const [guardiaHoraInicio, setGuardiaHoraInicio] = useState('')
  const [guardiaTipo, setGuardiaTipo] = useState('comun')

  const [enviando, setEnviando] = useState(false)
  const [editando, setEditando] = useState<Mensaje | null>(null)

  // Continuidad geográfica (paso 4): destino esperado según el último viaje
  // del chofer, cuando no coincide con el origen declarado en la asignación.
  const [advertenciaContinuidad, setAdvertenciaContinuidad] = useState<string | null>(null)
  const [confirmarPeseAContinuidad, setConfirmarPeseAContinuidad] = useState(false)

  // Guard de "jornada colgada" (capa 1): jornada activa (data.closed !== true)
  // con fecha anterior a hoy para el chofer destinatario. A diferencia de la
  // continuidad geográfica, este chequeo bloquea sin opción de "enviar de
  // todas formas" — el admin tiene que resolver la jornada vieja primero.
  const [jornadaColgada, setJornadaColgada] = useState<{ orderNumber: string; fecha: string } | null>(null)

  const cargarMensajes = async () => {
    const token = getToken()
    if (!token) return

    const headers = { apikey: SB_KEY, Authorization: `Bearer ${token}` }

    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/mensajes?empresa_id=eq.cot&select=*&order=creado_at.desc&limit=100`,
        { headers }
      )
      const data = await res.json()
      setMensajes(data || [])
    } catch (error) {
      console.error('Error cargando mensajes:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarChoferes = async () => {
    const token = getToken()
    if (!token) return

    const headers = { apikey: SB_KEY, Authorization: `Bearer ${token}` }

    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/choferes?empresa_id=eq.cot&select=legajo,nombre,device_id,fcm_token&order=nombre.asc`,
        { headers }
      )
      const data = await res.json()
      setChoferes(data || [])
    } catch (error) {
      console.error('Error cargando choferes:', error)
    }
  }

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    cargarMensajes()
    cargarChoferes()

    // Polling cada 10 segundos para mensajes nuevos
    const interval = setInterval(cargarMensajes, 10000)
    return () => clearInterval(interval)
  }, [])

  const toggleCamposAsignacion = () => {
    // Limpiar campos al cambiar tipo
    if (tipo !== 'asignacion') {
      setAsigOrigen('')
      setAsigOrigenInput('')
      setAsigDestino('')
      setAsigDestinoInput('')
      setAsigHoraSalida('')
      setAsigHoraLlegada('')
      setAsigTipoServicio('TURNO')
      setAsigCoche('')
      setAsigKm(null)
    }
    if (tipo !== 'guardia') {
      setGuardiaHoraInicio('')
      setGuardiaTipo('comun')
    }
  }

  useEffect(() => {
    toggleCamposAsignacion()
  }, [tipo])

  // Si cambia el chofer, el tipo o el origen declarado después de mostrar la
  // advertencia, no tiene sentido dejar el "confirmar de todas formas" armado
  // para una comparación que ya no aplica.
  useEffect(() => {
    setAdvertenciaContinuidad(null)
    setConfirmarPeseAContinuidad(false)
  }, [tipo, para, asigOrigen])

  // Mismo criterio: si cambia el chofer o el tipo, el cartel de jornada
  // colgada que se haya mostrado ya no corresponde necesariamente.
  useEffect(() => {
    setJornadaColgada(null)
  }, [tipo, para])

  const getOrigenesUnicos = () => {
    return [...new Set(RUTAS_CATALOGO.map(r => r.origen))].sort()
  }

  const getDestinosPara = (origen: string) => {
    if (origen) {
      return RUTAS_CATALOGO
        .filter(r => r.origen === origen)
        .map(r => ({ destino: r.destino, km: r.km }))
    }
    return [...new Set(RUTAS_CATALOGO.map(r => r.destino))].sort().map(d => ({ destino: d, km: null }))
  }

  const filtrarOrigen = (q: string) => {
    const todos = getOrigenesUnicos()
    const filtrados = q ? todos.filter(o => o.toLowerCase().includes(q.toLowerCase())) : todos
    return filtrados
  }

  const seleccionarOrigen = (valor: string) => {
    setAsigOrigen(valor)
    setAsigOrigenInput(valor)
    setShowOrigenList(false)
    setAsigDestino('')
    setAsigDestinoInput('')
    setAsigKm(null)
  }

  const seleccionarDestino = (valor: string, km: number | null) => {
    setAsigDestino(valor)
    setAsigDestinoInput(valor)
    setShowDestinoList(false)
    setAsigKm(km)
  }

  const calcularInicioProgramadoMs = (horaSalidaStr: string) => {
    const [hh, mm] = horaSalidaStr.split(':').map(Number)
    const ahora = new Date()
    const candidato = new Date()
    candidato.setHours(hh, mm, 0, 0)
    const diffMs = ahora.getTime() - candidato.getTime()
    if (candidato > ahora) return candidato.getTime()
    if (diffMs < 12 * 3600000) return candidato.getTime()
    candidato.setDate(candidato.getDate() + 1)
    return candidato.getTime()
  }

  // Mismo criterio que ViajeRepositoy.obtenerJornadaActiva() del lado Kotlin:
  // "activa" = data.closed !== true (no hay columna estado separada en la
  // tabla jornadas). Acá además se exige fecha < hoy — jornada vieja que
  // nunca se cerró. Fail-open ante error de red (mismo criterio que el
  // chequeo de continuidad de más abajo): no bloquea el envío si Supabase
  // no responde.
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

  const enviarMensaje = async (forzar: boolean = false) => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    if ((tipo === 'asignacion' || tipo === 'guardia') && para !== 'todos') {
      const colgada = await verificarJornadaColgada(para, token)
      if (colgada) {
        setJornadaColgada(colgada)
        return
      }
      setJornadaColgada(null)
    }

    if (tipo === 'asignacion' && para === 'todos') {
      alert('⚠️ Las asignaciones deben ir a un chofer específico')
      return
    }

    if (tipo !== 'asignacion' && tipo !== 'guardia' && !texto.trim()) {
      alert('⚠️ Escribí un mensaje')
      return
    }

    let dataViaje: ViajeData | null = null
    if (tipo === 'asignacion') {
      if (!asigHoraSalida) { alert('⚠️ Ingresá la hora de salida'); return }
      if (!asigCoche) { alert('⚠️ Ingresá el número de coche'); return }
      if (!asigOrigen) { alert('⚠️ Seleccioná el origen del catálogo'); return }
      if (!asigDestino) { alert('⚠️ Seleccioná el destino del catálogo'); return }
      if (!asigTipoServicio) { alert('⚠️ Seleccioná el tipo de servicio'); return }
      if (!asigKm) { alert('⚠️ Seleccioná una combinación origen/destino válida del catálogo'); return }

      const regexHora = /^([01]\d|2[0-3]):([0-5]\d)$/
      if (!regexHora.test(asigHoraSalida)) { alert('⚠️ Hora de salida inválida (HH:MM)'); return }
      if (isNaN(Number(asigCoche)) || asigCoche.trim() === '') { alert('⚠️ El número de coche debe ser numérico'); return }

      // Continuidad geográfica: comparar contra el destino del último viaje del
      // chofer (mismo criterio que ContinuidadValidator del lado Kotlin — trim +
      // case-insensitive; sin viaje previo, nada que comparar). No bloquea: si
      // no coincide, se corta acá una vez para mostrar la advertencia, y el
      // propio botón vuelve a llamar con forzar=true para confirmar igual.
      if (!forzar) {
        try {
          const resUltimo = await fetch(`${SB_URL}/rest/v1/rpc/obtener_ultimo_viaje_chofer`, {
            method: 'POST',
            headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_legajo: para })
          })
          const ultimo = await resUltimo.json()
          const destinoUltimo: string | undefined = Array.isArray(ultimo) ? ultimo[0]?.destino : undefined
          if (destinoUltimo && destinoUltimo.trim().toLowerCase() !== asigOrigen.trim().toLowerCase()) {
            setAdvertenciaContinuidad(destinoUltimo)
            setConfirmarPeseAContinuidad(true)
            return
          }
        } catch (err) {
          console.warn('No se pudo verificar continuidad geográfica:', err)
        }
      }

      const hoyAdmin = new Date()
      const fechaHoy = `${hoyAdmin.getFullYear()}-${String(hoyAdmin.getMonth()+1).padStart(2,'0')}-${String(hoyAdmin.getDate()).padStart(2,'0')}`
      const inicioProgramadoMs = calcularInicioProgramadoMs(asigHoraSalida)

      dataViaje = {
        viaje: {
          origen: asigOrigen,
          destino: asigDestino,
          horaSalida: asigHoraSalida,
          horaLlegada: asigHoraLlegada || undefined,
          tipoServicio: asigTipoServicio,
          coche: asigCoche,
          km: asigKm,
          inicioProgramadoMs,
          fechaViaje: fechaHoy
        },
        respuesta: null,
        respondidoAt: null
      }
    }

    let dataGuardia = null
    if (tipo === 'guardia') {
      if (!guardiaHoraInicio) { alert('⚠️ Ingresá la hora de inicio'); return }
      dataGuardia = { guardia: { horaInicio: guardiaHoraInicio, tipo: guardiaTipo } }
    }

    const textoFinal = texto.trim() || (tipo === 'asignacion'
      ? `Asignación de viaje: ${asigOrigen} → ${asigDestino} a las ${asigHoraSalida}`
      : tipo === 'guardia'
      ? `Asignación de guardia ${guardiaTipo === 'especial' ? 'especial' : 'común'} a las ${guardiaHoraInicio}`
      : '')

    setEnviando(true)

    try {
      const headers = {
        apikey: SB_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }

      const body: any = {
        empresa_id: 'cot',
        de: 'admin',
        para,
        tipo,
        texto: textoFinal,
        leido: false
      }

      if (dataViaje) body.data = dataViaje
      if (dataGuardia) body.data = dataGuardia

      const resMensaje = await fetch(`${SB_URL}/rest/v1/mensajes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
      const mensajeCreado = await resMensaje.json().catch(() => null)
      const mensajeId = Array.isArray(mensajeCreado) ? mensajeCreado[0]?.id : undefined

      // Continuidad confirmada pese a la advertencia (forzar=true): no hay
      // notificación a super admin (no existe ese mecanismo hoy) — se deja
      // registro en inconsistencias_continuidad y se avisa al chofer por
      // mensaje. El push es best-effort/decorativo (bright-processor no
      // matchea ningún caso en CotFirebaseMessagingService); el chofer se
      // entera realmente por el polling de 30s, no al instante.
      if (forzar && advertenciaContinuidad) {
        try {
          await fetch(`${SB_URL}/rest/v1/inconsistencias_continuidad`, {
            method: 'POST',
            headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              empresa_id: 'cot',
              legajo: para,
              origen_declarado: asigOrigen,
              destino_esperado: advertenciaContinuidad,
              mensaje_id: mensajeId != null ? String(mensajeId) : null,
              confirmado_por: getAdminEmail()
            })
          })

          await fetch(`${SB_URL}/rest/v1/mensajes`, {
            method: 'POST',
            headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              empresa_id: 'cot',
              de: 'admin',
              para,
              tipo: 'urgente',
              texto: `Verificá tu ubicación: se te asignó un viaje desde ${asigOrigen}, pero tu último viaje registrado llegó a ${advertenciaContinuidad}.`,
              leido: false
            })
          })
        } catch (err) {
          console.warn('No se pudo registrar la inconsistencia de continuidad:', err)
        }
      }

      // Enviar push FCM
      try {
        let tokens: string[] = []
        if (para === 'todos') {
          tokens = choferes.map(c => c.fcm_token).filter(Boolean) as string[]
        } else {
          const chofer = choferes.find(c => c.legajo === para)
          if (chofer?.fcm_token) tokens = [chofer.fcm_token]
        }

        const pushTitle = tipo === 'asignacion' ? '🚍 Nueva asignación de viaje' :
                          tipo === 'urgente' ? '🔴 Mensaje urgente de tránsito' :
                          tipo === 'guardia' ? '🛡️ Asignación de guardia' :
                          '💬 Mensaje de tránsito'

        for (const tokenFcm of tokens) {
          await fetch(`${SB_URL}/functions/v1/bright-processor`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SB_KEY}`
            },
            body: JSON.stringify({ token: tokenFcm, title: pushTitle, body: textoFinal })
          })
        }
      } catch (pushErr) {
        console.warn('Push FCM error:', pushErr)
      }

      // Limpiar formulario
      setTexto('')
      if (tipo === 'asignacion') {
        setAsigOrigen('')
        setAsigOrigenInput('')
        setAsigDestino('')
        setAsigDestinoInput('')
        setAsigKm(null)
        setAsigHoraSalida('')
        setAsigHoraLlegada('')
        setAsigCoche('')
      }
      if (tipo === 'guardia') {
        setGuardiaHoraInicio('')
        setGuardiaTipo('comun')
      }
      setAdvertenciaContinuidad(null)
      setConfirmarPeseAContinuidad(false)

      cargarMensajes()
    } catch (error) {
      console.error('Error enviando mensaje:', error)
      alert('❌ Error al enviar')
    } finally {
      setEnviando(false)
    }
  }

  const cerrarMensaje = async (id: number) => {
    const rol = getAdminRol()
    if (rol !== 'superadmin') return
    if (!confirm('¿Cerrar este mensaje? Quedará en el archivo para auditoría.')) return

    const token = getToken()
    if (!token) return

    try {
      await fetch(`${SB_URL}/rest/v1/mensajes?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          cerrado: true,
          cerrado_por: getAdminEmail(),
          cerrado_at: new Date().toISOString()
        })
      })
      cargarMensajes()
    } catch (error) {
      console.error('Error cerrando mensaje:', error)
      alert('❌ Error al cerrar mensaje')
    }
  }

  const anularAsignacion = async (id: number) => {
    if (!confirm('¿Anular esta asignación? El chofer recibirá un aviso.')) return

    const token = getToken()
    if (!token) return

    const msgOriginal = mensajes.find(m => m.id === id)
    if (!msgOriginal) return

    const dataOriginal = (() => {
      if (typeof msgOriginal.data === 'string') {
        try { return JSON.parse(msgOriginal.data) } catch { return {} }
      }
      return msgOriginal.data || {}
    })()

    const viajeId: string | undefined = dataOriginal.viajeId

    try {
      // Preserva el payload original (viaje/guardia) — solo agrega la marca de anulado.
      await fetch(`${SB_URL}/rest/v1/mensajes?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          leido: true,
          data: {
            ...dataOriginal,
            respuesta: 'anulado',
            anuladoAt: new Date().toISOString(),
            anuladoPor: getAdminEmail()
          }
        })
      })

      if (viajeId) {
        // El viaje ya fue creado en el celular — cancelarlo estructuralmente con el mismo
        // tipo que ya procesa MensajesPollingWorker (repo.cancelarViaje()), no solo avisar.
        await fetch(`${SB_URL}/rest/v1/mensajes`, {
          method: 'POST',
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            empresa_id: 'cot',
            de: 'admin',
            para: msgOriginal.para,
            tipo: 'cancelar_viaje',
            texto: '🚫 Una asignación de viaje fue anulada por tránsito.',
            data: { viajeId },
            leido: false
          })
        })
      } else {
        // Todavía no fue creado (mensaje seguía sin leer) — no hay nada que cancelar en el
        // celular, solo avisar por texto.
        await fetch(`${SB_URL}/rest/v1/mensajes`, {
          method: 'POST',
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            empresa_id: 'cot',
            de: 'admin',
            para: msgOriginal.para,
            tipo: 'urgente',
            texto: '🚫 Una asignación de viaje fue anulada por tránsito. Consultá con tu despachador.',
            leido: false
          })
        })
      }

      cargarMensajes()
    } catch (error) {
      console.error('Error anulando asignación:', error)
      alert('❌ Error al anular')
    }
  }

  const anularGuardia = async (id: number) => {
    if (!confirm('¿Anular esta guardia? El chofer recibirá un aviso.')) return

    const token = getToken()
    if (!token) return

    const msgOriginal = mensajes.find(m => m.id === id)
    if (!msgOriginal) return

    const dataOriginal = (() => {
      if (typeof msgOriginal.data === 'string') {
        try { return JSON.parse(msgOriginal.data) } catch { return {} }
      }
      return msgOriginal.data || {}
    })()

    const guardiaId: string | undefined = dataOriginal.guardiaId

    try {
      if (msgOriginal.leido) {
        // CASO B: mensaje ya procesado — la guardia real vive en jornadas.data.guards[].
        // A diferencia de anularAsignacion() (que cancela a ciegas si hay viajeId), acá
        // chequeamos el status actual ANTES de tocar nada — mismo criterio cauteloso que
        // ModalEditarAsignacion.tsx para Caso B de edición.
        if (!guardiaId) {
          alert('No se puede anular: guardia sin vincular. Contactá con soporte.')
          return
        }

        const jornadas = await buscarJornadasDelChofer(msgOriginal.para, token)
        let guardiaEncontrada: GuardiaRaw | null = null
        for (const j of jornadas) {
          const guards: GuardiaRaw[] = j.data?.guards || []
          const found = guards.find(g => g.id === guardiaId)
          if (found) { guardiaEncontrada = found; break }
        }

        if (!guardiaEncontrada) {
          alert('No se encontró la guardia en la jornada del chofer.')
          return
        }

        if (guardiaEncontrada.status !== 'en_curso') {
          alert(`Solo se pueden anular guardias en curso; esta ya está ${guardiaEncontrada.status}.`)
          return
        }

        // Preserva el payload original — solo agrega la marca de anulado.
        // Nota: este PATCH y el POST de abajo son dos fetch() independientes, sin
        // transacción — mismo gap de fallo parcial que ya tiene anularAsignacion() para
        // viajes (si el PATCH tiene éxito y el POST falla por red, el panel muestra
        // "anulado" pero la guardia real en el celu sigue en_curso). Deuda conocida del
        // patrón completo, no de esta función puntual — no se resuelve acá.
        await fetch(`${SB_URL}/rest/v1/mensajes?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            leido: true,
            data: {
              ...dataOriginal,
              respuesta: 'anulado',
              anuladoAt: new Date().toISOString(),
              anuladoPor: getAdminEmail()
            }
          })
        })

        // La guardia ya está en curso en el celular — cancelarla estructuralmente con el
        // mismo tipo que ya procesa MensajesPollingWorker (repo.cancelarGuardia()).
        await fetch(`${SB_URL}/rest/v1/mensajes`, {
          method: 'POST',
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            empresa_id: 'cot',
            de: 'admin',
            para: msgOriginal.para,
            tipo: 'cancelar_guardia',
            texto: '🚫 Una guardia fue anulada por tránsito.',
            data: { guardiaId },
            leido: false
          })
        })
      } else {
        // CASO A: todavía no fue procesada por el chofer — no hay guardia real que cancelar,
        // el PATCH con respuesta:'anulado' alcanza (mensajeSigueVigente() bloquea la creación
        // si el worker llega a procesarla tarde). Mismo aviso por texto que usa
        // anularAsignacion() en su Caso A, mismo criterio de consistencia con el chofer.
        await fetch(`${SB_URL}/rest/v1/mensajes?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            leido: true,
            data: {
              ...dataOriginal,
              respuesta: 'anulado',
              anuladoAt: new Date().toISOString(),
              anuladoPor: getAdminEmail()
            }
          })
        })

        await fetch(`${SB_URL}/rest/v1/mensajes`, {
          method: 'POST',
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            empresa_id: 'cot',
            de: 'admin',
            para: msgOriginal.para,
            tipo: 'urgente',
            texto: '🚫 Una guardia fue anulada por tránsito. Consultá con tu despachador.',
            leido: false
          })
        })
      }

      cargarMensajes()
    } catch (error) {
      console.error('Error anulando guardia:', error)
      alert('❌ Error al anular')
    }
  }

  const filtrarMensajes = () => {
    let lista = mensajes
    if (filtro === 'no-leido') lista = lista.filter(m => !m.leido)
    else if (filtro === 'leido') lista = lista.filter(m => m.leido)
    else if (filtro === 'asignacion') lista = lista.filter(m => m.tipo === 'asignacion')
    else if (filtro === 'archivados') lista = lista.filter(m => m.cerrado)
    else lista = lista.filter(m => !m.cerrado)
    return lista
  }

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-8 text-center">
        <div className="text-[#cbd5e1]">Cargando mensajes...</div>
      </div>
    )
  }

  const mensajesFiltrados = filtrarMensajes()
  const noLeidos = mensajes.filter(m => !m.leido).length
  const isSuperAdmin = getAdminRol() === 'superadmin'

  return (
    <div className="space-y-6">
      {/* ===== COMPOSER ===== */}
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">✍️ Nuevo mensaje</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-[#cbd5e1] uppercase tracking-wider mb-1">Para</label>
            <select
              value={para}
              onChange={(e) => setPara(e.target.value)}
              className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
            >
              <option value="todos">📢 Todos los choferes</option>
              {choferes.map(c => (
                <option key={c.legajo} value={c.legajo}>{c.nombre} ({c.legajo})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#cbd5e1] uppercase tracking-wider mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
            >
              <option value="mensaje">💬 Mensaje</option>
              <option value="asignacion">✅ Asignación de viaje</option>
              <option value="urgente">🔴 Urgente</option>
              <option value="guardia">🛡️ Asignación de guardia</option>
            </select>
          </div>
        </div>

        {jornadaColgada && (
          <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            🚫 Este chofer tiene una jornada abierta del <span className="text-white">{jornadaColgada.fecha}</span> sin cerrar — no se puede asignar hasta resolverla.{' '}
            <Link
              href={`/dashboard/jornadas?order_number=${jornadaColgada.orderNumber}`}
              className="underline text-red-300 hover:text-white"
            >
              Ver jornada
            </Link>
          </div>
        )}

        {/* Campos Asignación */}
        {(tipo === 'asignacion') && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 mb-4">
            <div className="text-xs font-semibold text-blue-400 mb-3">🚍 Datos del viaje</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Origen */}
              <div className="relative">
                <label className="block text-xs text-[#cbd5e1] mb-1">Origen</label>
                <input
                  type="text"
                  value={asigOrigenInput}
                  onChange={(e) => {
                    setAsigOrigenInput(e.target.value)
                    setShowOrigenList(true)
                    if (!e.target.value) setAsigOrigen('')
                  }}
                  onFocus={() => setShowOrigenList(true)}
                  placeholder="Escribí para buscar..."
                  className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
                />
                {showOrigenList && (
                  <div className="absolute z-50 top-full left-0 right-0 bg-[#1c2537] border border-[#3b82f6] rounded-b-lg max-h-52 overflow-y-auto">
                    {filtrarOrigen(asigOrigenInput).map(o => (
                      <div
                        key={o}
                        className="px-3 py-2 text-sm text-[#cbd5e1] hover:bg-[#2a3a5a] cursor-pointer"
                        onClick={() => seleccionarOrigen(o)}
                      >
                        {o}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Destino */}
              <div className="relative">
                <label className="block text-xs text-[#cbd5e1] mb-1">Destino</label>
                <input
                  type="text"
                  value={asigDestinoInput}
                  onChange={(e) => {
                    setAsigDestinoInput(e.target.value)
                    setShowDestinoList(true)
                    if (!e.target.value) setAsigDestino('')
                  }}
                  onFocus={() => setShowDestinoList(true)}
                  placeholder="Escribí para buscar..."
                  className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
                />
                {showDestinoList && asigOrigen && (
                  <div className="absolute z-50 top-full left-0 right-0 bg-[#1c2537] border border-[#3b82f6] rounded-b-lg max-h-52 overflow-y-auto">
                    {getDestinosPara(asigOrigen)
                      .filter(d => d.destino.toLowerCase().includes(asigDestinoInput.toLowerCase()))
                      .map(d => (
                        <div
                          key={d.destino}
                          className="px-3 py-2 text-sm text-[#cbd5e1] hover:bg-[#2a3a5a] cursor-pointer flex justify-between"
                          onClick={() => seleccionarDestino(d.destino, d.km)}
                        >
                          <span>{d.destino}</span>
                          {d.km && <span className="text-xs text-green-400">{d.km} km</span>}
                        </div>
                      ))}
                  </div>
                )}
                {asigKm && (
                  <div className="text-xs text-green-400 mt-1">Km ruta: {asigKm} km</div>
                )}
              </div>

              <div>
                <label className="block text-xs text-[#cbd5e1] mb-1">Hora salida</label>
                <input
                  type="time"
                  value={asigHoraSalida}
                  onChange={(e) => setAsigHoraSalida(e.target.value)}
                  className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#cbd5e1] mb-1">Hora llegada (estimada)</label>
                <input
                  type="time"
                  value={asigHoraLlegada}
                  onChange={(e) => setAsigHoraLlegada(e.target.value)}
                  className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#cbd5e1] mb-1">Tipo servicio</label>
                <select
                  value={asigTipoServicio}
                  onChange={(e) => setAsigTipoServicio(e.target.value)}
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

              <div>
                <label className="block text-xs text-[#cbd5e1] mb-1">N° Coche</label>
                <input
                  type="number"
                  value={asigCoche}
                  onChange={(e) => setAsigCoche(e.target.value)}
                  placeholder="Ej: 961"
                  className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Campos Guardia */}
        {(tipo === 'guardia') && (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4 mb-4">
            <div className="text-xs font-semibold text-yellow-400 mb-3">🛡️ Datos de la guardia</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#cbd5e1] mb-1">Hora inicio</label>
                <input
                  type="time"
                  value={guardiaHoraInicio}
                  onChange={(e) => setGuardiaHoraInicio(e.target.value)}
                  className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#cbd5e1] mb-1">Tipo de guardia</label>
                <select
                  value={guardiaTipo}
                  onChange={(e) => setGuardiaTipo(e.target.value)}
                  className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
                >
                  <option value="comun">🛡️ Común</option>
                  <option value="especial">⚡ Especial</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="mb-3">
          <label className="block text-xs text-[#cbd5e1] uppercase tracking-wider mb-1">
            {tipo === 'asignacion' ? 'Instrucciones adicionales (opcional)' :
             tipo === 'guardia' ? 'Instrucciones adicionales (opcional)' :
             'Mensaje'}
          </label>
          <textarea
            rows={2}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={tipo === 'asignacion' ? 'Instrucciones adicionales para el viaje...' :
                         tipo === 'guardia' ? 'Instrucciones adicionales para la guardia...' :
                         'Escribí el mensaje para el chofer...'}
            className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#94a3b8] outline-none focus:border-[#3b82f6] resize-vertical"
          />
        </div>

        {advertenciaContinuidad && (
          <div className="mt-1 mb-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            ⚠️ El chofer no está en {asigOrigen}: su último viaje registrado llegó a{' '}
            <span className="text-white">{advertenciaContinuidad}</span>.
            Guardá de nuevo para confirmar igualmente.
          </div>
        )}

        <button
          onClick={() => enviarMensaje(confirmarPeseAContinuidad)}
          disabled={enviando || !!jornadaColgada}
          className={`rounded-lg px-6 py-2 font-semibold text-sm transition disabled:opacity-50 ${
            advertenciaContinuidad ? 'bg-red-500/80 text-white hover:opacity-85' : 'bg-[#3b82f6] text-white hover:opacity-85'
          }`}
        >
          {enviando ? 'Enviando...' :
           jornadaColgada ? '🚫 Jornada colgada — no se puede enviar' :
           advertenciaContinuidad ? '⚠️ Enviar de todas formas' : 'Enviar mensaje'}
        </button>
      </div>

      {/* ===== LISTADO ===== */}
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#1e2d45] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Mensajes</span>
            {noLeidos > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {noLeidos} nuevos
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFiltro('todos')}
              className={`px-3 py-1 text-xs rounded-full transition ${
                filtro === 'todos' ? 'bg-[#3b82f6] text-white' : 'bg-[#1c2537] text-[#cbd5e1] hover:bg-[#2a3a5a]'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltro('no-leido')}
              className={`px-3 py-1 text-xs rounded-full transition ${
                filtro === 'no-leido' ? 'bg-[#3b82f6] text-white' : 'bg-[#1c2537] text-[#cbd5e1] hover:bg-[#2a3a5a]'
              }`}
            >
              No leídos
            </button>
            <button
              onClick={() => setFiltro('asignacion')}
              className={`px-3 py-1 text-xs rounded-full transition ${
                filtro === 'asignacion' ? 'bg-[#3b82f6] text-white' : 'bg-[#1c2537] text-[#cbd5e1] hover:bg-[#2a3a5a]'
              }`}
            >
              Asignaciones
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setFiltro('archivados')}
                className={`px-3 py-1 text-xs rounded-full transition ${
                  filtro === 'archivados' ? 'bg-[#3b82f6] text-white' : 'bg-[#1c2537] text-[#cbd5e1] hover:bg-[#2a3a5a]'
                }`}
              >
                🗂 Archivados
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-[#1e2d45]">
          {mensajesFiltrados.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#cbd5e1] text-sm">
              No hay mensajes que mostrar
            </div>
          ) : (
            mensajesFiltrados.map((msg) => {
              const fecha = msg.creado_at ? new Date(msg.creado_at).toLocaleString('es-UY') : '—'
              const paraLabel = msg.para === 'todos' ? '📢 Todos' : `👤 Legajo ${msg.para}`
              const tipoLabel = msg.tipo === 'asignacion' ? '✅ Asignación' :
                                msg.tipo === 'urgente' ? '🔴 Urgente' :
                                msg.tipo === 'guardia' ? '🛡️ Guardia' : '💬 Mensaje'
              const tipoColor = msg.tipo === 'asignacion' ? 'text-green-400 bg-green-500/20' :
                                msg.tipo === 'urgente' ? 'text-red-400 bg-red-500/20' :
                                msg.tipo === 'guardia' ? 'text-yellow-400 bg-yellow-500/20' :
                                'text-blue-400 bg-blue-500/20'

              // Extraer datos de viaje si existe
              let viajeData = null
              let respuesta = null
              if (msg.data) {
                try {
                  const parsed = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data
                  if (parsed.viaje) {
                    viajeData = parsed.viaje
                    respuesta = parsed.respuesta || null
                  }
                  if (parsed.guardia) {
                    viajeData = parsed.guardia
                    respuesta = parsed.respuesta || null
                  }
                } catch {}
              }

              return (
                <div key={msg.id} className={`px-4 py-3 ${!msg.leido ? 'border-l-4 border-[#3b82f6]' : ''}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-semibold text-[#3b82f6]">{paraLabel}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tipoColor}`}>{tipoLabel}</span>
                      {!msg.leido && (
                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">NUEVO</span>
                      )}
                      {msg.cerrado && (
                        <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full">🗂 Archivado</span>
                      )}
                    </div>
                    <span className="text-xs text-[#cbd5e1] font-mono">{fecha}</span>
                  </div>

                  {msg.texto && (
                    <div className="text-sm text-[#e2e8f0] mb-1">{msg.texto}</div>
                  )}

                  {viajeData && (
                    <div className="bg-[#1c2537] rounded-lg p-3 mt-2 text-sm">
                      {viajeData.origen && viajeData.destino && (
                        <div className="text-[#cbd5e1]">
                          🚍 <span className="text-white font-medium">{viajeData.origen}</span> → <span className="text-white font-medium">{viajeData.destino}</span>
                          {viajeData.horaSalida && <span className="ml-3">🕒 <span className="text-white">{viajeData.horaSalida}</span></span>}
                          {viajeData.coche && <span className="ml-3">🚌 Coche: <span className="text-white">{viajeData.coche}</span></span>}
                          {viajeData.tipoServicio && <span className="ml-3">🎫 <span className="text-white">{viajeData.tipoServicio}</span></span>}
                        </div>
                      )}
                      {viajeData.horaInicio && (
                        <div className="text-[#cbd5e1]">
                          🛡️ Guardia a las <span className="text-white">{viajeData.horaInicio}</span>
                          {viajeData.tipo && <span className="ml-3">Tipo: <span className="text-white">{viajeData.tipo === 'especial' ? '⚡ Especial' : '🛡️ Común'}</span></span>}
                        </div>
                      )}
                      {respuesta && (
                        <div className={`mt-2 text-xs font-semibold ${respuesta === 'aceptado' ? 'text-green-400' : respuesta === 'anulado' ? 'text-gray-400' : 'text-red-400'}`}>
                          {respuesta === 'aceptado' ? '✓ Aceptado' :
                           respuesta === 'anulado' ? '🚫 Anulado' :
                           '✕ Rechazado'}
                        </div>
                      )}
                      {!respuesta && (msg.tipo === 'asignacion' || msg.tipo === 'guardia') && (
                        <div className="mt-2 text-xs text-yellow-400">⏳ Sin respuesta</div>
                      )}
                      {!respuesta && msg.tipo === 'asignacion' && (
                        <button
                          onClick={() => anularAsignacion(msg.id)}
                          className="mt-2 text-xs text-red-400 border border-red-400/30 rounded-md px-3 py-1 hover:bg-red-500/10 transition"
                        >
                          🚫 Anular asignación
                        </button>
                      )}
                      {!respuesta && msg.tipo === 'guardia' && (
                        <button
                          onClick={() => anularGuardia(msg.id)}
                          className="mt-2 text-xs text-red-400 border border-red-400/30 rounded-md px-3 py-1 hover:bg-red-500/10 transition"
                        >
                          🚫 Anular guardia
                        </button>
                      )}
                      {respuesta !== 'anulado' && (
                        <button
                          onClick={() => setEditando(msg)}
                          className="mt-2 ml-2 text-xs text-blue-400 border border-blue-400/30 rounded-md px-3 py-1 hover:bg-blue-500/10 transition"
                        >
                          ✏️ Editar
                        </button>
                      )}
                    </div>
                  )}

                  {isSuperAdmin && !msg.cerrado && (
                    <button
                      onClick={() => cerrarMensaje(msg.id)}
                      className="mt-2 text-xs text-[#cbd5e1] border border-[#1e2d45] rounded-md px-3 py-1 hover:bg-[#1c2537] transition"
                    >
                      🗂 Cerrar mensaje
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {editando && (
        <ModalEditarAsignacion
          mensaje={editando}
          onClose={() => setEditando(null)}
          onGuardado={cargarMensajes}
        />
      )}
    </div>
  )
}