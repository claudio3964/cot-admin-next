'use client'

import { CocheEstado } from '../types'

interface StatsFlotaProps {
  coches: CocheEstado[]
}

export default function StatsFlota({ coches }: StatsFlotaProps) {
  const enServicio = coches.filter(c => c.estado === 'servicio').length
  const libres = coches.filter(c => c.estado === 'libre').length
  const inactivos = coches.filter(c => c.estado === 'inactivo').length
  const taller = coches.filter(c => c.estado === 'taller').length

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4 border-l-4 border-l-red-500">
        <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">En servicio</div>
        <div className="font-mono text-2xl font-bold text-red-400 mt-1">{enServicio}</div>
      </div>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4 border-l-4 border-l-green-500">
        <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">Libres</div>
        <div className="font-mono text-2xl font-bold text-green-400 mt-1">{libres}</div>
      </div>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4 border-l-4 border-l-yellow-500">
        <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">Sin actividad</div>
        <div className="font-mono text-2xl font-bold text-yellow-400 mt-1">{inactivos}</div>
      </div>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-4 border-l-4 border-l-blue-500">
        <div className="text-xs text-[#cbd5e1] uppercase tracking-wider">Taller</div>
        <div className="font-mono text-2xl font-bold text-blue-400 mt-1">{taller}</div>
      </div>
    </div>
  )
}