import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SessionsTable } from '@/components/sessions-table'
import { PackagesOverview } from '@/components/packages-overview'
import { ScheduleSessionDialog } from '@/components/schedule-session-dialog'
import { PackageFormDialog } from '@/components/package-form-dialog'

export default async function SessionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [clientsRes, sessionsRes, packagesRes] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nombre_completo')
      .eq('usuario_id', user!.id)
      .order('nombre_completo'),
    supabase
      .from('sesiones_programadas')
      .select('id, fecha_sesion, hora_sesion, estado, clientes(nombre_completo)')
      .eq('usuario_id', user!.id)
      .order('fecha_sesion', { ascending: false })
      .order('hora_sesion', { ascending: false }),
    supabase
      .from('paquetes_sesiones')
      .select('id, cliente_id, sesiones_totales, sesiones_usadas, fecha_expiracion, estado, clientes(nombre_completo)')
      .eq('usuario_id', user!.id)
      .order('creado_en', { ascending: false }),
  ])

  const clients = (clientsRes.data ?? []) as Array<{ id: string; nombre_completo: string }>
  const sessions = (sessionsRes.data ?? []) as Array<{
    id: string
    fecha_sesion: string
    hora_sesion: string
    estado: string
    clientes: { nombre_completo: string }
  }>
  const packages = (packagesRes.data ?? []) as Array<{
    id: string
    cliente_id: string
    sesiones_totales: number
    sesiones_usadas: number
    fecha_expiracion: string | null
    estado: string
    clientes: { nombre_completo: string }
  }>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Sesiones</h1>
          <p className="text-sm text-muted-foreground">
            Programa y gestiona tus sesiones de coaching
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PackageFormDialog clients={clients} />
          <ScheduleSessionDialog clients={clients} packages={packages} />
        </div>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">Todas las sesiones</TabsTrigger>
          <TabsTrigger value="packages">Paquetes</TabsTrigger>
        </TabsList>
        <TabsContent value="sessions" className="mt-4">
          <SessionsTable sessions={sessions} />
        </TabsContent>
        <TabsContent value="packages" className="mt-4">
          <PackagesOverview packages={packages} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
