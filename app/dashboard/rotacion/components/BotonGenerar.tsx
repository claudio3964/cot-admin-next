'use client'

import { useState } from 'react'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

interface BotonGenerarProps {
  onGenerar: () => void
}

export default function BotonGenerar({ onGenerar }: BotonGenerarProps) {
  const [generando, setGenerando] = useState(false)

  const getToken = () => sessionStorage.getItem('admin_token')

  const generarViajesSiguiente = async () => {
    if (!confirm('¿Generar viajes programados para mañana?')) return

    setGenerando(true)
    const token = getToken()
    if (!token) {
      alert('No estás autenticado')
      setGenerando(false)
      return
    }

    try {
      const headers = { apikey: SB_KEY, Authorization: `Bearer ${token}` }
      
      const [funcionariosRes, serviciosRes] = await Promise.all([
        fetch(`${SB_URL}/rest/v1/rotacion?empresa_id=eq.cot&select=*&order=posicion_actual.asc`, { headers }),
        fetch(`${SB_URL}/rest/v1/servicios_rotacion?temporada=eq.invierno&select=*&order=posicion.asc`, { headers })
      ])

      const funcionarios = await funcionariosRes.json()
      const servicios = await serviciosRes.json()

      const manana = new Date()
      manana.setDate(manana.getDate() + 1)
      const fechaManana = manana.toISOString().split('T')[0]

      let generados = 0
      let errores = 0

      for (const f of funcionarios) {
        const s = servicios.find((sv: any) => sv.posicion === f.posicion_actual)
        if (!s || s.es_descanso) continue

        const viajes = [
          [s.servicio_1_hora, s.servicio_1_destino, s.servicio_1_tipo],
          [s.servicio_2_hora, s.servicio_2_destino, s.servicio_2_tipo],
          [s.servicio_3_hora, s.servicio_3_destino, s.servicio_3_tipo],
          [s.servicio_4_hora, s.servicio_4_destino, s.servicio_4_tipo]
        ]
          .filter(([hora, destino]) => hora && destino)
          .map(([hora, destino, tipo]) => ({
            hora,
            destino,
            tipo,
            status: 'programado'
          }))

        if (viajes.length === 0) continue

        try {
          await fetch(`${SB_URL}/rest/v1/jornadas`, {
            method: 'POST',
            headers: {
              apikey: SB_KEY,
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=ignore-duplicates'
            },
            body: JSON.stringify({
              empresa_id: 'cot',
              chofer_id: f.nro_fun,
              order_number: `${fechaManana}-${f.nro_fun}`,
              data: JSON.stringify({
                date: fechaManana,
                driverLegajo: f.nro_fun,
                driverName: f.apellidos_nombres,
                posicion: f.posicion_actual,
                travels: viajes,
                tipo: 'efectivo',
                generado_auto: true
              })
            })
          })
          generados++
        } catch {
          errores++
        }
      }

      alert(`✅ ${generados} jornadas generadas${errores ? ` (${errores} errores)` : ''}`)
      onGenerar()
    } catch (error) {
      console.error('Error generando viajes:', error)
      alert('❌ Error al generar viajes')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <button
      onClick={generarViajesSiguiente}
      disabled={generando}
      className="bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-500/30 transition disabled:opacity-50 flex items-center gap-2"
    >
      {generando ? '⏳ Generando...' : '▶ Generar viajes día siguiente'}
    </button>
  )
}