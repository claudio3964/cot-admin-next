export interface Viaje {
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
  status?: string
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
}

export interface Jornada {
  id: number
  order_number: string
  chofer_id: string
  data: string | JornadaData
  created_at: string
}