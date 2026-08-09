'use client'

import { useState } from 'react'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

interface ModalConfirmarBorradoProps {
  orderNumber: string
  onClose: () => void
  onBorrado: () => void
}

export default function ModalConfirmarBorrado({ orderNumber, onClose, onBorrado }: ModalConfirmarBorradoProps) {
  const [motivo, setMotivo] = useState('')
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmar = async () => {
    const token = sessionStorage.getItem('admin_token')
    const adminEmail = sessionStorage.getItem('admin_email')
    if (!token || !adminEmail) {
      setError('Sesión no encontrada.')
      return
    }

    setBorrando(true)
    setError(null)
    try {
      const res = await fetch(`${SB_URL}/rest/v1/rpc/borrar_jornada`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_order_number: orderNumber,
          p_admin_email: adminEmail,
          p_motivo: motivo.trim()
        })
      })

      if (!res.ok) {
        let mensaje = 'Error al borrar la jornada.'
        try {
          const body = await res.json()
          if (body?.message) mensaje = body.message
        } catch {}
        setError(mensaje)
        setBorrando(false)
        return
      }

      onBorrado()
    } catch (err) {
      setError('Error de conexión.')
      setBorrando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-[#1e2d45] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#e2e8f0]">🗑 Borrar jornada</h2>
        </div>

        <div className="p-6">
          <p className="text-sm text-[#cbd5e1] mb-4">
            Vas a borrar la jornada <span className="font-mono text-white">{orderNumber}</span>.
            No se elimina físicamente — queda marcada como borrada y disponible para auditoría.
          </p>

          <label className="block text-xs font-medium text-[#cbd5e1] uppercase tracking-wider mb-1.5">
            Motivo (obligatorio)
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg p-3 text-white outline-none focus:border-[#3b82f6] resize-none"
            placeholder="¿Por qué se borra esta jornada?"
          />

          {error && <div className="text-[#ef4444] text-sm mt-3">{error}</div>}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={borrando}
              className="bg-transparent border border-[#1e2d45] rounded-lg px-4 py-2 text-sm text-[#cbd5e1] hover:border-[#3b82f6] hover:text-[#3b82f6] transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={borrando || motivo.trim().length === 0}
              className="bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {borrando ? 'Borrando...' : 'Confirmar borrado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
