export interface CocheEstado {
  num: number
  estado: 'servicio' | 'libre' | 'inactivo' | 'taller'
  tallerInfo: TallerInfo | null
}

export interface TallerInfo {
  id: number
  coche_num: number
  motivo: string
  desde: string
  empresa_id: string
}

export interface ViajeActivo {
  coche: number
  chofer: string
  origen: string
  destino: string
  salida: string
  llegada: string
  status: string
}