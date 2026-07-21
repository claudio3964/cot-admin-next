'use client'

import { useState } from 'react'

interface ModalTallerProps {
  isOpen: boolean
  cocheNum: number | null
  motivoActual: string
  onClose: () => void
  onGuardar: (motivo: string) => void
  onQuitar: () => void
}

export default function ModalTaller({
  isOpen,
  cocheNum,
  motivoActual,
  onClose,
  onGuardar,
  onQuitar
}: ModalTallerProps) {
  const [motivo, setMotivo] = useState('')

  if (!isOpen || !cocheNum) return null

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl w-[400px] max-w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-1">Coche {cocheNum}</h3>
        <p className="text-sm text-[#cbd5e1] mb-4">Anotá el estado o motivo de taller</p>

        <textarea
          rows={4}
          value={motivo || motivoActual}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Limpieza interior, revisión frenos..."
          className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg p-3 text-sm text-white placeholder:text-[#94a3b8] outline-none focus:border-[#3b82f6] resize-vertical"
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onGuardar(motivo)}
            className="flex-1 bg-blue-500 text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-85 transition"
          >
            Marcar en taller
          </button>
          <button
            onClick={onQuitar}
            className="flex-1 bg-transparent border border-red-500 text-red-400 rounded-lg py-2.5 text-sm font-medium hover:bg-red-500/10 transition"
          >
            Quitar de taller
          </button>
          <button
            onClick={onClose}
            className="bg-transparent border border-[#1e2d45] text-[#cbd5e1] rounded-lg px-4 py-2.5 text-sm hover:border-[#3b82f6] transition"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
