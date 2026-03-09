import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/stat-card'
import { Package } from 'lucide-react'
import { ClientsQuickList } from '@/components/clients-quick-list'
import { ExpiringPackagesCard } from '@/components/expiring-packages-card'
import { burnSessionAction, updateSessionStatusAction } from './sessions/actions'
import { ConfirmBurnSessionButton } from '@/components/confirm-burn-session-button'
import { ConfirmCancelSessionButton } from '@/components/confirm-cancel-session-button'

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

  const [clientsRes, packagesExpiringRes, todaySessionsRes, weekSessionsRes, clientsListRes, packagesListRes, sesionesProgramadasRes, sesionesConsumidasRes] = await Promise.all([
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
      .select('id, cliente_id, paquete_id, fecha_sesion, hora_sesion, estado, clientes(nombre_completo, telefono)')
      .eq('usuario_id', user!.id)
      .eq('fecha_sesion', todayStr)
      .order('hora_sesion', { ascending: true }),
    supabase
      .from('sesiones_programadas')
      .select('id, cliente_id, paquete_id, fecha_sesion, hora_sesion, estado, clientes(nombre_completo, telefono)')
      .eq('usuario_id', user!.id)
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
    supabase
      .from('sesiones_programadas')
      .select('id, cliente_id, paquete_id, fecha_sesion, hora_sesion, estado')
      .eq('usuario_id', user!.id),
    supabase
      .from('sesiones_consumidas')
      .select('id, cliente_id, paquete_id, consumida_en, notas, origen')
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
  const sesionesProgramadas = (sesionesProgramadasRes.data ?? []) as Array<{
    id: string
    cliente_id: string
    paquete_id: string | null
    fecha_sesion: string
    hora_sesion: string
    estado: string
  }>
  const sesionesConsumidas = (sesionesConsumidasRes.data ?? []) as Array<{
    id: string
    cliente_id: string
    paquete_id: string | null
    consumida_en: string
    notas: string | null
    origen: string | null
  }>
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
    cliente_id: string
    paquete_id: string | null
    fecha_sesion: string
    hora_sesion: string
    estado: string
    clientes: { nombre_completo: string; telefono: string | null }
  }>
  const weekSessions = (weekSessionsRes.data ?? []) as Array<{
    id: string
    cliente_id: string
    paquete_id: string | null
    fecha_sesion: string
    hora_sesion: string
    estado: string
    clientes: { nombre_completo: string; telefono: string | null }
  }>

  const weekByDay = weekSessions.reduce<Record<string, typeof weekSessions>>(
    (acc, session) => {
      acc[session.fecha_sesion] = acc[session.fecha_sesion] || []
      acc[session.fecha_sesion].push(session)
      return acc
    },
    {},
  )

  const statusStyles: Record<
    string,
    { bg: string; text: string; border: string; label: string }
  > = {
    programada: {
      bg: 'bg-[#e8f1ff]',
      text: 'text-[#1d4ed8]',
      border: 'border-l-[#3b82f6]',
      label: 'Programada',
    },
    completada: {
      bg: 'bg-[#e8f9ef]',
      text: 'text-[#15803d]',
      border: 'border-l-[#16a34a]',
      label: 'Sesión quemada',
    },
    cancelada: {
      bg: 'bg-[#fff1f1]',
      text: 'text-[#b91c1c]',
      border: 'border-l-[#ef4444]',
      label: 'Cancelada',
    },
  }

  const displayName = (user?.user_metadata as any)?.full_name || (user?.user_metadata as any)?.name || (user?.email ? user.email.split('@')[0] : 'Coach')
  const firstName = displayName?.trim()?.split(/\s+/)[0] || displayName
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const pendingToday = todaySessions.filter((s) => s.estado === 'programada').length
  const pendingText = pendingToday > 0 ? `${pendingToday} ${pendingToday === 1 ? 'sesión pendiente hoy' : 'sesiones pendientes hoy'}` : 'Sin sesiones programadas para hoy'

  return (
    <div className="flex flex-col gap-6 max-w-4xl w-full mx-auto">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-5 sm:p-6 shadow-md">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium opacity-90">Hoy</span>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold leading-tight">{greeting}, {firstName}</h1>
          <p className="text-sm sm:text-base opacity-90">{pendingText}</p>
        </div>
        <div className="mt-4 grid gap-4 grid-cols-2 items-stretch">
          <div className="h-full w-full flex p-0 bg-transparent border-0 shadow-none">
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
              sesionesProgramadas={sesionesProgramadas}
              sesionesConsumidas={sesionesConsumidas}
            />
          </div>
          <div className="h-full w-full flex p-0 bg-transparent border-0 shadow-none">
            <ExpiringPackagesCard
              packages={expiringPackagesList.map((p) => ({
                ...p,
                sesiones_totales: Number(p.sesiones_totales ?? 0),
                sesiones_usadas: Number(p.sesiones_usadas ?? 0),
              }))}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Agendados hoy</h2>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">No hay sesiones programadas para hoy.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {todaySessions.map((s) => {
                const phone = s.clientes?.telefono?.replace(/\D/g, '') || ''
                const waUrl = phone
                  ? `https://wa.me/${phone}?text=${encodeURIComponent(
                      `Hola ${s.clientes?.nombre_completo || ''}! Te recuerdo tu sesión programada hoy a las ${s.hora_sesion}.`
                    )}`
                  : ''
                const canBurn = Boolean(s.paquete_id) && s.estado === 'programada'
                const canCancel = s.estado === 'programada'
                const statusLabel = s.estado === 'completada' ? 'Quemada' : s.estado === 'cancelada' ? 'Cancelada' : 'Programada'
                const statusTone = s.estado === 'completada' ? 'text-green-700 bg-green-100' : s.estado === 'cancelada' ? 'text-destructive bg-destructive/10' : 'text-muted-foreground bg-muted/60'
                const hideActions = s.estado !== 'programada'

                return (
                  <div key={s.id} className="rounded border p-3 bg-muted/30 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium">{s.clientes?.nombre_completo || 'Sin nombre'}</span>
                        <span className="text-muted-foreground">Hoy · {s.hora_sesion}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusTone}`}>{statusLabel}</span>
                    </div>
                    {!hideActions && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <ConfirmBurnSessionButton
                          disabled={!canBurn}
                          sessionId={s.id}
                          paqueteId={s.paquete_id ?? ''}
                          clienteId={s.cliente_id}
                          action={burnTodaySession}
                        />
                        <ConfirmCancelSessionButton
                          disabled={!canCancel}
                          sessionId={s.id}
                          action={cancelTodaySession}
                        />
                        <Button asChild variant="secondary" size="sm" className="w-full" disabled={!waUrl}>
                          {waUrl ? <a href={waUrl} target="_blank" rel="noreferrer">WhatsApp</a> : <span>WhatsApp</span>}
                        </Button>
                      </div>
                    )}
                    {!s.paquete_id && s.estado === 'programada' && (
                      <p className="text-xs text-muted-foreground">No hay paquete asociado; asigna uno para quemar sesión.</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Calendario semanal</h2>
              <p className="text-xs text-muted-foreground">{weekLabel}</p>
            </div>
            <div className="flex gap-2 flex-wrap text-sm">
              <Button asChild variant="outline" size="sm">
                <Link href={`?weekOffset=${prevOffset}`}>◀</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`?weekOffset=${nextOffset}`}>▶</Link>
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 grid-cols-2">
            {Array.from({ length: 7 }).map((_, idx) => {
              const d = new Date(startOfWeek)
              d.setDate(startOfWeek.getDate() + idx)
              const dStr = d.toISOString().split('T')[0]
              const sessions = weekByDay[dStr] || []
              const weekday = d.toLocaleDateString('es-CL', { weekday: 'short' }).toUpperCase()
              const dateLabel = d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })

              return (
                <div
                  key={dStr}
                  className={`rounded-xl border border-[#e5e7eb] bg-white shadow-sm p-3 flex flex-col gap-3 ${idx === 6 ? 'col-span-2' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{weekday}</span>
                      <span className="text-xl font-semibold text-foreground leading-none">{dateLabel}</span>
                    </div>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Sin sesiones</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {sessions.map((s) => {
                        const style = statusStyles[s.estado] ?? statusStyles.programada
                        const label = style.label
                        return (
                          <div
                            key={s.id}
                            className={`rounded-xl border border-transparent ${style.bg} px-3 py-2 flex items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${style.border}`}
                            style={{ borderLeftWidth: '6px' }}
                          >
                            <div className="flex flex-col leading-tight">
                              <span className={`text-[11px] font-semibold uppercase tracking-wide ${style.text}`}>{label}</span>
                              <span className={`text-sm font-semibold ${style.text}`}>{s.hora_sesion?.slice(0, 5) || '--:--'}</span>
                              <span className="text-sm text-foreground">{s.clientes?.nombre_completo || 'Sin nombre'}</span>
                            </div>
                          </div>
                        )
                      })}
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

// Server action: quemar sesión y marcar como completada
async function burnTodaySession(formData: FormData) {
  'use server'
  const paqueteId = (formData.get('paqueteId') as string) || ''
  const clienteId = (formData.get('clienteId') as string) || ''
  const sessionId = (formData.get('sessionId') as string) || ''
  if (!paqueteId) return
  await burnSessionAction({ paqueteId, clienteId })
  await updateSessionStatusAction(sessionId, 'completada')
}

// Server action: cancelar sesión (queda visible para reprogramar)
async function cancelTodaySession(formData: FormData) {
  'use server'
  const sessionId = (formData.get('sessionId') as string) || ''
  if (!sessionId) return
  await updateSessionStatusAction(sessionId, 'cancelada')
}
