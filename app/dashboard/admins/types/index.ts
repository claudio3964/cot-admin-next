export interface Admin {
  id: string
  nombre: string
  email: string
  rol: 'superadmin' | 'despachador' | 'supervisor'
  activo: boolean
  created_at: string
  empresa_id: string
}