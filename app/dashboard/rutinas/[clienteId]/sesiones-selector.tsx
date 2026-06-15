'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Check, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { asignarPlantillaACliente } from '../actions'

export type SesionItem = {
  id: string
  fecha_sesion: string
  hora_sesion: string
}

export type PlantillaResumen = {
  id: string
  nombre: string
  nivel: string | null
  tipo: string | null
  ejerciciosCount: number
}

const fmtCorta = (fecha: string) =>
  new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

const fmtBadge = (s: SesionItem) =>
  `${fmtCorta(s.fecha_sesion)} · ${s.hora_sesion?.slice(0, 5) ?? ''}`

export function SesionesSelector({
  sesiones,
  plantillas,
  clienteId,
  clienteNombre,
}: {
  sesiones: SesionItem[]
  plantillas: PlantillaResumen[]
  clienteId: string
  clienteNombre: string
}) {
  const [selSesiones, setSelSesiones] = useState<Set<string>>(new Set())
  const [selPlantillas, setSelPlantillas] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const toggleSesion = (id: string) =>
    setSelSesiones(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const togglePlantilla = (id: string) =>
    setSelPlantillas(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const sesionesSeleccionadas = sesiones.filter(s => selSesiones.has(s.id))
  const dates = sesionesSeleccionadas.map(s => s.fecha_sesion).sort()
  const fechaInicio = dates[0] ?? null
  const fechaFin = dates[dates.length - 1] ?? null

  const openDialog = () => { setSelPlantillas(new Set()); setError(null); setDialogOpen(true) }

  const handleAsignar = () => {
    if (selPlantillas.size === 0 || !fechaInicio || !fechaFin) return
    setError(null)
    startTransition(async () => {
      let lastId: string | null = null
      for (const pId of selPlantillas) {
        const result = await asignarPlantillaACliente({
          plantillaId: pId,
          clienteId,
          fechaInicio,
          fechaFin,
        })
        if (result.error) { setError(result.error); return }
        if (result.id) lastId = result.id
      }
      setDialogOpen(false)
      setSelSesiones(new Set())
      setSelPlantillas(new Set())
      // Si solo se asignó una plantilla, ir directo al detalle
      if (selPlantillas.size === 1 && lastId) {
        router.push(`/dashboard/rutinas/${clienteId}/${lastId}`)
      } else {
        router.refresh()
      }
    })
  }

  if (sesiones.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-6 text-center">
        <Calendar className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Sin sesiones próximas disponibles</p>
      </div>
    )
  }

  return (
    <>
      {/* ── Cuadrícula compacta de sesiones ── */}
      <div className="grid grid-cols-2 gap-2">
        {sesiones.map(s => {
          const on = selSesiones.has(s.id)
          return (
            <button key={s.id} type="button" onClick={() => toggleSesion(s.id)}
              className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left transition ${
                on ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                on ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
              }`}>
                {on && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground capitalize leading-tight truncate">
                  {fmtCorta(s.fecha_sesion)}
                </p>
                <p className="text-[11px] text-muted-foreground">{s.hora_sesion?.slice(0, 5)} hrs</p>
              </div>
            </button>
          )
        })}
      </div>

      {selSesiones.size > 0 && (
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 w-full" onClick={openDialog}>
          <Dumbbell className="h-4 w-4" />
          Asignar plantilla · {selSesiones.size} sesión{selSesiones.size !== 1 ? 'es' : ''}
        </Button>
      )}

      {/* ── Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asignar rutina a {clienteNombre.split(' ')[0]}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Sesiones seleccionadas */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Días seleccionados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sesionesSeleccionadas.map(s => (
                  <Badge key={s.id} variant="outline" className="capitalize text-xs font-normal">
                    {fmtBadge(s)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Plantillas — multi-selección */}
            {plantillas.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <Dumbbell className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Sin plantillas disponibles</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Crea una plantilla en la sección de Rutinas primero.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Selecciona una o varias plantillas
                  </p>
                  {selPlantillas.size > 0 && (
                    <span className="text-xs text-emerald-600 font-medium">{selPlantillas.size} selec.</span>
                  )}
                </div>

                {plantillas.map(p => {
                  const on = selPlantillas.has(p.id)
                  return (
                    <button key={p.id} type="button" onClick={() => togglePlantilla(p.id)}
                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
                        on ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        on ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                      }`}>
                        {on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 shrink-0">
                        <Dumbbell className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{p.nombre}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {p.ejerciciosCount} ej.
                          {p.nivel ? ` · ${p.nivel}` : ''}
                          {p.tipo ? ` · ${p.tipo}` : ''}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-between pt-3 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleAsignar}
                disabled={isPending || selPlantillas.size === 0}>
                {isPending
                  ? 'Asignando...'
                  : `Asignar${selPlantillas.size > 1 ? ` (${selPlantillas.size})` : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
