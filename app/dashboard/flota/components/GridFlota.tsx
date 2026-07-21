'use client'

import { useState } from 'react'
import { CocheEstado } from '../types'

interface GridFlotaProps {
  coches: CocheEstado[]
  filtro: string
  onCocheClick: (num: number) => void
}

const COLORES: Record<string, string> = {
  servicio: '#ef4444',
  libre: '#10b981',
  inactivo: '#f59e0b',
  taller: '#3b82f6'
}

const COLORES_CLASS: Record<string, string> = {
  servicio: 'bg-red-500',
  libre: 'bg-green-500',
  inactivo: 'bg-yellow-500',
  taller: 'bg-blue-500'
}

export default function GridFlota({ coches, filtro, onCocheClick }: GridFlotaProps) {
  const [tooltip, setTooltip] = useState<{ num: number, x: number, y: number } | null>(null)

  const filtered = filtro === 'todos' 
    ? coches 
    : coches.filter(c => c.estado === filtro)

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {filtered.map((c) => (
          <div
            key={c.num}
            onClick={() => onCocheClick(c.num)}
            onMouseEnter={(e) => {
              const rect = (e.target as HTMLElement).getBoundingClientRect()
              setTooltip({ num: c.num, x: rect.left, y: rect.top - 10 })
            }}
            onMouseLeave={() => setTooltip(null)}
            className={`
              w-12 h-10 rounded-md flex items-center justify-center text-xs font-mono font-bold text-white cursor-pointer
              transition-transform hover:scale-110
              ${COLORES_CLASS[c.estado]}
              ${c.estado === 'inactivo' ? 'opacity-40' : ''}
            `}
          >
            {c.num}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-[#111827] border border-[#1e2d45] rounded-lg px-4 py-3 text-sm min-w-[180px] shadow-xl"
          style={{ left: tooltip.x, top: tooltip.y - 100 }}
        >
          <div className="font-semibold text-white mb-1">Coche {tooltip.num}</div>
          <div className="text-[#cbd5e1] text-xs">
            {coches.find(c => c.num === tooltip.num)?.estado === 'servicio' && 'En servicio'}
            {coches.find(c => c.num === tooltip.num)?.estado === 'libre' && 'Disponible'}
            {coches.find(c => c.num === tooltip.num)?.estado === 'inactivo' && 'Sin actividad'}
            {coches.find(c => c.num === tooltip.num)?.estado === 'taller' && 'En taller'}
          </div>
          {coches.find(c => c.num === tooltip.num)?.tallerInfo?.motivo && (
            <div className="text-[#94a3b8] text-xs mt-1">
              {coches.find(c => c.num === tooltip.num)?.tallerInfo?.motivo}
            </div>
          )}
        </div>
      )}
    </>
  )
}