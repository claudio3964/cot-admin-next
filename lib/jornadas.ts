// Extraído de ModalEditarAsignacion.tsx cuando anularGuardia() (mensajes/page.tsx) se
// volvió el segundo caller real de buscarJornadasDelChofer() -- antes vivía privada ahí
// porque tenía un solo consumidor.
//
// SB_URL/SB_KEY duplicadas acá a propósito (mismo criterio ya usado en el resto del
// repo -- constantes por archivo, no compartidas). Suma a la deuda ya anotada en
// "Próximos pasos" sobre centralizar credenciales Supabase; no se resuelve en este frente.

const SB_URL = 'https://frjeivfpldcigklwepqt.supabase.co'
const SB_KEY = 'sb_publishable_6A7tufjD-rTAUAPfxyziyw_3kXMumzJ'

export interface GuardiaRaw {
  id: string
  inicio?: string
  type?: string
  status?: string
}

function parseData(raw: unknown): Record<string, any> {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return (raw as Record<string, any>) || {}
}

export async function buscarJornadasDelChofer(legajo: string, token: string): Promise<Array<{ orderNumber: string; data: Record<string, any> }>> {
  const res = await fetch(
    `${SB_URL}/rest/v1/jornadas?chofer_id=eq.${legajo}&empresa_id=eq.cot&select=order_number,data&order=id.desc&limit=50`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` } }
  )
  const rows = await res.json()
  if (!Array.isArray(rows)) return []
  return rows
    .map(r => ({ orderNumber: r.order_number, data: parseData(r.data) }))
    .filter(j => !j.data.deleted)
}
