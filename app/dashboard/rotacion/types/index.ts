export interface ServicioRotacion {
  id: number
  posicion: number
  temporada: string
  servicio_1_hora: string | null
  servicio_1_destino: string | null
  servicio_1_tipo: string | null
  servicio_2_hora: string | null
  servicio_2_destino: string | null
  servicio_2_tipo: string | null
  servicio_3_hora: string | null
  servicio_3_destino: string | null
  servicio_3_tipo: string | null
  servicio_4_hora: string | null
  servicio_4_destino: string | null
  servicio_4_tipo: string | null
  es_descanso: boolean
  puede_agregar: boolean
  vigencia_desde: string
  vigencia_hasta: string | null
}

export interface FuncionarioRotacion {
  id: number
  posicion_actual: number
  nro_fun: string
  apellidos_nombres: string
  es_suplente: boolean
  funcionario_titular: string | null
  empresa_id: string
  created_at: string
  updated_at: string
  servicio?: ServicioRotacion | null
}