'use client'

import { FuncionarioRotacion } from '../types'

interface TablaRotacionProps {
  funcionarios: FuncionarioRotacion[]
  filtroTexto: string
  filtroEstado: string
}

export default function TablaRotacion({ funcionarios, filtroTexto, filtroEstado }: TablaRotacionProps) {
  const formatServicio = (hora: string | null, destino: string | null, tipo: string | null) => {
    if (!hora && !destino) return null
    if (!hora && destino) return <span className="text-[#94a3b8] text-xs">{destino}</span>
    
    const color = tipo === 'DIRECTO' ? '#06b6d4' : tipo === 'TURNO' ? '#e2e8f0' : '#94a3b8'
    return (
      <div className="leading-6">
        <span className="font-mono text-xs text-green-400">{hora}</span>
        <span className="text-xs ml-1" style={{ color }}>{destino || ''}</span>
        {tipo && <span className="text-[10px] text-[#94a3b8] ml-1">{tipo}</span>}
      </div>
    )
  }

  const filtered = funcionarios.filter(r => {
  const matchTexto = !filtroTexto || 
    (r.apellidos_nombres || '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
    (r.nro_fun || '').toLowerCase().includes(filtroTexto.toLowerCase())
  
  let matchEstado: boolean = true
  if (filtroEstado === 'servicio') matchEstado = !!(r.servicio && !r.servicio.es_descanso)
  if (filtroEstado === 'descanso') matchEstado = !!(r.servicio && r.servicio.es_descanso)
  if (filtroEstado === 'agregar') matchEstado = !!(r.servicio && r.servicio.puede_agregar)
  
  return matchTexto && matchEstado
})

  if (filtered.length === 0) {
    return (
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-8 text-center">
        <div className="text-[#cbd5e1]">No hay funcionarios que coincidan con los filtros</div>
      </div>
    )
  }

  return (
    <div className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#1c2537] border-b border-[#1e2d45]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Pos.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">N° Fun</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Servicio 1</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Servicio 2</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Servicio 3</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Servicio 4</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const s = r.servicio
              const esDescanso = s?.es_descanso || false
              const puedeAgregar = s?.puede_agregar || false

              const srv1 = s ? formatServicio(s.servicio_1_hora, s.servicio_1_destino, s.servicio_1_tipo) : null
              const srv2 = s ? formatServicio(s.servicio_2_hora, s.servicio_2_destino, s.servicio_2_tipo) : null
              const srv3 = s ? formatServicio(s.servicio_3_hora, s.servicio_3_destino, s.servicio_3_tipo) : null
              const srv4 = s ? formatServicio(s.servicio_4_hora, s.servicio_4_destino, s.servicio_4_tipo) : null

              let estadoBadge = esDescanso 
                ? <span className="text-xs px-2 py-1 rounded-full bg-gray-600/30 text-[#cbd5e1]">🟢 Descanso</span>
                : puedeAgregar 
                ? <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">+ Puede agregar</span>
                : <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">● En servicio</span>

              if (r.es_suplente) {
                estadoBadge = (
                  <>
                    {estadoBadge}
                    <div className="text-[10px] text-yellow-400 font-mono mt-1">suplente de {r.funcionario_titular}</div>
                  </>
                )
              }

              return (
                <tr key={r.id} className={`border-b border-[#1e2d45] hover:bg-[#1c2537]/30 ${esDescanso ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-sm text-[#3b82f6]">{r.posicion_actual}</td>
                  <td className="px-4 py-3 font-mono text-sm text-[#e2e8f0]">{r.nro_fun}</td>
                  <td className="px-4 py-3 font-medium text-white">{r.apellidos_nombres}</td>
                  <td className="px-4 py-3">{esDescanso ? <span className="text-[#94a3b8] text-xs">— DESCANSO —</span> : (srv1 || '—')}</td>
                  <td className="px-4 py-3">{srv2 || '—'}</td>
                  <td className="px-4 py-3">{srv3 || '—'}</td>
                  <td className="px-4 py-3">{srv4 || '—'}</td>
                  <td className="px-4 py-3">{estadoBadge}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}