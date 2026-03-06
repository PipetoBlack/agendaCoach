import { createClient } from '@/lib/supabase/server'
import { SmartSessionPlanner } from '@/components/smart-session-planner'

export default async function SessionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [clientsRes, packagesRes, scheduledRes] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nombre_completo')
      .eq('usuario_id', user!.id)
      .order('nombre_completo'),
    supabase
      .from('paquetes_sesiones')
      .select('id, cliente_id, sesiones_totales, sesiones_usadas, fecha_expiracion, estado, creado_en, fecha_inicio, clientes(nombre_completo)')
      .eq('usuario_id', user!.id)
      .order('creado_en', { ascending: false }),
    supabase
      .from('sesiones_programadas')
      .select('paquete_id')
      .eq('usuario_id', user!.id)
      .eq('estado', 'programada'),
  ])

  const clients = (clientsRes.data ?? []) as Array<{ id: string; nombre_completo: string }>
  const packages = (packagesRes.data ?? []) as Array<{
    id: string
    cliente_id: string
    sesiones_totales: number
    sesiones_usadas: number
    fecha_expiracion: string | null
    estado: string
    creado_en?: string
    fecha_inicio?: string | null
    clientes: { nombre_completo: string }
  }>

  const scheduledCountByPackage = new Map<string, number>()
  for (const row of scheduledRes.data ?? []) {
    if (!row.paquete_id) continue
    scheduledCountByPackage.set(row.paquete_id, (scheduledCountByPackage.get(row.paquete_id) ?? 0) + 1)
  }

  const packagesWithScheduled = packages.map((p) => ({
    ...p,
    sesiones_agendadas: scheduledCountByPackage.get(p.id) ?? 0,
  }))

  const packagesPrioritized = [...packagesWithScheduled].sort((a, b) => {
    const ra = a.sesiones_totales - a.sesiones_usadas - (a.sesiones_agendadas ?? 0)
    const rb = b.sesiones_totales - b.sesiones_usadas - (b.sesiones_agendadas ?? 0)
    const hasA = a.estado === 'activo' && ra > 0
    const hasB = b.estado === 'activo' && rb > 0
    if (hasA !== hasB) return hasA ? -1 : 1
    const ta = a.creado_en
      ? new Date(a.creado_en).getTime()
      : a.fecha_inicio
        ? new Date(a.fecha_inicio).getTime()
        : 0
    const tb = b.creado_en
      ? new Date(b.creado_en).getTime()
      : b.fecha_inicio
        ? new Date(b.fecha_inicio).getTime()
        : 0
    return ta - tb
  })

  const clientsWithCapacity = clients.filter((c) =>
    packagesWithScheduled.some((p) => {
      const remaining = p.sesiones_totales - p.sesiones_usadas - (p.sesiones_agendadas ?? 0)
      return p.cliente_id === c.id && p.estado === 'activo' && remaining > 0
    }),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Planifica tu semana</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Organiza las sesiones de tu cliente en segundos: elige días, horarios y duración del plan.
          </p>
        </div>
      </div>

      <SmartSessionPlanner clients={clientsWithCapacity} packages={packagesPrioritized} />
    </div>
  )
}
