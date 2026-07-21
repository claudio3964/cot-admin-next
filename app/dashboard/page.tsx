'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    choferes: 0,
    jornadasHoy: 0,
    alertasPendientes: 0,
    jornadasTotal: 0
  })

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token')
    if (!token) {
      router.push('/login')
      return
    }

    const fetchData = async () => {
      const headers = { apikey: SB_KEY, Authorization: `Bearer ${token}` }

      try {
        const [choferesRes, jornadasRes, alertasRes] = await Promise.all([
          fetch(`${SB_URL}/rest/v1/choferes?empresa_id=eq.cot&select=id`, { headers }),
          fetch(`${SB_URL}/rest/v1/jornadas?empresa_id=eq.cot&select=id,data`, { headers }),
          fetch(`${SB_URL}/rest/v1/registro_alertas?select=id,resuelto`, { headers })
        ])

        const choferes = await choferesRes.json()
        const jornadas = await jornadasRes.json()
        const alertas = await alertasRes.json()

        const hoy = new Date().toISOString().split('T')[0]
        const jornadasHoy = (jornadas || []).filter((j: any) => {
          try {
            const data = typeof j.data === 'string' ? JSON.parse(j.data) : j.data
            return data?.date === hoy
          } catch { return false }
        }).length

        setStats({
          choferes: choferes?.length || 0,
          jornadasHoy,
          alertasPendientes: (alertas || []).filter((a: any) => !a.resuelto).length,
          jornadasTotal: jornadas?.length || 0
        })
      } catch (error) {
        console.error('Error:', error)
      }
    }

    fetchData()
  }, [router])

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-5">
          <div className="text-[11px] font-medium tracking-[1.5px] uppercase text-[#cbd5e1] mb-2">Choferes registrados</div>
          <div className="font-mono text-3xl font-bold text-[#3b82f6]">{stats.choferes}</div>
        </div>
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-5">
          <div className="text-[11px] font-medium tracking-[1.5px] uppercase text-[#cbd5e1] mb-2">Jornadas hoy</div>
          <div className="font-mono text-3xl font-bold text-[#10b981]">{stats.jornadasHoy}</div>
        </div>
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-5">
          <div className="text-[11px] font-medium tracking-[1.5px] uppercase text-[#cbd5e1] mb-2">Alertas pendientes</div>
          <div className="font-mono text-3xl font-bold text-[#f59e0b]">{stats.alertasPendientes}</div>
        </div>
        <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-5">
          <div className="text-[11px] font-medium tracking-[1.5px] uppercase text-[#cbd5e1] mb-2">Jornadas totales</div>
          <div className="font-mono text-3xl font-bold text-white">{stats.jornadasTotal}</div>
        </div>
      </div>
    </div>
  )
}