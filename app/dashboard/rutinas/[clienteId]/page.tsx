import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, CalendarRange, ChevronRight, Dumbbell } from 'lucide-react'
import { isPlanRestricted, ACTIVATION_ROUTE } from '@/lib/plan'
import { Button } from '@/components/ui/button'
import { NuevaRutinaDialog } from './nueva-rutina-dialog'

export default async function ClienteRutinasPage({
  params,
}: {
  params: Promise<{ clienteId: string }>
}) {
  const { clienteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('perfiles')
    .select('estado, plan_tipo, plan_fin')
    .eq('id', user.id)
    .single()

  if (isPlanRestricted(profile)) redirect(ACTIVATION_ROUTE)

  const [{ data: cliente }, { data: rutinas }] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nombre_completo')
      .eq('id', clienteId)
      .eq('usuario_id', user.id)
      .single(),
    supabase
      .from('rutinas')
      .select('id, nombre, fecha_inicio, fecha_fin, creado_en, rutina_dias(id)')
      .eq('cliente_id', clienteId)
      .eq('usuario_id', user.id)
      .order('fecha_inicio', { ascending: false }),
  ])

  if (!cliente) notFound()

  const iniciales = cliente.nombre_completo
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()

  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-9 w-9">
          <Link href="/dashboard/rutinas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-sm">
            {iniciales}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{cliente.nombre_completo}</h1>
            <p className="text-sm text-muted-foreground">Rutinas de entrenamiento</p>
          </div>
        </div>
        <NuevaRutinaDialog clienteId={clienteId} />
      </div>

      {/* Lista de rutinas */}
      {(!rutinas || rutinas.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Dumbbell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">Sin rutinas aún</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Crea la primera rutina para {cliente.nombre_completo.split(' ')[0]}.
          </p>
          <NuevaRutinaDialog clienteId={clienteId} variant="outline" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rutinas.map((rutina) => {
            const dias = Array.isArray(rutina.rutina_dias) ? rutina.rutina_dias.length : 0
            return (
              <Link
                key={rutina.id}
                href={`/dashboard/rutinas/${clienteId}/${rutina.id}`}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                    <Dumbbell className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{rutina.nombre}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarRange className="h-3.5 w-3.5" />
                        {formatDate(rutina.fecha_inicio)} — {formatDate(rutina.fecha_fin)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {dias} día{dias !== 1 ? 's' : ''}
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
