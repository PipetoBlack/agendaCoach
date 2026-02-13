import { createClient } from '@/lib/supabase/server'
import { ClientsTable } from '@/components/clients-table'
import { ClientFormDialog } from '@/components/client-form-dialog'

export default async function ClientsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clientes')
    .select('id, nombre_completo, rut, correo, telefono, estado, notas, creado_en')
    .eq('usuario_id', user!.id)
    .order('creado_en', { ascending: false })

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
      <ClientsTable clients={clients ?? []} />
    </div>
  )
}
