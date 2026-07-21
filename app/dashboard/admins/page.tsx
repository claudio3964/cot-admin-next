'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModalNuevoAdmin from './components/ModalNuevoAdmin'
import type { Admin } from './types'

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

const getToken = () => sessionStorage.getItem('admin_token')
const getAdminRol = () => sessionStorage.getItem('admin_rol')

export default function AdminsPage() {
  const router = useRouter()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [accion, setAccion] = useState<string | null>(null)

  const userRol = typeof window !== 'undefined' ? getAdminRol() : ''
  const esSuperAdmin = userRol === 'superadmin'

  const cargarAdmins = async () => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    setLoading(true)
    const headers = { apikey: SB_KEY, Authorization: `Bearer ${token}` }

    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/admins?empresa_id=eq.cot&select=*&order=created_at.asc`,
        { headers }
      )
      const data = await res.json()
      setAdmins(data || [])
    } catch (error) {
      console.error('Error cargando admins:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }
    cargarAdmins()
  }, [router])

  const crearAdmin = async (data: { nombre: string; email: string; password: string; rol: string }) => {
    const token = getToken()
    if (!token) throw new Error('No autenticado')

    const res = await fetch(`${SB_URL}/functions/v1/crear-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        nombre: data.nombre,
        rol: data.rol
      })
    })

    const result = await res.json()
    if (!res.ok) {
      throw new Error(result.message || result.hint || 'Error al crear admin')
    }

    await cargarAdmins()
  }

  const toggleAdminActivo = async (id: string, activo: boolean) => {
    const token = getToken()
    if (!token) return
    if (!confirm(`¿${activo ? 'Desactivar' : 'Activar'} este admin?`)) return

    setAccion(id)

    try {
      await fetch(`${SB_URL}/rest/v1/admins?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ activo: !activo })
      })

      await cargarAdmins()
    } catch (error) {
      console.error('Error toggling admin:', error)
      alert('❌ Error al actualizar')
    } finally {
      setAccion(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl p-8 text-center">
        <div className="text-[#cbd5e1]">Cargando administradores...</div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">👤 Administradores</h2>
        <div className="flex gap-2">
          <button
            onClick={cargarAdmins}
            className="bg-transparent border border-[#1e2d45] rounded-lg px-4 py-2 text-sm text-[#cbd5e1] hover:border-[#3b82f6] hover:text-[#3b82f6] transition"
          >
            ↺ Actualizar
          </button>
          {esSuperAdmin && (
            <button
              onClick={() => setModalOpen(true)}
              className="bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-500/30 transition"
            >
              + Nuevo admin
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-[#111827] border border-[#1e2d45] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1c2537] border-b border-[#1e2d45]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#cbd5e1] uppercase">Creado</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[#cbd5e1] uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#cbd5e1]">
                    No hay administradores registrados
                  </td>
                </tr>
              ) : (
                admins.map((admin) => {
                  const isSuperAdmin = admin.rol === 'superadmin'

                  return (
                    <tr key={admin.id} className="border-b border-[#1e2d45] hover:bg-[#1c2537]/30">
                      <td className="px-4 py-3 font-medium text-white">{admin.nombre || '—'}</td>
                      <td className="px-4 py-3 font-mono text-sm text-[#cbd5e1]">{admin.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          admin.rol === 'superadmin'
                            ? 'bg-green-500/20 text-green-400'
                            : admin.rol === 'despachador'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {admin.rol || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          admin.activo
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {admin.activo ? '● Activo' : '○ Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#cbd5e1]">
                        {admin.created_at ? new Date(admin.created_at).toLocaleDateString('es-UY') : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {esSuperAdmin && !isSuperAdmin && (
                          <button
                            onClick={() => toggleAdminActivo(admin.id, admin.activo)}
                            disabled={accion === admin.id}
                            className={`text-xs px-3 py-1 rounded-md transition ${
                              admin.activo
                                ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                                : 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
                            } disabled:opacity-50`}
                          >
                            {accion === admin.id ? '...' : (admin.activo ? '🚫 Desactivar' : '✓ Activar')}
                          </button>
                        )}
                        {esSuperAdmin && isSuperAdmin && (
                          <span className="text-xs text-[#94a3b8]">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <ModalNuevoAdmin
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCrear={crearAdmin}
      />
    </div>
  )
}