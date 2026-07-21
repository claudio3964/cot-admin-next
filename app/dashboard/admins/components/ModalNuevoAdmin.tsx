'use client'

import { useState } from 'react'

interface ModalNuevoAdminProps {
  isOpen: boolean
  onClose: () => void
  onCrear: (data: { nombre: string; email: string; password: string; rol: string }) => Promise<void>
}

export default function ModalNuevoAdmin({ isOpen, onClose, onCrear }: ModalNuevoAdminProps) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('despachador')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!nombre || !email || !password) {
      setError('Completá todos los campos')
      setLoading(false)
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setLoading(false)
      return
    }

    try {
      await onCrear({ nombre, email, password, rol })
      setNombre('')
      setEmail('')
      setPassword('')
      setRol('despachador')
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al crear admin')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl w-[420px] max-w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-1">➕ Nuevo Administrador</h3>
        <p className="text-sm text-[#cbd5e1] mb-4">Se creará un usuario en Supabase Auth y se registrará en la tabla admins.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[#cbd5e1] uppercase tracking-wider mb-1">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan Pérez"
              className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#94a3b8] outline-none focus:border-[#3b82f6]"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-[#cbd5e1] uppercase tracking-wider mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@cot.com.uy"
              className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#94a3b8] outline-none focus:border-[#3b82f6]"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-[#cbd5e1] uppercase tracking-wider mb-1">Contraseña temporal</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#94a3b8] outline-none focus:border-[#3b82f6]"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-[#cbd5e1] uppercase tracking-wider mb-1">Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
            >
              <option value="despachador">Despachador</option>
              <option value="supervisor">Supervisor</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-85 disabled:opacity-50 transition"
            >
              {loading ? 'Creando...' : 'Crear admin'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-transparent border border-[#1e2d45] text-[#cbd5e1] rounded-lg py-2.5 text-sm hover:border-[#3b82f6] transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}