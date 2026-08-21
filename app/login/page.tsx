'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

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
        triggerShake()
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
        triggerShake()
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
      triggerShake()
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0e1a]">
      {/* FONDO */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1e3a5f]/40 via-[#0a0e1a] to-[#0a0e1a]" />
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} 
        />
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#3b82f6]/10 blur-[120px] animate-pulse" />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[#06b6d4]/10 blur-[100px] animate-pulse" 
          style={{ animationDelay: '2s' }} 
        />
      </div>

      {/* CARD */}
      <div 
        className={`
          relative z-10 w-full max-w-[400px] mx-4
          transition-all duration-700 ease-out
          ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        `}
      >
        <div 
          className={`
            bg-[#111827]/80 backdrop-blur-xl border border-white/10 
            rounded-2xl p-10 shadow-2xl shadow-black/50
            ${shake ? 'animate-shake' : ''}
          `}
        >
          {/* Brand */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#06b6d4] animate-pulse" />
            <span className="font-mono text-[11px] tracking-[4px] text-[#06b6d4] uppercase font-semibold">
              DriverLog
            </span>
          </div>

          {/* Título */}
          <h1 className="text-[26px] font-bold mb-1 text-white tracking-tight">
            Panel de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] to-[#06b6d4]">
              Administración
            </span>
          </h1>
          <p className="text-[#64748b] text-sm mb-8">
            Ingresa tus credenciales para continuar
          </p>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Email */}
            <div className="group">
              <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-[2px] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="
                  w-full bg-[#0f172a]/60 border border-[#1e293b] rounded-xl 
                  px-4 py-3.5 text-white placeholder-[#334155] 
                  outline-none transition-all duration-300
                  focus:border-[#3b82f6]/50 focus:ring-2 focus:ring-[#3b82f6]/10 
                  focus:bg-[#0f172a]/80
                "
                required
              />
            </div>

            {/* Password */}
            <div className="group">
              <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-[2px] mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="
                    w-full bg-[#0f172a]/60 border border-[#1e293b] rounded-xl 
                    px-4 py-3.5 pr-11 text-white placeholder-[#334155] 
                    outline-none transition-all duration-300
                    focus:border-[#3b82f6]/50 focus:ring-2 focus:ring-[#3b82f6]/10 
                    focus:bg-[#0f172a]/80
                  "
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94a3b8] transition-colors"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full relative overflow-hidden 
                bg-gradient-to-r from-[#3b82f6] to-[#2563eb] 
                text-white rounded-xl py-3.5 font-semibold text-sm tracking-wide
                hover:shadow-lg hover:shadow-[#3b82f6]/25 hover:scale-[1.02] 
                active:scale-[0.98] 
                disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed 
                transition-all duration-300 group
              "
            >
              <span className={`
                flex items-center justify-center gap-2 
                transition-all duration-300
                ${loading ? 'opacity-0' : 'opacity-100'}
              `}>
                Ingresar
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>

              {loading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="animate-spin h-5 w-5 text-white" />
                </span>
              )}
            </button>

            {/* Error */}
            {error && (
              <div className="
                flex items-center gap-2 text-[#f87171] text-sm 
                bg-[#ef4444]/10 border border-[#ef4444]/20 
                rounded-lg px-3 py-2.5 animate-fade-in
              ">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[#1e293b] text-center">
            <p className="text-[11px] text-[#475569] tracking-wide">DriverLog Admin v2.0</p>
          </div>
        </div>
      </div>

    </div>
  )
}