import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/stat-card'
import { Package } from 'lucide-react'
import { ClientsQuickList } from '@/components/clients-quick-list'
import { ExpiringPackagesCard } from '@/components/expiring-packages-card'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ weekOffset?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const params = await searchParams
  const offset = Number(params?.weekOffset ?? '0') || 0

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const startOfWeek = new Date(today)
  const day = startOfWeek.getDay()
  const diffToMonday = (day + 6) % 7
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday + offset * 7)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  const weekStartStr = startOfWeek.toISOString().split('T')[0]
  const weekEndStr = endOfWeek.toISOString().split('T')[0]
  const weekLabel = `${startOfWeek.toLocaleDateString('es-CL')} a ${endOfWeek.toLocaleDateString('es-CL')}`
  const prevOffset = offset - 1
  const nextOffset = offset + 1

  const sevenDaysLater = new Date(today)
  sevenDaysLater.setDate(today.getDate() + 7)
  const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0]

  const [clientsRes, packagesExpiringRes, todaySessionsRes, weekSessionsRes, clientsListRes, packagesListRes] = await Promise.all([
    supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', user!.id),
    supabase
      .from('paquetes_sesiones')
      .select('id, cliente_id, estado, sesiones_totales, sesiones_usadas, fecha_expiracion, clientes(nombre_completo)')
      .eq('usuario_id', user!.id)
      .in('estado', ['activo', 'completado'])
      .or(
        `and(fecha_expiracion.gte.${todayStr},fecha_expiracion.lte.${sevenDaysLaterStr}),fecha_expiracion.lt.${todayStr}`
      )
      .order('fecha_expiracion', { ascending: true }),
    supabase
      .from('sesiones_programadas')
      .select('id, fecha_sesion, hora_sesion, estado, clientes(nombre_completo)')
      .eq('usuario_id', user!.id)
      .eq('estado', 'programada')
      .eq('fecha_sesion', todayStr)
      .order('hora_sesion', { ascending: true }),
    supabase
      .from('sesiones_programadas')
      .select('id, fecha_sesion, hora_sesion, estado, clientes(nombre_completo)')
      .eq('usuario_id', user!.id)
      .eq('estado', 'programada')
      .gte('fecha_sesion', weekStartStr)
      .lte('fecha_sesion', weekEndStr)
      .order('fecha_sesion', { ascending: true })
      .order('hora_sesion', { ascending: true }),
    supabase
      .from('clientes')
      .select('id, nombre_completo, rut, estado, correo, telefono, notas, creado_en, fecha_nacimiento, genero')
      .eq('usuario_id', user!.id)
      .order('nombre_completo'),
    supabase
      .from('paquetes_sesiones')
      .select('id, cliente_id, estado, sesiones_totales, sesiones_usadas, fecha_inicio, fecha_expiracion, creado_en')
      .eq('usuario_id', user!.id),
  ])

  const totalClients = clientsRes.count ?? 0
  const expiringPackagesList = ((packagesExpiringRes.data ?? []) as Array<{
    id: string
    cliente_id: string
    estado: string
    sesiones_totales: number
    sesiones_usadas: number
    fecha_expiracion: string
    clientes: { nombre_completo: string | null } | null
  }>).filter((p) => Number(p.sesiones_totales ?? 0) > Number(p.sesiones_usadas ?? 0))
  const expiringPackages = expiringPackagesList.length
  const clientsList = (clientsListRes.data ?? []) as Array<{
    id: string
    nombre_completo: string
    rut: string | null
    estado: string | null
    correo: string | null
    telefono: string | null
    notas: string | null
    creado_en: string
    fecha_nacimiento: string | null
    genero: string | null
  }>
  const activeClientIds = (packagesListRes.data ?? [])
    .filter((p) => {
      const estado = (p.estado || '').toLowerCase()
      const total = Number(p.sesiones_totales ?? 0)
      const used = Number(p.sesiones_usadas ?? 0)
      const hasRemaining = total > used
      // Solo consideramos activo si el paquete está marcado como activo y aún tiene sesiones disponibles
      return estado === 'activo' && hasRemaining
    })
    .map((p) => p.cliente_id)
  // Prioritize real activity (tiene paquete vigente o con sesiones restantes) over estado "nuevo"
  const clientsWithDerivedStatus = clientsList.map((c) => ({
    ...c,
    derivedStatus: activeClientIds.includes(c.id)
      ? 'activo'
      : c.estado === 'nuevo'
        ? 'nuevo'
        : 'inactivo',
  }))
  const todaySessions = (todaySessionsRes.data ?? []) as Array<{
    id: string
    fecha_sesion: string
    hora_sesion: string
    estado: string
    clientes: { nombre_completo: string }
  }>
  const weekSessions = (weekSessionsRes.data ?? []) as Array<{
    id: string
    fecha_sesion: string
    hora_sesion: string
    estado: string
    clientes: { nombre_completo: string }
  }>

  const weekByDay = weekSessions.reduce<Record<string, typeof weekSessions>>(
    (acc, session) => {
      acc[session.fecha_sesion] = acc[session.fecha_sesion] || []
      acc[session.fecha_sesion].push(session)
      return acc
    },
    {},
  )

  return (
    <div className="flex flex-col gap-6 max-w-4xl w-full mx-auto">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Panel</h1>
        <p className="text-sm text-muted-foreground">Tu resumen rápido del día</p>
      </div>

      <div className="grid gap-3 grid-cols-2">
        <ClientsQuickList
          clients={clientsWithDerivedStatus}
          count={totalClients}
          activeClientIds={activeClientIds}
          paquetes={(packagesListRes.data ?? []).map((p) => ({
            id: p.id as string,
            cliente_id: p.cliente_id as string,
            estado: p.estado as string,
            sesiones_totales: Number(p.sesiones_totales ?? 0),
            sesiones_usadas: Number(p.sesiones_usadas ?? 0),
            fecha_inicio: p.fecha_inicio || null,
            fecha_expiracion: p.fecha_expiracion || null,
            creado_en: p.creado_en || null,
          }))}
        />
        <ExpiringPackagesCard
          packages={expiringPackagesList.map((p) => ({
            ...p,
            sesiones_totales: Number(p.sesiones_totales ?? 0),
            sesiones_usadas: Number(p.sesiones_usadas ?? 0),
          }))}
        />
      </div>

      <div className="grid gap-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Agendados hoy</h2>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">No hay sesiones programadas para hoy.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {todaySessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded border p-2 bg-muted/40 text-sm">
                  <div className="flex flex-col">
                    <span className="text-foreground font-medium">{s.clientes?.nombre_completo || 'Sin nombre'}</span>
                    <span className="text-muted-foreground">Hoy · {s.hora_sesion}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Programada</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Calendario semanal</h2>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1 flex-wrap gap-2">
            <span>{weekLabel}</span>
            <div className="flex gap-2 flex-wrap">
              <Button asChild variant="outline" size="sm">
                <Link href={`?weekOffset=${prevOffset}`}>◀ Semana previa</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`?weekOffset=${nextOffset}`}>Semana siguiente ▶</Link>
              </Button>
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 7 }).map((_, idx) => {
              const d = new Date(startOfWeek)
              d.setDate(startOfWeek.getDate() + idx)
              const dStr = d.toISOString().split('T')[0]
              const sessions = weekByDay[dStr] || []
              const label = d.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit' })
              return (
                <div key={dStr} className="rounded border bg-background p-3 text-sm space-y-2 min-h-[140px] flex flex-col">
                  <div className="flex items-center justify-between text-foreground font-medium">
                    <span className="capitalize">{label}</span>
                    <span className="text-xs text-muted-foreground">{sessions.length} ses.</span>
                  </div>
                  {sessions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin sesiones</p>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map((s) => (
                        <div key={s.id} className="rounded border p-2 bg-muted/40">
                          <div className="text-xs text-muted-foreground">{s.hora_sesion}</div>
                          <div className="text-foreground text-sm font-medium leading-tight">{s.clientes?.nombre_completo || 'Sin nombre'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
