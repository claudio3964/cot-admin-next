'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import StatsRotacion from './components/StatsRotacion'
import TablaRotacion from './components/TablaRotacion'
import BotonGenerar from './components/BotonGenerar'
import type { FuncionarioRotacion, ServicioRotacion } from './types'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

const getToken = () => sessionStorage.getItem('admin_token')

export default function RotacionPage() {
  const router = useRouter()
  const [funcionarios, setFuncionarios] = useState<FuncionarioRotacion[]>([])
  const [servicios, setServicios] = useState<ServicioRotacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const cargarRotacion = async () => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    setLoading(true)
    const headers = { apikey: SB_KEY, Authorization: `Bearer ${token}` }

    try {
      const [funcionariosRes, serviciosRes] = await Promise.all([
        fetch(`${SB_URL}/rest/v1/rotacion?empresa_id=eq.cot&select=*&order=posicion_actual.asc`, { headers }),
        fetch(`${SB_URL}/rest/v1/servicios_rotacion?temporada=eq.invierno&select=*&order=posicion.asc`, { headers })
      ])

      const funcionariosData = await funcionariosRes.json()
      const serviciosData = await serviciosRes.json()

      setServicios(serviciosData || [])

      const funcionariosConServicio = (funcionariosData || []).map((f: any) => ({
        ...f,
        servicio: (serviciosData || []).find((s: any) => s.posicion === f.posicion_actual) || null
      }))

      setFuncionarios(funcionariosConServicio)
    } catch (error) {
      console.error('Error cargando rotación:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }
    cargarRotacion()
  }, [router])

  const vigencia = servicios.length > 0 ? servicios[0].vigencia_desde : ''
  const temporada = servicios.length > 0 ? 'invierno' : 'invierno'

  if (loading) {
    return (
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-8 text-center">
        <div className="text-[#cbd5e1]">Cargando rotación...</div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Rotación del día — Efectivos Montevideo</h2>
        <div className="flex gap-2">
          <button
            onClick={cargarRotacion}
            className="bg-transparent border border-[#1e2d45] rounded-lg px-4 py-2 text-sm text-[#cbd5e1] hover:border-[#3b82f6] hover:text-[#3b82f6] transition"
          >
            ↺ Actualizar
          </button>
          <BotonGenerar onGenerar={cargarRotacion} />
        </div>
      </div>

      <StatsRotacion 
        funcionarios={funcionarios} 
        vigencia={vigencia} 
        temporada={temporada} 
      />

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="🔍 Buscar funcionario..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          className="bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#94a3b8] outline-none focus:border-[#3b82f6] w-64"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
        >
          <option value="">Todos</option>
          <option value="servicio">En servicio</option>
          <option value="descanso">Descanso</option>
          <option value="agregar">Puede agregar</option>
        </select>
      </div>

      <TablaRotacion 
        funcionarios={funcionarios} 
        filtroTexto={filtroTexto} 
        filtroEstado={filtroEstado} 
      />
    </div>
  )
}