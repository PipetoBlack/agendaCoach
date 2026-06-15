import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Dumbbell, Users, ChevronRight, PackageCheck } from 'lucide-react'
import { isPlanRestricted, ACTIVATION_ROUTE } from '@/lib/plan'

export default async function RutinasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('perfiles')
    .select('estado, plan_tipo, plan_fin')
    .eq('id', user.id)
    .single()

  if (isPlanRestricted(profile)) redirect(ACTIVATION_ROUTE)

  // Clientes con paquetes activos y sesiones disponibles
  const { data: paquetes } = await supabase
    .from('paquetes_sesiones')
    .select('cliente_id, sesiones_totales, sesiones_usadas, fecha_expiracion, clientes(id, nombre_completo)')
    .eq('usuario_id', user.id)
    .eq('estado', 'activo')

  // Agrupar por cliente, quedarse solo con los que tienen sesiones restantes
  const clientesMap = new Map<string, {
    id: string
    nombre_completo: string
    sesionesRestantes: number
    proximoVencimiento: string | null
  }>()

  for (const p of paquetes ?? []) {
    const restantes = Number(p.sesiones_totales) - Number(p.sesiones_usadas)
    if (restantes <= 0) continue
    const cliente = p.clientes as { id: string; nombre_completo: string } | null
    if (!cliente) continue

    const existing = clientesMap.get(cliente.id)
    if (existing) {
      existing.sesionesRestantes += restantes
      if (
        p.fecha_expiracion &&
        (!existing.proximoVencimiento || p.fecha_expiracion < existing.proximoVencimiento)
      ) {
        existing.proximoVencimiento = p.fecha_expiracion
      }
    } else {
      clientesMap.set(cliente.id, {
        id: cliente.id,
        nombre_completo: cliente.nombre_completo,
        sesionesRestantes: restantes,
        proximoVencimiento: p.fecha_expiracion ?? null,
      })
    }
  }

  const clientes = Array.from(clientesMap.values()).sort((a, b) =>
    a.nombre_completo.localeCompare(b.nombre_completo)
  )

  // Contar rutinas existentes por cliente
  const clienteIds = clientes.map((c) => c.id)
  const { data: rutinasCount } = clienteIds.length
    ? await supabase
        .from('rutinas')
        .select('cliente_id')
        .eq('usuario_id', user.id)
        .in('cliente_id', clienteIds)
    : { data: [] }

  const rutinasPorCliente = (rutinasCount ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.cliente_id] = (acc[r.cliente_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <Dumbbell className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Rutinas</h1>
            <p className="text-sm text-muted-foreground">Selecciona un cliente para gestionar sus rutinas</p>
          </div>
        </div>
      </div>

      {clientes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">Sin clientes con sesiones activas</p>
          <p className="text-sm text-muted-foreground mt-1">
            Los clientes aparecen aquí cuando tienen un paquete activo con sesiones disponibles.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {clientes.map((cliente) => {
            const numRutinas = rutinasPorCliente[cliente.id] ?? 0
            const iniciales = cliente.nombre_completo
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')
              .toUpperCase()

            return (
              <Link
                key={cliente.id}
                href={`/dashboard/rutinas/${cliente.id}`}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-sm">
                    {iniciales}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{cliente.nombre_completo}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <PackageCheck className="h-3.5 w-3.5" />
                        {cliente.sesionesRestantes} sesión{cliente.sesionesRestantes !== 1 ? 'es' : ''} restante{cliente.sesionesRestantes !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {numRutinas === 0
                          ? 'Sin rutinas aún'
                          : `${numRutinas} rutina${numRutinas !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
