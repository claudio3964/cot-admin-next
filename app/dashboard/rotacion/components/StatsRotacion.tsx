'use client'

import { FuncionarioRotacion } from '../types'

interface StatsRotacionProps {
  funcionarios: FuncionarioRotacion[]
  vigencia: string
  temporada: string
}

export default function StatsRotacion({ funcionarios, vigencia, temporada }: StatsRotacionProps) {
  const enServicio = funcionarios.filter(r => r.servicio && !r.servicio.es_descanso).length
  const descanso = funcionarios.filter(r => r.servicio && r.servicio.es_descanso).length
  const puedeAgregar = funcionarios.filter(r => r.servicio && r.servicio.puede_agregar).length

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
        <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">Vigencia actual</div>
        <div className="font-mono text-base text-[#06b6d4] mt-1">{vigencia || '—'}</div>
      </div>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
        <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">Temporada</div>
        <div className="font-mono text-base text-white mt-1">{temporada || 'invierno'}</div>
      </div>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
        <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">En servicio hoy</div>
        <div className="font-mono text-2xl font-bold text-green-400 mt-1">{enServicio}</div>
      </div>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
        <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">De descanso hoy</div>
        <div className="font-mono text-2xl font-bold text-[#cbd5e1] mt-1">{descanso}</div>
      </div>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4">
        <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">Pueden agregar</div>
        <div className="font-mono text-2xl font-bold text-yellow-400 mt-1">{puedeAgregar}</div>
      </div>
    </div>
  )
}