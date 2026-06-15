import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, BookCopy, Library } from 'lucide-react'
import { isPlanRestricted, ACTIVATION_ROUTE } from '@/lib/plan'
import { ClientesActivos } from './clientes-activos'
import { PlantillaWizard } from './plantilla-wizard'
import { PlantillaCard, type PlantillaConDatos } from './plantilla-card'
import { BibliotecaDialog } from './biblioteca-dialog'

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

  const today = new Date().toISOString().split('T')[0]

  // Solo clientes con sesiones FUTURAS programadas (desde hoy en adelante)
  const { data: sesiones } = await supabase
    .from('sesiones_programadas')
    .select('cliente_id, fecha_sesion, clientes(id, nombre_completo, creado_en)')
    .eq('usuario_id', user.id)
    .eq('estado', 'programada')
    .gte('fecha_sesion', today)
    .order('fecha_sesion', { ascending: true })

  // Agrupar por cliente — contar sesiones futuras y guardar la más próxima
  const clientesMap = new Map<string, {
    id: string
    nombre_completo: string
    creado_en: string
    sesionesFuturas: number
    proximaSesion: string | null
  }>()

  for (const s of sesiones ?? []) {
    const raw = s.clientes
    const c = (Array.isArray(raw) ? raw[0] : raw) as unknown as { id: string; nombre_completo: string; creado_en: string } | null
    if (!c) continue
    const existing = clientesMap.get(c.id)
    if (existing) {
      existing.sesionesFuturas += 1
      if (!existing.proximaSesion || s.fecha_sesion < existing.proximaSesion) {
        existing.proximaSesion = s.fecha_sesion
      }
    } else {
      clientesMap.set(c.id, {
        id: c.id,
        nombre_completo: c.nombre_completo,
        creado_en: c.creado_en,
        sesionesFuturas: 1,
        proximaSesion: s.fecha_sesion,
      })
    }
  }

  // Ordenar por fecha de registro DESC (más reciente primero)
  const clientes = Array.from(clientesMap.values()).sort(
    (a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
  )

  // Plantillas con todos sus datos para mostrar en el dialog de detalle
  const { data: plantillasRaw } = await supabase
    .from('rutinas')
    .select(`
      id, nombre, nivel, notas, creado_en,
      rutina_dias(
        id, tipo, foco, orden,
        rutina_ejercicios(
          id, series, repeticiones, peso, descanso_segundos, descanso_serie, modalidad, nombre_custom, orden,
          ejercicios(id, nombre)
        )
      )
    `)
    .eq('usuario_id', user.id)
    .is('cliente_id', null)
    .order('creado_en', { ascending: false })

  const plantillas = (plantillasRaw ?? []) as unknown as PlantillaConDatos[]

  // Librería de ejercicios para el wizard y la biblioteca
  const { data: ejerciciosRaw } = await supabase
    .from('ejercicios')
    .select('id, nombre, grupo_muscular, es_global')
    .or(`es_global.eq.true,usuario_id.eq.${user.id}`)
    .order('nombre', { ascending: true })

  type EjLib = { id: string; nombre: string; grupo_muscular: string; es_global: boolean }
  const ejercicios = (ejerciciosRaw ?? []) as unknown as EjLib[]

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">

      {/* Sección clientes activos */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Clientes con sesiones activas
            </h2>
          </div>
          {clientes.length > 0 && (
            <span className="text-xs text-muted-foreground">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {clientes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
            <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Sin clientes con sesiones próximas</p>
            <p className="text-xs text-muted-foreground mt-1">
              Los clientes aparecen aquí cuando tienen sesiones agendadas a partir de hoy.
            </p>
          </div>
        ) : (
          <ClientesActivos clientes={clientes} />
        )}
      </div>

      {/* Divisor */}
      <div className="border-t border-slate-100" />

      {/* Sección plantillas */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookCopy className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Plantillas de entrenamiento
            </h2>
          </div>
          <PlantillaWizard ejercicios={ejercicios} />
        </div>

        <p className="text-xs text-muted-foreground -mt-2">
          Crea rutinas sin asignarlas a ningún cliente. Más adelante podrás aplicarlas directamente.
        </p>

        {plantillas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
            <BookCopy className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Sin plantillas aún</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Crea una rutina reutilizable para ahorrar tiempo con tus alumnos.
            </p>
            <div className="flex justify-center">
              <PlantillaWizard ejercicios={ejercicios} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {plantillas.map(p => (
              <PlantillaCard key={p.id} plantilla={p} ejerciciosLib={ejercicios} />
            ))}
          </div>
        )}
      </div>

      {/* Divisor */}
      <div className="border-t border-slate-100" />

      {/* Sección biblioteca */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Biblioteca de ejercicios
            </h2>
          </div>
          <BibliotecaDialog ejercicios={ejercicios} />
        </div>
        <p className="text-xs text-muted-foreground">
          Catálogo de ejercicios disponibles. Añade los tuyos para encontrarlos rápido al crear plantillas.
        </p>
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{ejercicios.filter(e => e.es_global).length}</span> ejercicios globales
            {' · '}
            <span className="font-semibold text-foreground">{ejercicios.filter(e => !e.es_global).length}</span> propios
          </p>
        </div>
      </div>
    </div>
  )
}
