'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000
const REFRESH_BUFFER_MS = 60 * 1000
const FALLBACK_REFRESH_DELAY_MS = 45 * 60 * 1000
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const

function decodeJwtExpMs(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = JSON.parse(atob(padded))
    return typeof json.exp === 'number' ? json.exp * 1000 : null
  } catch {
    return null
  }
}

// Guardia central de sesión para /dashboard: cierra sesión por inactividad (20 min, cualquier
// interacción la reinicia) y renueva el access_token en silencio contra el refresh_token antes
// de que venza. Ambos mecanismos son independientes: la inactividad cierra la sesión aunque el
// token acabe de renovarse, por trazabilidad/auditoría.
export function useSessionGuard() {
  const router = useRouter()
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token')
    if (!token) {
      router.push('/login')
      return
    }

    const cerrarSesion = () => {
      sessionStorage.clear()
      router.push('/login')
    }

    const reiniciarInactividad = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      inactivityTimer.current = setTimeout(cerrarSesion, INACTIVITY_TIMEOUT_MS)
    }

    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, reiniciarInactividad))
    reiniciarInactividad()

    const programarRefresh = (accessToken: string) => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)

      const expMs = decodeJwtExpMs(accessToken)
      const delay = expMs
        ? Math.max(expMs - Date.now() - REFRESH_BUFFER_MS, 0)
        : FALLBACK_REFRESH_DELAY_MS

      refreshTimer.current = setTimeout(async () => {
        const refreshToken = sessionStorage.getItem('admin_refresh_token')
        if (!refreshToken) return

        try {
          const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: SB_KEY },
            body: JSON.stringify({ refresh_token: refreshToken })
          })
          const data = await res.json()

          if (!res.ok || !data.access_token) {
            cerrarSesion()
            return
          }

          sessionStorage.setItem('admin_token', data.access_token)
          sessionStorage.setItem('admin_refresh_token', data.refresh_token || refreshToken)
          programarRefresh(data.access_token)
        } catch {
          cerrarSesion()
        }
      }, delay)
    }

    programarRefresh(token)

    return () => {
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, reiniciarInactividad))
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [router])
}
