'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

interface ConfigItem {
  id: number
  clave: string
  valor: string
  descripcion: string
  vigencia: string
  updated_at: string
  empresa_id: string
}

const getToken = () => sessionStorage.getItem('admin_token')

// Mapeo de claves a etiquetas legibles
const LABELS: Record<string, string> = {
  precio_km_conductor: 'Precio KM Conductor ($)',
  precio_km_guarda: 'Precio KM Guarda ($)',
  viatico_comida: 'Viático Comida ($)',
  viatico_alojamiento: 'Viático Alojamiento ($)'
}

// Mapeo de claves a descripciones
const DESCRIPTIONS: Record<string, string> = {
  precio_km_conductor: 'Valor por kilómetro para conductores',
  precio_km_guarda: 'Valor por kilómetro para guardas',
  viatico_comida: 'Monto fijo por viático de comida',
  viatico_alojamiento: 'Monto fijo por viático de alojamiento'
}

export default function ConfiguracionPage() {
  const router = useRouter()
  const [config, setConfig] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

 const cargarConfiguracion = async () => {
  const token = getToken()
  if (!token) {
    router.push('/login')
    return
  }

  setLoading(true)
  const headers = { apikey: SB_KEY, Authorization: `Bearer ${token}` }

  try {
    const res = await fetch(
  `${SB_URL}/rest/v1/configuracion?select=*&order=clave.asc`,
  { headers }
)
    const data = await res.json()
    setConfig(Array.isArray(data) ? data : [])
  } catch (error) {
    console.error('Error cargando configuración:', error)
    setConfig([])
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
    cargarConfiguracion()
  }, [router])

  const guardarConfig = async (clave: string) => {
    const token = getToken()
    if (!token) return

    const input = document.getElementById(`val_${clave}`) as HTMLInputElement
    if (!input) return

    const valor = input.value.trim()
    if (!valor || isNaN(Number(valor))) {
      alert('⚠️ Valor inválido. Debe ser un número.')
      return
    }

    setSaving(clave)

    try {
      await fetch(`${SB_URL}/rest/v1/configuracion?clave=eq.${clave}`, {
        method: 'PATCH',
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          valor: valor,
          updated_at: new Date().toISOString()
        })
      })

      alert(`✅ ${LABELS[clave] || clave} actualizado a ${valor}`)
      await cargarConfiguracion()
    } catch (error) {
      console.error('Error guardando configuración:', error)
      alert('❌ Error al guardar')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-8 text-center">
        <div className="text-[#cbd5e1]">Cargando configuración...</div>
      </div>
    )
  }

  // Filtrar solo las claves que nos interesan
  const items = Array.isArray(config) 
  ? config.filter(item => LABELS[item.clave as keyof typeof LABELS])
  : []
  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1e2d45] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Valores del laudo vigente</h2>
            <p className="text-xs text-[#cbd5e1] mt-0.5">Subgrupo 02 Grupo 13</p>
          </div>
          <button
            onClick={cargarConfiguracion}
            className="bg-transparent border border-[#1e2d45] rounded-lg px-4 py-2 text-sm text-[#cbd5e1] hover:border-[#3b82f6] hover:text-[#3b82f6] transition"
          >
            ↺ Actualizar
          </button>
        </div>

        {/* Tabla de configuración */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1c2537] border-b border-[#1e2d45]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Concepto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Valor actual</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Vigencia</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#cbd5e1] uppercase">Acción</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#cbd5e1]">
                    No hay configuración cargada
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-[#1e2d45] hover:bg-[#1c2537]/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{LABELS[item.clave] || item.clave}</div>
                      <div className="text-xs text-[#cbd5e1]">{DESCRIPTIONS[item.clave] || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        id={`val_${item.clave}`}
                        type="number"
                        step="0.0001"
                        defaultValue={item.valor}
                        className="w-36 bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-[#3b82f6]"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-[#cbd5e1]">
                      {item.vigencia || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => guardarConfig(item.clave)}
                        disabled={saving === item.clave}
                        className="bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-md px-4 py-1.5 text-sm font-medium hover:bg-blue-500/30 transition disabled:opacity-50"
                      >
                        {saving === item.clave ? '...' : 'Guardar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer con advertencia */}
        <div className="px-4 py-3 border-t border-[#1e2d45] bg-[#1c2537]/30">
          <div className="text-xs text-[#cbd5e1] font-mono">
            ⚠️ Los cambios se aplican inmediatamente en la app al reiniciar.
          </div>
        </div>
      </div>
    </div>
  )
}