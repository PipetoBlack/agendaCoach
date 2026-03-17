import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Package, ArrowLeft, ArrowRight, Users, RotateCcw } from 'lucide-react'
import { ClientsQuickList } from '@/components/clients-quick-list'
import { ExpiringPackagesCard } from '@/components/expiring-packages-card'
import { MessageCircle, XCircle, CheckCircle2 } from 'lucide-react'
import { burnSessionAction, updateSessionStatusAction } from './sessions/actions'
import { ConfirmBurnSessionButton } from '@/components/confirm-burn-session-button'
import { ConfirmCancelSessionButton } from '@/components/confirm-cancel-session-button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ weekOffset?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('perfiles')
    .select('nombre_completo, plan_tipo, plan_fin, estado')
    .eq('id', user!.id)
    .single()

  const nowIso = new Date().toISOString()
  const isRestricted = !profile?.estado
    || profile?.plan_tipo === 'plan_vencido'
    || (!!profile?.plan_fin && profile.plan_fin < nowIso)

  if (isRestricted) {
    redirect('/dashboard/cuenta')
  }

  const params = await searchParams
  const offset = Number(params?.weekOffset ?? '0') || 0

  const timeZone = 'America/Santiago'
  const now = new Date()
  const toYmd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(d)
  const todayStr = toYmd(now)
  const today = new Date(new Date(now.toLocaleString('en-US', { timeZone })).getTime())
  const startOfToday = new Date(`${todayStr}T00:00:00`)
  const startOfWeek = new Date(startOfToday)
  const day = startOfWeek.getDay()
  const diffToMonday = (day + 6) % 7
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday + offset * 7)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  const weekStartStr = toYmd(startOfWeek)
  const weekEndStr = toYmd(endOfWeek)
  const formatWeekLabel = (start: Date, end: Date) => {
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
    const startDay = start.toLocaleDateString('es-CL', { day: 'numeric' })
    const endDay = end.toLocaleDateString('es-CL', { day: 'numeric' })
    const startMonth = start.toLocaleDateString('es-CL', { month: 'long' })
    const endMonth = end.toLocaleDateString('es-CL', { month: 'long' })
    return sameMonth
      ? `${startDay} al ${endDay} de ${startMonth}`
      : `${startDay} de ${startMonth} al ${endDay} de ${endMonth}`
  }
  const weekLabel = formatWeekLabel(startOfWeek, endOfWeek)
  const prevOffset = offset - 1
  const nextOffset = offset + 1

  const sevenDaysLater = new Date(today)
  sevenDaysLater.setDate(today.getDate() + 7)
  const sevenDaysLaterStr = toYmd(sevenDaysLater)

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

  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + idx)
    const key = date.toISOString().split('T')[0]
    const weekdayLong = date.toLocaleDateString('es-CL', { weekday: 'long' })
    return {
      key,
      date,
      weekday: weekdayLong.charAt(0).toUpperCase() + weekdayLong.slice(1),
      shortWeekday: date.toLocaleDateString('es-CL', { weekday: 'short' }).toUpperCase(),
      dateLabel: date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
      sessions: weekByDay[key] || [],
      isToday: key === todayStr,
    }
  })

  const dayPairs: Array<typeof weekDays> = []
  for (let i = 0; i < weekDays.length; i += 2) {
    dayPairs.push(weekDays.slice(i, i + 2))
  }

  const statusStyles: Record<
    string,
    { bg: string; text: string; border: string; label: string; dot: string; cardBorder: string; leftAccent: string }
  > = {
    programada: {
      bg: 'bg-[#e8f1ff]',
      text: 'text-[#1d4ed8]',
      border: 'border-l-[#3b82f6]',
      label: 'Programada',
      dot: 'bg-[#1d4ed8]',
      cardBorder: 'border-[#3b82f6]/40',
      leftAccent: 'border-l-[3px] border-l-[#3b82f6]/60',
    },
    completada: {
      bg: 'bg-[#e8f9ef]',
      text: 'text-[#15803d]',
      border: 'border-l-[#16a34a]',
      label: 'Completada',
      dot: 'bg-[#15803d]',
      cardBorder: 'border-[#16a34a]/40',
      leftAccent: 'border-l-[3px] border-l-[#16a34a]/60',
    },
    cancelada: {
      bg: 'bg-[#fff1f1]',
      text: 'text-[#b91c1c]',
      border: 'border-l-[#ef4444]',
      label: 'Cancelada',
      dot: 'bg-[#b91c1c]',
      cardBorder: 'border-[#ef4444]/40',
      leftAccent: 'border-l-[3px] border-l-[#ef4444]/60',
    },
  }

  const displayName = profile?.nombre_completo
    || (user?.user_metadata as any)?.full_name
    || (user?.user_metadata as any)?.name
    || (user?.email ? user.email.split('@')[0] : 'Coach')
  const firstName = displayName?.trim()?.split(/\s+/)[0] || displayName
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const pendingToday = todaySessions.filter((s) => s.estado === 'programada').length
  const pendingText = pendingToday > 0 ? `${pendingToday} ${pendingToday === 1 ? 'sesión pendiente hoy' : 'sesiones pendientes hoy'}` : 'Sin sesiones programadas para hoy'
  const weekdayLabel = today.toLocaleDateString('es-CL', { weekday: 'long', timeZone })
  const dayLabel = today.toLocaleDateString('es-CL', { day: '2-digit', timeZone })
  const monthLabel = today.toLocaleDateString('es-CL', { month: 'long', timeZone })
  const todayLabel = `${weekdayLabel} ${dayLabel} de ${monthLabel}`

  return (
    <div className="flex flex-col gap-6 max-w-4xl w-full mx-auto px-3 sm:px-0">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-5 sm:p-6 shadow-md">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium opacity-90">Hoy, {todayLabel}</span>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold leading-tight">{greeting}, {firstName}</h1>
          <p className="text-sm sm:text-base opacity-90">{pendingText}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xs">
          <ClientsQuickList
            trigger={
              <div className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 text-white shadow-inner">
                <Users className="h-4 w-4" />
                <span className="text-base font-semibold leading-none">{totalClients}</span>
              </div>
            }
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
          <ExpiringPackagesCard
            trigger={
              <div className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 text-white shadow-inner">
                <Package className="h-4 w-4" />
                <span className="text-base font-semibold leading-none">{expiringPackages}</span>
              </div>
            }
            packages={expiringPackagesList.map((p) => ({
              ...p,
              sesiones_totales: Number(p.sesiones_totales ?? 0),
              sesiones_usadas: Number(p.sesiones_usadas ?? 0),
            }))}
          />
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Agendados para hoy</h2>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">No hay sesiones programadas para hoy.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {todaySessions.map((s) => {
                const phone = s.clientes?.telefono?.replace(/\D/g, '') || ''
                const timeLabel = s.hora_sesion ? s.hora_sesion.slice(0, 5) : '—'
                const waUrl = phone
                  ? `https://wa.me/${phone}?text=${encodeURIComponent(
                      `Hola ${s.clientes?.nombre_completo || ''}! Te recuerdo tu sesión programada hoy a las ${timeLabel}.`
                    )}`
                  : ''
                const canBurn = Boolean(s.paquete_id) && s.estado === 'programada'
                const canCancel = s.estado === 'programada'
                const statusLabel = s.estado === 'completada' ? 'Completada' : s.estado === 'cancelada' ? 'Cancelada' : 'Programada'
                const statusTone =
                  s.estado === 'completada'
                    ? 'bg-emerald-100 text-emerald-800'
                    : s.estado === 'cancelada'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-sky-100 text-sky-800'
                const hideActions = s.estado !== 'programada'

                return (
                  <div key={s.id} className="rounded border p-3 bg-muted/30 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium">{s.clientes?.nombre_completo || 'Sin nombre'}</span>
                        <span className="text-muted-foreground">Hoy · {timeLabel}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusTone}`}>{statusLabel}</span>
                    </div>
                    {!hideActions && (
                      <div className="flex items-center gap-2">
                        <ConfirmBurnSessionButton
                          disabled={!canBurn}
                          sessionId={s.id}
                          paqueteId={s.paquete_id ?? ''}
                          clienteId={s.cliente_id}
                          action={burnTodaySession}
                          trigger={(
                            <Button
                              type="button"
                              size="sm"
                              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                              disabled={!canBurn}
                              aria-label="Finalizar sesión"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Finalizar
                            </Button>
                          )}
                        />
                        <ConfirmCancelSessionButton
                          disabled={!canCancel}
                          sessionId={s.id}
                          action={cancelTodaySession}
                          trigger={(
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="flex-1 border border-destructive text-destructive hover:bg-destructive/10"
                              disabled={!canCancel}
                              aria-label="Cancelar sesión"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        />
                        <Button
                          asChild
                          size="sm"
                          className="flex-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          disabled={!waUrl}
                          aria-label="Abrir WhatsApp"
                        >
                          {waUrl ? (
                            <a href={waUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2">
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <MessageCircle className="h-4 w-4" />
                            </span>
                          )}
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

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Calendario semanal</h2>
              <p className="text-xs text-muted-foreground">Desliza para ver los pares de días</p>
            </div>
            <div className="flex items-center justify-center gap-2 bg-muted/60 rounded-full px-2 py-1 shadow-inner w-full max-w-xs">
              <Button asChild variant="ghost" size="icon" className="h-9 w-9" aria-label="Semana anterior">
                <Link href={`?weekOffset=${prevOffset}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex-1 px-2 py-1 text-sm font-semibold text-foreground whitespace-nowrap truncate text-center">
                {offset === 0 ? 'Semana actual' : weekLabel}
              </div>
              {offset !== 0 && (
                <Button asChild variant="ghost" size="icon" className="h-9 w-9" aria-label="Volver a semana actual">
                  <Link href="?weekOffset=0">
                    <RotateCcw className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="icon" className="h-9 w-9" aria-label="Semana siguiente">
                <Link href={`?weekOffset=${nextOffset}`}>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto pb-3 snap-x snap-mandatory space-y-3 px-1">
            {dayPairs.map((pair, pairIdx) => (
              <div
                key={`pair-${pairIdx}`}
                className="grid min-w-full grid-cols-2 gap-3 snap-center"
              >
                {pair.map((day) => (
                  <div
                    key={day.key}
                    className={`relative rounded-2xl border p-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col gap-2 w-full ${day.isToday ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-gradient-to-b from-white to-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="text-2xl font-bold leading-none text-foreground">{day.weekday}</p>
                        <p className="text-sm font-medium text-muted-foreground">{day.dateLabel}</p>
                      </div>
                    </div>

                    {day.sessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin sesiones</p>
                    ) : (
                      <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
                        {day.sessions.map((s) => {
                          const style = statusStyles[s.estado] ?? statusStyles.programada
                          const canCancelFuture = day.date >= startOfToday && s.estado === 'programada'

                          const card = (
                            <div
                              className={`rounded-lg border ${style.cardBorder} ${style.leftAccent} bg-white px-3 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.04)] ${
                                canCancelFuture ? 'cursor-pointer transition-shadow hover:shadow-[0_6px_18px_rgba(0,0,0,0.08)]' : ''
                              }`}
                            >
                              <div className="flex flex-col gap-1">
                                <p className="text-sm font-medium text-foreground leading-snug whitespace-normal break-words text-wrap">
                                  {s.clientes?.nombre_completo || 'Sin nombre'}
                                </p>
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <span className="whitespace-nowrap">{s.hora_sesion?.slice(0, 5) || '--:--'}</span>
                                </div>
                              </div>
                            </div>
                          )

                          if (!canCancelFuture) return <div key={s.id}>{card}</div>

                          return (
                            <AlertDialog key={s.id}>
                              <AlertDialogTrigger asChild>{card}</AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Cancelar esta sesión agendada?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ¿Estás seguro de cancelar? La sesión volverá a estar disponible y tendrás que agendarla manualmente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <form action={cancelScheduledSession}>
                                  <input type="hidden" name="sessionId" value={s.id} />
                                  <AlertDialogFooter>
                                    <AlertDialogCancel type="button">Volver</AlertDialogCancel>
                                    <AlertDialogAction type="submit" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Cancelar sesión
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </form>
                              </AlertDialogContent>
                            </AlertDialog>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
                {pair.length === 1 && <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50" />}
              </div>
            ))}
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

// Server action: cancelar sesión desde el calendario semanal (futuras/actual)
async function cancelScheduledSession(formData: FormData) {
  'use server'
  const sessionId = (formData.get('sessionId') as string) || ''
  if (!sessionId) return
  await updateSessionStatusAction(sessionId, 'cancelada')
}
