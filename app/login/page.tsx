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
  const [loginError, setLoginError] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const triggerLoginError = () => {
    setLoginError(true)
    setTimeout(() => setLoginError(false), 600)
  }

  const triggerLoginSuccess = () => {
    setLoginSuccess(true)
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
        triggerLoginError()
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
        triggerLoginError()
        setLoading(false)
        return
      }

      sessionStorage.setItem('admin_token', data.access_token)
      sessionStorage.setItem('admin_refresh_token', data.refresh_token || '')
      sessionStorage.setItem('admin_email', email)
      sessionStorage.setItem('admin_rol', admins[0].rol)
      sessionStorage.setItem('admin_nombre', admins[0].nombre)

      triggerLoginSuccess()

      setTimeout(() => {
        router.push('/dashboard')
      }, 700)
    } catch (err) {
      setError('Error de conexión')
      triggerLoginError()
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0c10] text-slate-100 selection:bg-cyan-500/30">
      
      {/* Fondo industrial de precisión (Patrón de grilla fina en lugar de orbes borrosos genéricos) */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} 
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-gradient-to-b from-blue-600/10 to-transparent blur-[100px]" />
      </div>

      {/* Tarjeta con estructura sólida y luz de elevación trasera intensa */}
      <div 
        className={`
          relative z-10 w-full max-w-[420px] mx-4
          transition-all duration-500 ease-out
          ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        {/* Luz trasera más amplia y brillante */}
        <div className="absolute -inset-2 bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-transparent rounded-2xl blur-3xl opacity-100 pointer-events-none" />

        {/* Contenedor principal con un borde superior ligeramente más iluminado (efecto bisel) */}
        <div className="relative bg-[#12161f] border border-slate-700/60 rounded-xl p-8 md:p-10 shadow-2xl shadow-black">
          {/* Tag de Marca / Metadata */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="font-mono text-[11px] tracking-[3px] text-cyan-400 uppercase font-medium">
                DriverLog RutaUY
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-500 px-2 py-0.5 rounded border border-slate-800 bg-slate-900/50">
              v2.0
            </span>
          </div>

          {/* Título Principal con jerarquía editorial */}
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
            Panel de <span className="font-normal text-slate-400 italic">Administración</span>
          </h1>
          <p className="text-slate-400 text-sm mb-8 font-normal">
            Autenticación segura para control de flota y logística.
          </p>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Campo Email */}
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-[1.5px] mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operaciones@empresa.com"
                className={`
                  w-full bg-[#090b10] border border-slate-800 rounded-lg 
                  px-3.5 py-3 text-sm text-slate-100 placeholder-slate-600 
                  outline-none transition-all duration-200
                  focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20
                  ${loginError ? 'login-error' : ''}
                  ${loginSuccess ? 'login-success' : ''}
                `}
                required
              />
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-[1.5px] mb-2">
                Contraseña de Acceso
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`
                    w-full bg-[#090b10] border border-slate-800 rounded-lg 
                    px-3.5 py-3 pr-10 text-sm text-slate-100 placeholder-slate-600 
                    outline-none transition-all duration-200
                    focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20
                    ${loginError ? 'login-error' : ''}
                    ${loginSuccess ? 'login-success' : ''}
                  `}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón de Ingreso con diseño sobrio y táctil */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full relative overflow-hidden mt-2
                bg-slate-100 hover:bg-white text-slate-950
                rounded-lg py-3 font-medium text-sm tracking-wide
                active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none
                transition-all duration-200 group flex items-center justify-center gap-2
              "
            >
              <span className={`flex items-center gap-2 transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                Acceder al Sistema
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>

              {loading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="animate-spin h-4 w-4 text-slate-950" />
                </span>
              )}
            </button>

            {/* Mensaje de Error */}
            {error && (
              <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-950/30 border border-rose-900/40 rounded-lg px-3 py-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>

          {/* Footer discreto */}
          <div className="mt-8 pt-5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>SECURE GATEWAY</span>
            <span>RESTRICTED ACCESS</span>
          </div>

        </div>
      </div>
    </div>
  )
}