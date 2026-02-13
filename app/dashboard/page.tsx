import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/stat-card'
import { UpcomingSessions } from '@/components/upcoming-sessions'
import { Users, CalendarDays, Package, CheckCircle } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [clientsRes, sessionsRes, packagesRes, upcomingRes] = await Promise.all([
    supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', user!.id),
    supabase
      .from('sesiones_programadas')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', user!.id)
      .eq('estado', 'programada'),
    supabase
      .from('paquetes_sesiones')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', user!.id)
      .eq('estado', 'activo'),
    supabase
      .from('sesiones_programadas')
      .select('id, fecha_sesion, hora_sesion, estado, clientes(nombre_completo)')
      .eq('usuario_id', user!.id)
      .eq('estado', 'programada')
      .gte('fecha_sesion', new Date().toISOString().split('T')[0])
      .order('fecha_sesion', { ascending: true })
      .order('hora_sesion', { ascending: true })
      .limit(5),
  ])

  const totalClients = clientsRes.count ?? 0
  const scheduledSessions = sessionsRes.count ?? 0
  const activePackages = packagesRes.count ?? 0
  const upcoming = (upcomingRes.data ?? []) as Array<{
    id: string
    fecha_sesion: string
    hora_sesion: string
    estado: string
    clientes: { nombre_completo: string }
  }>

  // Count completed sessions
  const completedRes = await supabase
    .from('sesiones_programadas')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', user!.id)
    .eq('estado', 'completada')

  const completedSessions = completedRes.count ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Panel</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de tu práctica de coaching
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de clientes"
          value={totalClients}
          description="Base de clientes activa"
          icon={Users}
        />
        <StatCard
          title="Sesiones agendadas"
          value={scheduledSessions}
          description="Próximas sesiones"
          icon={CalendarDays}
        />
        <StatCard
          title="Paquetes activos"
          value={activePackages}
          description="Paquetes en curso"
          icon={Package}
        />
        <StatCard
          title="Sesiones completadas"
          value={completedSessions}
          description="Total de sesiones realizadas"
          icon={CheckCircle}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <UpcomingSessions sessions={upcoming} />
      </div>
    </div>
  )
}
