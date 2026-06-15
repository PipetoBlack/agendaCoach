import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Dumbbell } from 'lucide-react'
import { isPlanRestricted, ACTIVATION_ROUTE } from '@/lib/plan'
import { Button } from '@/components/ui/button'
import { SesionesSelector, type SesionItem, type PlantillaResumen } from './sesiones-selector'
import { RutinasFichas, type RutinaFicha, type GrupoFicha } from './rutinas-fichas'

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

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: cliente },
    { data: sesionesRaw },
    { data: rutinasRaw },
    { data: plantillasRaw },
  ] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nombre_completo')
      .eq('id', clienteId)
      .eq('usuario_id', user.id)
      .single(),

    supabase
      .from('sesiones_programadas')
      .select('id, fecha_sesion, hora_sesion')
      .eq('usuario_id', user.id)
      .eq('cliente_id', clienteId)
      .eq('estado', 'programada')
      .gte('fecha_sesion', today)
      .order('fecha_sesion', { ascending: true })
      .order('hora_sesion', { ascending: true }),

    // Rutinas con datos completos de ejercicios para las fichas
    supabase
      .from('rutinas')
      .select(`
        id, nombre, nivel, fecha_inicio, fecha_fin, creado_en,
        rutina_dias(
          id, tipo, foco, orden,
          rutina_ejercicios(
            id, series, repeticiones, peso, descanso_segundos, descanso_serie, modalidad, nombre_custom, orden,
            ejercicios(id, nombre)
          )
        )
      `)
      .eq('cliente_id', clienteId)
      .eq('usuario_id', user.id)
      .order('fecha_inicio', { ascending: false }),

    supabase
      .from('rutinas')
      .select('id, nombre, nivel, rutina_dias(id, tipo, rutina_ejercicios(id))')
      .eq('usuario_id', user.id)
      .is('cliente_id', null)
      .order('creado_en', { ascending: false }),
  ])

  if (!cliente) notFound()

  const iniciales = cliente.nombre_completo
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()

  const rutinas = (rutinasRaw ?? []) as unknown as RutinaFicha[]

  // Filtrar sesiones ya cubiertas por alguna rutina existente
  const sesiones: SesionItem[] = (sesionesRaw ?? [])
    .filter(s => !rutinas.some(r =>
      r.fecha_inicio && r.fecha_fin &&
      s.fecha_sesion >= r.fecha_inicio &&
      s.fecha_sesion <= r.fecha_fin
    ))
    .map(s => ({
      id: s.id,
      fecha_sesion: s.fecha_sesion,
      hora_sesion: s.hora_sesion ?? '',
    }))

  // Agrupar rutinas por rango de fechas (mismas fechas = misma ficha)
  const gruposMap = new Map<string, GrupoFicha>()
  for (const r of rutinas) {
    const key = `${r.fecha_inicio ?? ''}_${r.fecha_fin ?? ''}`
    if (!gruposMap.has(key)) {
      gruposMap.set(key, { key, fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin, rutinas: [] })
    }
    gruposMap.get(key)!.rutinas.push(r)
  }
  const grupos = [...gruposMap.values()].sort((a, b) => {
    if (!a.fecha_inicio) return 1
    if (!b.fecha_inicio) return -1
    return b.fecha_inicio > a.fecha_inicio ? 1 : -1
  })

  // Transformar plantillas a resumen
  type RawDia = { tipo: string; rutina_ejercicios: { id: string }[] }
  type RawPlantilla = { id: string; nombre: string; nivel: string | null; rutina_dias: RawDia[] }
  const plantillas: PlantillaResumen[] = ((plantillasRaw ?? []) as unknown as RawPlantilla[]).map(p => {
    const dias = Array.isArray(p.rutina_dias) ? p.rutina_dias : []
    return {
      id: p.id,
      nombre: p.nombre,
      nivel: p.nivel,
      tipo: dias[0]?.tipo ?? null,
      ejerciciosCount: dias.reduce((a, d) => a + (d.rutina_ejercicios?.length ?? 0), 0),
    }
  })

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-9 w-9 shrink-0">
          <Link href="/dashboard/rutinas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-sm shrink-0">
            {iniciales}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground leading-tight truncate">
              {cliente.nombre_completo}
            </h1>
            <p className="text-xs text-muted-foreground">Rutinas de entrenamiento</p>
          </div>
        </div>
      </div>

      {/* ── Sesiones próximas ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Sesiones próximas
          </h2>
          {sesiones.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {sesiones.length} disponible{sesiones.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <SesionesSelector
          sesiones={sesiones}
          plantillas={plantillas}
          clienteId={clienteId}
          clienteNombre={cliente.nombre_completo}
        />

        {sesiones.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Selecciona una o varias sesiones y asigna una plantilla de entrenamiento.
          </p>
        )}
      </div>

      {/* ── Divisor ── */}
      <div className="border-t border-slate-100" />

      {/* ── Fichas de rutinas ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Rutinas asignadas
          </h2>
          {grupos.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {rutinas.length} rutina{rutinas.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <RutinasFichas
          grupos={grupos}
          clienteId={clienteId}
          clienteNombre={cliente.nombre_completo}
        />
      </div>
    </div>
  )
}
