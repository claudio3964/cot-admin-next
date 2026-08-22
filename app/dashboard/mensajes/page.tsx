'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Send,
  MessageSquare,
  AlertTriangle,
  Shield,
  Bus,
  Clock,
  MapPin,
  Route,
  CheckCircle2,
  XCircle,
  Archive,
  Loader2,
  AlertOctagon
} from 'lucide-react'
import ModalEditarAsignacion from './components/ModalEditarAsignacion'
import { buscarJornadasDelChofer, type GuardiaRaw } from '@/lib/jornadas'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

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
  const [mounted, setMounted] = useState(false)

  const [para, setPara] = useState('todos')
  const [tipo, setTipo] = useState('mensaje')
  const [texto, setTexto] = useState('')

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

  const [guardiaHoraInicio, setGuardiaHoraInicio] = useState('')
  const [guardiaTipo, setGuardiaTipo] = useState('comun')

  const [enviando, setEnviando] = useState(false)
  const [editando, setEditando] = useState<Mensaje | null>(null)
  const [advertenciaContinuidad, setAdvertenciaContinuidad] = useState<string | null>(null)
  const [confirmarPeseAContinuidad, setConfirmarPeseAContinuidad] = useState(false)
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
    setMounted(true)
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }
    cargarMensajes()
    cargarChoferes()
    const interval = setInterval(cargarMensajes, 10000)
    return () => clearInterval(interval)
  }, [])

  const toggleCamposAsignacion = () => {
    if (tipo !== 'asignacion') {
      setAsigOrigen(''); setAsigOrigenInput(''); setAsigDestino(''); setAsigDestinoInput('')
      setAsigHoraSalida(''); setAsigHoraLlegada(''); setAsigTipoServicio('TURNO'); setAsigCoche(''); setAsigKm(null)
    }
    if (tipo !== 'guardia') { setGuardiaHoraInicio(''); setGuardiaTipo('comun') }
  }

  useEffect(() => { toggleCamposAsignacion() }, [tipo])
  useEffect(() => { setAdvertenciaContinuidad(null); setConfirmarPeseAContinuidad(false) }, [tipo, para, asigOrigen])
  useEffect(() => { setJornadaColgada(null) }, [tipo, para])

  const getOrigenesUnicos = () => [...new Set(RUTAS_CATALOGO.map(r => r.origen))].sort()
  const getDestinosPara = (origen: string) => {
    if (origen) return RUTAS_CATALOGO.filter(r => r.origen === origen).map(r => ({ destino: r.destino, km: r.km }))
    return [...new Set(RUTAS_CATALOGO.map(r => r.destino))].sort().map(d => ({ destino: d, km: null }))
  }
  const filtrarOrigen = (q: string) => {
    const todos = getOrigenesUnicos()
    return q ? todos.filter(o => o.toLowerCase().includes(q.toLowerCase())) : todos
  }
  const seleccionarOrigen = (valor: string) => {
    setAsigOrigen(valor); setAsigOrigenInput(valor); setShowOrigenList(false)
    setAsigDestino(''); setAsigDestinoInput(''); setAsigKm(null)
  }
  const seleccionarDestino = (valor: string, km: number | null) => {
    setAsigDestino(valor); setAsigDestinoInput(valor); setShowDestinoList(false); setAsigKm(km)
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

  const verificarJornadaColgada = async (legajo: string, token: string) => {
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
        if (!data.closed) return { orderNumber: row.order_number, fecha: row.fecha }
      }
      return null
    } catch (err) {
      console.warn('No se pudo verificar jornada colgada:', err)
      return null
    }
  }

  const enviarMensaje = async (forzar: boolean = false) => {
    const token = getToken()
    if (!token) { router.push('/login'); return }

    if ((tipo === 'asignacion' || tipo === 'guardia') && para !== 'todos') {
      const colgada = await verificarJornadaColgada(para, token)
      if (colgada) { setJornadaColgada(colgada); return }
      setJornadaColgada(null)
    }

    if (tipo === 'asignacion' && para === 'todos') { alert('⚠️ Las asignaciones deben ir a un chofer específico'); return }
    if (tipo !== 'asignacion' && tipo !== 'guardia' && !texto.trim()) { alert('⚠️ Escribí un mensaje'); return }

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
          origen: asigOrigen, destino: asigDestino, horaSalida: asigHoraSalida,
          horaLlegada: asigHoraLlegada || undefined, tipoServicio: asigTipoServicio,
          coche: asigCoche, km: asigKm, inicioProgramadoMs, fechaViaje: fechaHoy
        },
        respuesta: null, respondidoAt: null
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
        apikey: SB_KEY, Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json', 'Prefer': 'return=representation'
      }

      const body: any = {
        empresa_id: 'cot', de: 'admin', para, tipo,
        texto: textoFinal, leido: false
      }
      if (dataViaje) body.data = dataViaje
      if (dataGuardia) body.data = dataGuardia

      const resMensaje = await fetch(`${SB_URL}/rest/v1/mensajes`, {
        method: 'POST', headers, body: JSON.stringify(body)
      })
      const mensajeCreado = await resMensaje.json().catch(() => null)
      const mensajeId = Array.isArray(mensajeCreado) ? mensajeCreado[0]?.id : undefined

      if (forzar && advertenciaContinuidad) {
        try {
          await fetch(`${SB_URL}/rest/v1/inconsistencias_continuidad`, {
            method: 'POST',
            headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              empresa_id: 'cot', legajo: para, origen_declarado: asigOrigen,
              destino_esperado: advertenciaContinuidad,
              mensaje_id: mensajeId != null ? String(mensajeId) : null,
              confirmado_por: getAdminEmail()
            })
          })
          await fetch(`${SB_URL}/rest/v1/mensajes`, {
            method: 'POST',
            headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              empresa_id: 'cot', de: 'admin', para, tipo: 'urgente',
              texto: `Verificá tu ubicación: se te asignó un viaje desde ${asigOrigen}, pero tu último viaje registrado llegó a ${advertenciaContinuidad}.`,
              leido: false
            })
          })
        } catch (err) {
          console.warn('No se pudo registrar la inconsistencia de continuidad:', err)
        }
      }

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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SB_KEY}` },
            body: JSON.stringify({ token: tokenFcm, title: pushTitle, body: textoFinal })
          })
        }
      } catch (pushErr) {
        console.warn('Push FCM error:', pushErr)
      }

      setTexto('')
      if (tipo === 'asignacion') {
        setAsigOrigen(''); setAsigOrigenInput(''); setAsigDestino(''); setAsigDestinoInput('')
        setAsigKm(null); setAsigHoraSalida(''); setAsigHoraLlegada(''); setAsigCoche('')
      }
      if (tipo === 'guardia') { setGuardiaHoraInicio(''); setGuardiaTipo('comun') }
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
          apikey: SB_KEY, Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json', 'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ cerrado: true, cerrado_por: getAdminEmail(), cerrado_at: new Date().toISOString() })
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
      if (typeof msgOriginal.data === 'string') { try { return JSON.parse(msgOriginal.data) } catch { return {} } }
      return msgOriginal.data || {}
    })()
    const viajeId: string | undefined = dataOriginal.viajeId
    try {
      await fetch(`${SB_URL}/rest/v1/mensajes?id=eq.${id}`, {
        method: 'PATCH',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          leido: true,
          data: { ...dataOriginal, respuesta: 'anulado', anuladoAt: new Date().toISOString(), anuladoPor: getAdminEmail() }
        })
      })
      if (viajeId) {
        await fetch(`${SB_URL}/rest/v1/mensajes`, {
          method: 'POST',
          headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            empresa_id: 'cot', de: 'admin', para: msgOriginal.para, tipo: 'cancelar_viaje',
            texto: '🚫 Una asignación de viaje fue anulada por tránsito.', data: { viajeId }, leido: false
          })
        })
      } else {
        await fetch(`${SB_URL}/rest/v1/mensajes`, {
          method: 'POST',
          headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            empresa_id: 'cot', de: 'admin', para: msgOriginal.para, tipo: 'urgente',
            texto: '🚫 Una asignación de viaje fue anulada por tránsito. Consultá con tu despachador.', leido: false
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
      if (typeof msgOriginal.data === 'string') { try { return JSON.parse(msgOriginal.data) } catch { return {} } }
      return msgOriginal.data || {}
    })()
    const guardiaId: string | undefined = dataOriginal.guardiaId
    try {
      if (msgOriginal.leido) {
        if (!guardiaId) { alert('No se puede anular: guardia sin vincular. Contactá con soporte.'); return }
        const jornadas = await buscarJornadasDelChofer(msgOriginal.para, token)
        let guardiaEncontrada: GuardiaRaw | null = null
        for (const j of jornadas) {
          const guards: GuardiaRaw[] = j.data?.guards || []
          const found = guards.find(g => g.id === guardiaId)
          if (found) { guardiaEncontrada = found; break }
        }
        if (!guardiaEncontrada) { alert('No se encontró la guardia en la jornada del chofer.'); return }
        if (guardiaEncontrada.status !== 'en_curso') {
          alert(`Solo se pueden anular guardias en curso; esta ya está ${guardiaEncontrada.status}.`)
          return
        }
        await fetch(`${SB_URL}/rest/v1/mensajes?id=eq.${id}`, {
          method: 'PATCH',
          headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            leido: true,
            data: { ...dataOriginal, respuesta: 'anulado', anuladoAt: new Date().toISOString(), anuladoPor: getAdminEmail() }
          })
        })
        await fetch(`${SB_URL}/rest/v1/mensajes`, {
          method: 'POST',
          headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            empresa_id: 'cot', de: 'admin', para: msgOriginal.para, tipo: 'cancelar_guardia',
            texto: '🚫 Una guardia fue anulada por tránsito.', data: { guardiaId }, leido: false
          })
        })
      } else {
        await fetch(`${SB_URL}/rest/v1/mensajes?id=eq.${id}`, {
          method: 'PATCH',
          headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            leido: true,
            data: { ...dataOriginal, respuesta: 'anulado', anuladoAt: new Date().toISOString(), anuladoPor: getAdminEmail() }
          })
        })
        await fetch(`${SB_URL}/rest/v1/mensajes`, {
          method: 'POST',
          headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            empresa_id: 'cot', de: 'admin', para: msgOriginal.para, tipo: 'urgente',
            texto: '🚫 Una guardia fue anulada por tránsito. Consultá con tu despachador.', leido: false
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-[#64748b]">
          <Loader2 className="w-5 h-5 animate-spin" />
          Cargando mensajes...
        </div>
      </div>
    )
  }

  const mensajesFiltrados = filtrarMensajes()
  const noLeidos = mensajes.filter(m => !m.leido).length
  const isSuperAdmin = getAdminRol() === 'superadmin'

  return (
    <div className={`
      space-y-6 transition-all duration-500
      ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
    `}>
      {/* ===== COMPOSER ===== */}
      <div className="bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-[#3b82f6]" />
          Nuevo mensaje
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5">Para</label>
            <select
              value={para}
               onChange={(e) => setPara(e.target.value)}
               className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6] appearance-none"
>
              <option value="todos">💬 Todos los choferes</option>
               {choferes.map(c => (
               <option key={c.legajo} value={c.legajo}>{c.nombre} ({c.legajo})</option>
               ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5">Tipo</label>
            <select
  value={tipo}
  onChange={(e) => setTipo(e.target.value)}
  className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
>
  <option value="mensaje">💬 Mensaje</option>
  <option value="asignacion">🚍 Asignación de viaje</option>
  <option value="urgente">🚨 Urgente</option>
  <option value="guardia">🛡️ Asignación de guardia</option>
</select>
          </div>
        </div>

        {jornadaColgada && (
          <div className="mb-4 flex items-start gap-3 text-sm text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg p-4">
            <AlertOctagon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              Este chofer tiene una jornada abierta del <span className="text-white font-medium">{jornadaColgada.fecha}</span> sin cerrar — no se puede asignar hasta resolverla.
              <Link href={`/dashboard/jornadas?order_number=${jornadaColgada.orderNumber}`} className="block mt-1 text-[#f87171] hover:text-white underline">
                Ver jornada →
              </Link>
            </div>
          </div>
        )}

        {/* Campos Asignación */}
        {tipo === 'asignacion' && (
          <div className="bg-[#3b82f6]/5 border border-[#3b82f6]/15 rounded-xl p-4 mb-4">
            <div className="text-[11px] font-semibold text-[#3b82f6] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Bus className="w-3.5 h-3.5" />
              Datos del viaje
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <label className="block text-[11px] text-[#94a3b8] mb-1">Origen</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3b82f6] pointer-events-none" />
                  <input
                    type="text"
                    value={asigOrigenInput}
                    onChange={(e) => { setAsigOrigenInput(e.target.value); setShowOrigenList(true); if (!e.target.value) setAsigOrigen('') }}
                    onFocus={() => setShowOrigenList(true)}
                    placeholder="Escribí para buscar..."
                    className="w-full bg-[#0f172a]/60 border border-[#1e293b] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#475569] outline-none focus:border-[#3b82f6]/50 transition-all"
                  />
                </div>
                {showOrigenList && (
                  <div className="absolute z-50 top-full left-0 right-0 bg-[#0f172a] border border-[#3b82f6]/30 rounded-b-lg max-h-52 overflow-y-auto mt-1 shadow-xl">
                    {filtrarOrigen(asigOrigenInput).map(o => (
                      <div key={o} className="px-4 py-2.5 text-sm text-[#94a3b8] hover:bg-[#1c2537] cursor-pointer transition-colors" onClick={() => seleccionarOrigen(o)}>
                        {o}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-[11px] text-[#94a3b8] mb-1">Destino</label>
                <div className="relative">
                  <Route className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3b82f6] pointer-events-none" />
                  <input
                    type="text"
                    value={asigDestinoInput}
                    onChange={(e) => { setAsigDestinoInput(e.target.value); setShowDestinoList(true); if (!e.target.value) setAsigDestino('') }}
                    onFocus={() => setShowDestinoList(true)}
                    placeholder="Escribí para buscar..."
                    className="w-full bg-[#0f172a]/60 border border-[#1e293b] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#475569] outline-none focus:border-[#3b82f6]/50 transition-all"
                  />
                </div>
                {showDestinoList && asigOrigen && (
                  <div className="absolute z-50 top-full left-0 right-0 bg-[#0f172a] border border-[#3b82f6]/30 rounded-b-lg max-h-52 overflow-y-auto mt-1 shadow-xl">
                    {getDestinosPara(asigOrigen)
                      .filter(d => d.destino.toLowerCase().includes(asigDestinoInput.toLowerCase()))
                      .map(d => (
                        <div key={d.destino} className="px-4 py-2.5 text-sm text-[#94a3b8] hover:bg-[#1c2537] cursor-pointer flex justify-between transition-colors" onClick={() => seleccionarDestino(d.destino, d.km)}>
                          <span>{d.destino}</span>
                          {d.km && <span className="text-xs text-[#10b981] font-mono">{d.km} km</span>}
                        </div>
                      ))}
                  </div>
                )}
                {asigKm && (
                  <div className="text-[11px] text-[#10b981] mt-1 font-mono">Km ruta: {asigKm} km</div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-[#94a3b8] mb-1">Hora salida</label>
                <input
                  type="time"
                  value={asigHoraSalida}
                  onChange={(e) => setAsigHoraSalida(e.target.value)}
                  className="w-full bg-[#0f172a]/60 border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#3b82f6]/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#94a3b8] mb-1">Hora llegada (estimada)</label>
                <input
                  type="time"
                  value={asigHoraLlegada}
                  onChange={(e) => setAsigHoraLlegada(e.target.value)}
                  className="w-full bg-[#0f172a]/60 border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#3b82f6]/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#94a3b8] mb-1">Tipo servicio</label>
                <select
                  value={asigTipoServicio}
                  onChange={(e) => setAsigTipoServicio(e.target.value)}
                  className="w-full bg-[#0f172a]/60 border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#3b82f6]/50 transition-all"
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
                <label className="block text-[11px] text-[#94a3b8] mb-1">N° Coche</label>
                <input
                  type="number"
                  value={asigCoche}
                  onChange={(e) => setAsigCoche(e.target.value)}
                  placeholder="Ej: 961"
                  className="w-full bg-[#0f172a]/60 border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-[#475569] outline-none focus:border-[#3b82f6]/50 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Campos Guardia */}
        {tipo === 'guardia' && (
          <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/15 rounded-xl p-4 mb-4">
            <div className="text-[11px] font-semibold text-[#f59e0b] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Datos de la guardia
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#94a3b8] mb-1">Hora inicio</label>
                <input
                  type="time"
                  value={guardiaHoraInicio}
                  onChange={(e) => setGuardiaHoraInicio(e.target.value)}
                  className="w-full bg-[#0f172a]/60 border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#3b82f6]/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#94a3b8] mb-1">Tipo de guardia</label>
                <select
                  value={guardiaTipo}
                  onChange={(e) => setGuardiaTipo(e.target.value)}
                  className="w-full bg-[#0f172a]/60 border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#3b82f6]/50 transition-all"
                >
                  <option value="comun">Común</option>
                  <option value="especial">Especial</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="mb-3">
          <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5">
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
            className="w-full bg-[#0f172a]/60 border border-[#1e293b] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#475569] outline-none focus:border-[#3b82f6]/50 focus:ring-2 focus:ring-[#3b82f6]/10 transition-all resize-y"
          />
        </div>

        {advertenciaContinuidad && (
          <div className="mb-4 flex items-start gap-3 text-sm text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              El chofer no está en <span className="text-white font-medium">{asigOrigen}</span>: su último viaje registrado llegó a{' '}
              <span className="text-white font-medium">{advertenciaContinuidad}</span>.
              Guardá de nuevo para confirmar igualmente.
            </div>
          </div>
        )}

        <button
          onClick={() => enviarMensaje(confirmarPeseAContinuidad)}
          disabled={enviando || !!jornadaColgada}
          className={`
            flex items-center gap-2 rounded-xl px-6 py-2.5 font-semibold text-sm transition disabled:opacity-50
            ${advertenciaContinuidad 
              ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30 hover:bg-[#f59e0b]/30' 
              : 'bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white hover:shadow-lg hover:shadow-[#3b82f6]/25 hover:scale-[1.02]'
            }
          `}
        >
          {enviando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando...
            </>
          ) : jornadaColgada ? (
            <>
              <AlertOctagon className="w-4 h-4" />
              Jornada colgada — no se puede enviar
            </>
          ) : advertenciaContinuidad ? (
            <>
              <AlertTriangle className="w-4 h-4" />
              Enviar de todas formas
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Enviar mensaje
            </>
          )}
        </button>
      </div>

      {/* ===== LISTADO ===== */}
      <div className="bg-[#111827]/60 backdrop-blur-sm border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#3b82f6]" />
              Mensajes
            </h2>
            {noLeidos > 0 && (
              <span className="bg-[#ef4444] text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                {noLeidos} nuevos
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'no-leido', label: 'No leídos' },
              { id: 'asignacion', label: 'Asignaciones' },
              ...(isSuperAdmin ? [{ id: 'archivados', label: 'Archivados' }] : [])
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`
                  px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-200
                  ${filtro === f.id
                    ? 'bg-[#3b82f6] text-white'
                    : 'bg-[#1c2537] text-[#94a3b8] border border-[#1e293b] hover:border-[#3b82f6]/50 hover:text-[#3b82f6]'
                  }
                `}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {mensajesFiltrados.length === 0 ? (
            <div className="px-4 py-12 text-center text-[#475569]">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#1e293b]" />
              <p className="text-sm">No hay mensajes que mostrar</p>
            </div>
          ) : (
            mensajesFiltrados.map((msg) => {
              const fecha = msg.creado_at ? new Date(msg.creado_at).toLocaleString('es-UY') : '—'
              const paraLabel = msg.para === 'todos' ? 'Todos los choferes' : `Legajo ${msg.para}`
              const tipoConfig = {
                asignacion: { label: 'Asignación', color: 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20', icon: Bus },
                urgente: { label: 'Urgente', color: 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20', icon: AlertTriangle },
                guardia: { label: 'Guardia', color: 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20', icon: Shield },
                mensaje: { label: 'Mensaje', color: 'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20', icon: MessageSquare }
              }
              const tc = tipoConfig[msg.tipo as keyof typeof tipoConfig] || tipoConfig.mensaje
              const TipoIcon = tc.icon

              let viajeData = null
              let respuesta = null
              if (msg.data) {
                try {
                  const parsed = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data
                  if (parsed.viaje) { viajeData = parsed.viaje; respuesta = parsed.respuesta || null }
                  if (parsed.guardia) { viajeData = parsed.guardia; respuesta = parsed.respuesta || null }
                } catch {}
              }

              return (
                <div key={msg.id} className={`px-5 py-4 transition-colors hover:bg-white/[0.02] ${!msg.leido ? 'border-l-4 border-l-[#3b82f6]' : ''}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[11px] font-mono text-[#64748b]">{paraLabel}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${tc.color}`}>
                        <TipoIcon className="w-3 h-3" />
                        {tc.label}
                      </span>
                      {!msg.leido && (
                        <span className="text-[10px] bg-[#ef4444] text-white px-2 py-0.5 rounded-full font-semibold">NUEVO</span>
                      )}
                      {msg.cerrado && (
                        <span className="text-[10px] bg-[#64748b]/20 text-[#94a3b8] px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Archive className="w-3 h-3" />
                          Archivado
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#475569] font-mono">{fecha}</span>
                  </div>

                  {msg.texto && (
                    <div className="text-sm text-[#e2e8f0] mb-1">{msg.texto}</div>
                  )}

                  {viajeData && (
                    <div className="bg-[#0f172a]/40 border border-white/[0.04] rounded-lg p-3 mt-2 text-sm">
                      {viajeData.origen && viajeData.destino && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[#94a3b8] text-[11px]">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#3b82f6]" />
                            <span className="text-white font-medium">{viajeData.origen}</span>
                            <span className="text-[#475569]">→</span>
                            <span className="text-white font-medium">{viajeData.destino}</span>
                          </span>
                          {viajeData.horaSalida && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#475569]" />
                              <span className="text-white">{viajeData.horaSalida}</span>
                            </span>
                          )}
                          {viajeData.coche && (
                            <span className="flex items-center gap-1">
                              <Bus className="w-3.5 h-3.5 text-[#475569]" />
                              <span className="text-white">{viajeData.coche}</span>
                            </span>
                          )}
                          {viajeData.tipoServicio && (
                            <span className="flex items-center gap-1">
                              <Route className="w-3.5 h-3.5 text-[#475569]" />
                              <span className="text-white">{viajeData.tipoServicio}</span>
                            </span>
                          )}
                        </div>
                      )}
                      {viajeData.horaInicio && (
                        <div className="flex items-center gap-2 text-[#94a3b8] text-[11px]">
                          <Shield className="w-3.5 h-3.5 text-[#f59e0b]" />
                          Guardia a las <span className="text-white">{viajeData.horaInicio}</span>
                          {viajeData.tipo && (
                            <span className="ml-1">
                              ({viajeData.tipo === 'especial' ? 'Especial' : 'Común'})
                            </span>
                          )}
                        </div>
                      )}
                      {respuesta && (
                        <div className={`mt-2 text-[11px] font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                          respuesta === 'aceptado' ? 'bg-[#10b981]/10 text-[#10b981]' : 
                          respuesta === 'anulado' ? 'bg-[#64748b]/10 text-[#64748b]' : 
                          'bg-[#ef4444]/10 text-[#ef4444]'
                        }`}>
                          {respuesta === 'aceptado' ? <CheckCircle2 className="w-3 h-3" /> :
                           respuesta === 'anulado' ? <Archive className="w-3 h-3" /> :
                           <XCircle className="w-3 h-3" />}
                          {respuesta === 'aceptado' ? 'Aceptado' :
                           respuesta === 'anulado' ? 'Anulado' :
                           'Rechazado'}
                        </div>
                      )}
                      {!respuesta && (msg.tipo === 'asignacion' || msg.tipo === 'guardia') && (
                        <div className="mt-2 text-[11px] text-[#f59e0b] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Sin respuesta
                        </div>
                      )}
                      {!respuesta && msg.tipo === 'asignacion' && (
                        <button
                          onClick={() => anularAsignacion(msg.id)}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#ef4444] border border-[#ef4444]/20 rounded-md px-3 py-1 hover:bg-[#ef4444]/10 transition"
                        >
                          <XCircle className="w-3 h-3" />
                          Anular asignación
                        </button>
                      )}
                      {!respuesta && msg.tipo === 'guardia' && (
                        <button
                          onClick={() => anularGuardia(msg.id)}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#ef4444] border border-[#ef4444]/20 rounded-md px-3 py-1 hover:bg-[#ef4444]/10 transition"
                        >
                          <XCircle className="w-3 h-3" />
                          Anular guardia
                        </button>
                      )}
                      {respuesta !== 'anulado' && (
                        <button
                          onClick={() => setEditando(msg)}
                          className="mt-2 ml-2 inline-flex items-center gap-1 text-[11px] text-[#3b82f6] border border-[#3b82f6]/20 rounded-md px-3 py-1 hover:bg-[#3b82f6]/10 transition"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  )}

                  {isSuperAdmin && !msg.cerrado && (
                    <button
                      onClick={() => cerrarMensaje(msg.id)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#64748b] border border-[#1e293b] rounded-md px-3 py-1 hover:bg-[#1c2537] hover:text-[#94a3b8] transition"
                    >
                      <Archive className="w-3 h-3" />
                      Cerrar mensaje
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
