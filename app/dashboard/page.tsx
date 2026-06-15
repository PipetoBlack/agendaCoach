import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Package, Users } from 'lucide-react'
import { ClientsQuickList } from '@/components/clients-quick-list'
import { ExpiringPackagesCard } from '@/components/expiring-packages-card'
import { MessageCircle, XCircle, CheckCircle2 } from 'lucide-react'
import { burnSessionAction, updateSessionStatusAction } from './sessions/actions'
import { ConfirmBurnSessionButton } from '@/components/confirm-burn-session-button'
import { ConfirmCancelSessionButton } from '@/components/confirm-cancel-session-button'
import { ACTIVATION_ROUTE, isPlanRestricted } from '@/lib/plan'
import { TodayRutinaWidget } from '@/components/today-rutina-widget'
import { WeeklyCalendarWidget } from '@/components/weekly-calendar-widget'

export default async function DashboardPage() {
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
  const isRestricted = isPlanRestricted(profile, nowIso)

  if (isRestricted) {
    redirect(ACTIVATION_ROUTE)
  }

  const timeZone = 'America/Santiago'
  const now = new Date()
  const toYmd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(d)
  const todayStr = toYmd(now)
  const today = new Date(new Date(now.toLocaleString('en-US', { timeZone })).getTime())

  const sevenDaysLater = new Date(today)
  sevenDaysLater.setDate(today.getDate() + 7)
  const sevenDaysLaterStr = toYmd(sevenDaysLater)

  const [clientsRes, packagesExpiringRes, todaySessionsRes, clientsListRes, packagesListRes, sesionesProgramadasRes, sesionesConsumidasRes, hoyRutinasRes] = await Promise.all([
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

    supabase
      .from('rutinas')
      .select(`
        id, nombre, cliente_id, fecha_inicio, fecha_fin,
        rutina_dias(
          id, tipo, foco, orden,
          rutina_ejercicios(
            id, series, repeticiones, peso, descanso_segundos, modalidad, nombre_custom, orden,
            ejercicios(id, nombre)
          )
        )
      `)
      .eq('usuario_id', user!.id)
      .lte('fecha_inicio', todayStr)
      .or(`fecha_fin.gte.${todayStr},fecha_fin.is.null`),
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
  type RawEj = {
    id: string; series: number; repeticiones: string; peso: string | null
    descanso_segundos: number; modalidad: string; nombre_custom: string | null; orden: number
    ejercicios: { nombre: string } | null
  }
  type RawDiaHoy = { id: string; tipo: string; foco: string; orden: number; rutina_ejercicios: RawEj[] }
  type RawRutinaHoy = { id: string; nombre: string; cliente_id: string; fecha_inicio: string | null; fecha_fin: string | null; rutina_dias: RawDiaHoy[] }

  const hoyRutinasRaw = (hoyRutinasRes.data ?? []) as unknown as RawRutinaHoy[]

  const clienteRutinasHoy = new Map<string, Array<{ id: string; nombre: string; ejercicios: Array<{ id: string; nombre: string; series: number; repeticiones: string; peso: string | null; modalidad: string }> }>>()
  for (const r of hoyRutinasRaw) {
    const dia = [...(r.rutina_dias ?? [])].sort((a, b) => a.orden - b.orden)[0]
    if (!dia) continue
    const ejercicios = [...(dia.rutina_ejercicios ?? [])].sort((a, b) => a.orden - b.orden).map(ej => ({
      id: ej.id,
      nombre: ej.ejercicios?.nombre ?? ej.nombre_custom ?? '—',
      series: ej.series,
      repeticiones: ej.repeticiones,
      peso: ej.peso,
      modalidad: ej.modalidad,
    }))
    const existing = clienteRutinasHoy.get(r.cliente_id) ?? []
    existing.push({ id: r.id, nombre: r.nombre, ejercicios })
    clienteRutinasHoy.set(r.cliente_id, existing)
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
    <div className="flex flex-col gap-6 max-w-4xl w-full mx-auto px-3 sm:px-0 overflow-x-hidden">
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
        <div className="rounded-lg border bg-card p-4 shadow-sm overflow-hidden">
          <h2 className="text-lg font-semibold text-foreground">Agendados para hoy</h2>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">No hay sesiones programadas para hoy.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {todaySessions.map((s) => {
                const rutinaHoy = clienteRutinasHoy.get(s.cliente_id) ?? []
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
                    <TodayRutinaWidget
                      rutinas={rutinaHoy}
                      clienteNombre={s.clientes?.nombre_completo || ''}
                      clienteTelefono={s.clientes?.telefono ?? null}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <WeeklyCalendarWidget />
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

