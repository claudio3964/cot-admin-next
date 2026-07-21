'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SB_KEY },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()

      if (!res.ok || !data.access_token) {
        setError('Email o contraseña incorrectos')
        setLoading(false)
        return
      }

      const rolRes = await fetch(
        `${SB_URL}/rest/v1/admins?email=eq.${email}&select=rol,nombre&limit=1`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${data.access_token}` } }
      )
      const admins = await rolRes.json()

      if (!Array.isArray(admins) || admins.length === 0) {
        setError('Usuario no autorizado para este panel')
        setLoading(false)
        return
      }

      sessionStorage.setItem('admin_token', data.access_token)
      sessionStorage.setItem('admin_refresh_token', data.refresh_token || '')
      sessionStorage.setItem('admin_email', email)
      sessionStorage.setItem('admin_rol', admins[0].rol)
      sessionStorage.setItem('admin_nombre', admins[0].nombre)

      router.push('/dashboard')
    } catch (err) {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
      <div className="w-[380px] bg-[#111827] border border-[#1e2d45] rounded-2xl p-10">
        <div className="font-mono text-[11px] tracking-[3px] text-[#06b6d4] uppercase mb-2">DriverLog</div>
        <h1 className="text-2xl font-semibold mb-8 text-white">Panel de <span className="text-[#3b82f6]">Administración</span></h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-xs font-medium text-[#cbd5e1] uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg p-3 text-white outline-none focus:border-[#3b82f6]"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-xs font-medium text-[#cbd5e1] uppercase tracking-wider mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1c2537] border border-[#1e2d45] rounded-lg p-3 text-white outline-none focus:border-[#3b82f6]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3b82f6] text-white rounded-lg py-3 font-semibold hover:opacity-85 disabled:opacity-50 transition"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
          {error && <div className="text-[#ef4444] text-sm text-center mt-3">{error}</div>}
        </form>
      </div>
    </div>
  )
}