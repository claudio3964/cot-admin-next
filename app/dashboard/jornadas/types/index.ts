export interface Viaje {
  id?: string
  status?: string
  // epoch ms; texto ISO en viajes viejos del cron; 0 = sin cargar
  inicioReal?: number | string
  finReal?: number | string
  inicioProgramado?: number
  origen?: string
  destino?: string
  departureTime?: string
  arrivalTime?: string
  kmEmpresa?: number
  kmAuto?: number
  tipoServicio?: string
  turno?: string
  acoplado?: boolean
  acopladoKm?: number
  coche?: string
  tomeCese?: boolean
}

export interface Guardia {
  inicio?: string
  fin?: string
  hours?: number
  kmGuardia?: number
  type?: string
  cortadaAuto?: boolean
  viatico?: boolean
}

export interface JornadaData {
  date?: string
  driverName?: string
  driverLegajo?: string
  tipo?: string
  coche?: string
  closed?: boolean
  travels?: Viaje[]
  guards?: Guardia[]
  totalsSnapshot?: {
    kmTotal?: number
    kmViajes?: number
    kmGuardias?: number
    kmTomeCese?: number
    kmAcoplados?: number
    viaticos?: number
    monto?: number
  }
  viaticos?: number
  // Marca de 3a.2: un viaje se editó después del cierre; el snapshot no se recalculó.
  totalsDesactualizados?: {
    at?: number
    edicion_id?: number
  }
  deleted?: boolean
  deleted_at?: number
  deleted_by?: string
  deleted_reason?: string
}

export interface Jornada {
  id: string  // uuid
  order_number: string
  chofer_id: string
  fecha?: string  // columna date, 'YYYY-MM-DD'
  data: string | JornadaData
  created_at: string
}