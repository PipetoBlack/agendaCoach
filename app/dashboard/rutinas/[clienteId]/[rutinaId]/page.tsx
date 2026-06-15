import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarRange, Trash2 } from 'lucide-react'
import { isPlanRestricted, ACTIVATION_ROUTE } from '@/lib/plan'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NuevoDiaDialog } from './nuevo-dia-dialog'
import { AddEjercicioDialog } from './add-ejercicio-dialog'
import { DeleteDiaButton } from './delete-dia-button'
import { DeleteEjercicioButton } from './delete-ejercicio-button'
import { DeleteRutinaButton } from './delete-rutina-button'

const tipoLabel: Record<string, string> = {
  fuerza: 'Fuerza', resistencia: 'Resistencia', hipertrofia: 'Hipertrofia',
  movilidad: 'Movilidad', funcional: 'Funcional', otro: 'Otro',
}
const focoLabel: Record<string, string> = {
  general: 'General', superior: 'Tren superior', inferior: 'Tren inferior', core: 'Core',
}
const tipoColor: Record<string, string> = {
  fuerza: 'bg-blue-50 text-blue-700 border-blue-100',
  resistencia: 'bg-orange-50 text-orange-700 border-orange-100',
  hipertrofia: 'bg-purple-50 text-purple-700 border-purple-100',
  movilidad: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  funcional: 'bg-amber-50 text-amber-700 border-amber-100',
  otro: 'bg-slate-50 text-slate-700 border-slate-100',
}

export default async function RutinaDetailPage({
  params,
}: {
  params: Promise<{ clienteId: string; rutinaId: string }>
}) {
  const { clienteId, rutinaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('perfiles')
    .select('estado, plan_tipo, plan_fin')
    .eq('id', user.id)
    .single()

  if (isPlanRestricted(profile)) redirect(ACTIVATION_ROUTE)

  const [{ data: rutina }, { data: cliente }, { data: ejerciciosLib }] = await Promise.all([
    supabase
      .from('rutinas')
      .select(`
        id, nombre, fecha_inicio, fecha_fin, notas,
        rutina_dias (
          id, nombre, tipo, foco, orden,
          rutina_ejercicios (
            id, orden, series, repeticiones, peso, descanso_segundos, notas, nombre_custom,
            ejercicios ( nombre, grupo_muscular )
          )
        )
      `)
      .eq('id', rutinaId)
      .eq('usuario_id', user.id)
      .single(),
    supabase
      .from('clientes')
      .select('id, nombre_completo')
      .eq('id', clienteId)
      .eq('usuario_id', user.id)
      .single(),
    supabase
      .from('ejercicios')
      .select('id, nombre, categoria, grupo_muscular, foco, es_global')
      .or(`es_global.eq.true,usuario_id.eq.${user.id}`)
      .order('grupo_muscular')
      .order('nombre'),
  ])

  if (!rutina || !cliente) notFound()

  const dias = [...(rutina.rutina_dias ?? [])].sort((a, b) => a.orden - b.orden)

  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

  const whatsappText = encodeURIComponent(
    `*Rutina: ${rutina.nombre}*\n` +
    `📅 ${formatDate(rutina.fecha_inicio)} — ${formatDate(rutina.fecha_fin)}\n\n` +
    dias.map((dia) => {
      const ejercicios = [...(dia.rutina_ejercicios ?? [])].sort((a, b) => a.orden - b.orden)
      return (
        `*${dia.nombre}* — ${tipoLabel[dia.tipo] ?? dia.tipo} · ${focoLabel[dia.foco] ?? dia.foco}\n` +
        ejercicios.map((e) => {
          const nombre = e.nombre_custom ?? (e.ejercicios as any)?.nombre ?? '—'
          const peso = e.peso ? ` · ${e.peso}` : ''
          const descanso = e.descanso_segundos ? ` · ${e.descanso_segundos}s descanso` : ''
          return `  • ${nombre}: ${e.series}x${e.repeticiones}${peso}${descanso}`
        }).join('\n')
      )
    }).join('\n\n')
  )

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-9 w-9 shrink-0">
            <Link href={`/dashboard/rutinas/${clienteId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{cliente.nombre_completo}</p>
            <h1 className="text-xl font-semibold text-foreground leading-tight">{rutina.nombre}</h1>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <CalendarRange className="h-3.5 w-3.5" />
              {formatDate(rutina.fecha_inicio)} — {formatDate(rutina.fecha_fin)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Compartir
            </Button>
          </a>
          <DeleteRutinaButton rutinaId={rutinaId} clienteId={clienteId} />
        </div>
      </div>

      {/* Días */}
      <div className="flex flex-col gap-4">
        {dias.map((dia) => {
          const ejercicios = [...(dia.rutina_ejercicios ?? [])].sort((a, b) => a.orden - b.orden)
          return (
            <div key={dia.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              {/* Día header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{dia.nombre}</span>
                  <Badge variant="outline" className={`text-xs ${tipoColor[dia.tipo] ?? ''}`}>
                    {tipoLabel[dia.tipo] ?? dia.tipo}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                    {focoLabel[dia.foco] ?? dia.foco}
                  </Badge>
                </div>
                <DeleteDiaButton diaId={dia.id} rutinaId={rutinaId} clienteId={clienteId} />
              </div>

              {/* Ejercicios */}
              <div className="px-5 py-3 flex flex-col gap-2">
                {ejercicios.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Sin ejercicios aún.</p>
                ) : (
                  ejercicios.map((ej, idx) => {
                    const nombre = ej.nombre_custom ?? (ej.ejercicios as any)?.nombre ?? '—'
                    const grupoMuscular = (ej.ejercicios as any)?.grupo_muscular
                    return (
                      <div key={ej.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-bold text-muted-foreground/50 w-5 shrink-0">{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {ej.series} series × {ej.repeticiones} reps
                              {ej.peso ? ` · ${ej.peso}` : ''}
                              {ej.descanso_segundos ? ` · ${ej.descanso_segundos}s` : ''}
                              {grupoMuscular ? ` · ${grupoMuscular}` : ''}
                            </p>
                          </div>
                        </div>
                        <DeleteEjercicioButton
                          ejercicioRutinaId={ej.id}
                          rutinaId={rutinaId}
                          clienteId={clienteId}
                        />
                      </div>
                    )
                  })
                )}
                <div className="pt-1">
                  <AddEjercicioDialog
                    rutinaDiaId={dia.id}
                    rutinaId={rutinaId}
                    clienteId={clienteId}
                    ejercicios={ejerciciosLib ?? []}
                  />
                </div>
              </div>
            </div>
          )
        })}

        <NuevoDiaDialog rutinaId={rutinaId} clienteId={clienteId} />
      </div>
    </div>
  )
}
