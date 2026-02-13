import { createClient } from '@/lib/supabase/server'
import { ClientFormDialog } from '@/components/client-form-dialog'
import { ClientsBoard } from '@/components/clients-board'

export default async function ClientsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clientes')
    .select('id, nombre_completo, rut, correo, telefono, estado, notas, creado_en, fecha_nacimiento, genero')
    .eq('usuario_id', user!.id)
    .order('creado_en', { ascending: false })

  const { data: paquetes } = await supabase
    .from('paquetes_sesiones')
    .select('id, cliente_id, sesiones_totales, sesiones_usadas, estado, fecha_inicio')
    .eq('usuario_id', user!.id)

  const { data: sesionesProgramadas } = await supabase
    .from('sesiones_programadas')
    .select('id, cliente_id, paquete_id, fecha_sesion, hora_sesion, estado')
    .eq('usuario_id', user!.id)

  const { data: sesionesConsumidas } = await supabase
    .from('sesiones_consumidas')
    .select('id, cliente_id, paquete_id, consumida_en, notas, origen')
    .eq('usuario_id', user!.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Administra tu base de clientes
          </p>
        </div>
        <ClientFormDialog />
      </div>
      <ClientsBoard
        clients={clients ?? []}
        paquetes={paquetes ?? []}
        sesionesProgramadas={sesionesProgramadas ?? []}
        sesionesConsumidas={sesionesConsumidas ?? []}
      />
    </div>
  )
}
