'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Trash2, Dumbbell, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { deleteRutina } from '../actions'

// ── Types ─────────────────────────────────────────────────────────────────────

type EjFicha = {
  id: string
  series: number
  repeticiones: string
  peso: string | null
  descanso_segundos: number
  descanso_serie: number | null
  modalidad: string
  nombre_custom: string | null
  orden: number
  ejercicios: { nombre: string } | null
}

type DiaFicha = {
  tipo: string
  foco: string
  orden: number
  rutina_ejercicios: EjFicha[]
}

export type RutinaFicha = {
  id: string
  nombre: string
  nivel: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  rutina_dias: DiaFicha[]
}

export type GrupoFicha = {
  key: string
  fecha_inicio: string | null
  fecha_fin: string | null
  rutinas: RutinaFicha[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtCorta = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })

const fmtLarga = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

function buildRangoLabel(fi: string | null, ff: string | null) {
  if (!fi) return 'Sin fecha'
  if (!ff || fi === ff) return fmtCorta(fi)
  return `${fmtCorta(fi)} — ${fmtCorta(ff)}`
}

function generarWhatsApp(grupo: GrupoFicha, clienteNombre: string) {
  const lines: string[] = []
  lines.push(`*Plan de entrenamiento — ${clienteNombre}*`)
  if (grupo.fecha_inicio) {
    const fi = fmtLarga(grupo.fecha_inicio)
    const ff = grupo.fecha_fin && grupo.fecha_fin !== grupo.fecha_inicio ? ` al ${fmtLarga(grupo.fecha_fin)}` : ''
    lines.push(`_${fi}${ff}_`)
  }

  for (const rutina of grupo.rutinas) {
    lines.push('')
    lines.push(`*${rutina.nombre}*${rutina.nivel ? ` _(${rutina.nivel})_` : ''}`)
    const dia = [...(rutina.rutina_dias ?? [])].sort((a, b) => a.orden - b.orden)[0]
    if (dia) {
      const ejercicios = [...(dia.rutina_ejercicios ?? [])].sort((a, b) => a.orden - b.orden)
      for (const ej of ejercicios) {
        const nombre = ej.ejercicios?.nombre ?? ej.nombre_custom ?? '—'
        let line: string
        if (ej.modalidad === 'tiempo') {
          line = `• ${nombre}: ${ej.series} × ${ej.repeticiones}min`
          if (ej.descanso_segundos) line += ` · ${Math.round(ej.descanso_segundos / 60)}min desc.`
        } else if (ej.modalidad === 'intervalo') {
          line = `• ${nombre}: ${ej.series} rondas × ${ej.repeticiones}s`
          if (ej.descanso_serie) line += ` · ${ej.descanso_serie}s/int.`
          if (ej.descanso_segundos) line += ` · ${Math.round(ej.descanso_segundos / 60)}min desc.`
        } else {
          line = `• ${nombre}: ${ej.series}×${ej.repeticiones}`
          if (ej.peso) line += ` (${ej.peso} kg)`
          if (ej.descanso_segundos) line += ` · ${ej.descanso_segundos}s`
        }
        lines.push(line)
      }
    }
  }

  lines.push('')
  lines.push('_Enviado con AgendaCoach_')
  return lines.join('\n')
}

// ── Ficha individual (card + dialog) ─────────────────────────────────────────

function FichaCard({
  grupo,
  clienteId,
  clienteNombre,
}: {
  grupo: GrupoFicha
  clienteId: string
  clienteNombre: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const totalEj = grupo.rutinas.reduce((acc, r) => {
    const dia = r.rutina_dias[0]
    return acc + (dia?.rutina_ejercicios?.length ?? 0)
  }, 0)

  const handleDelete = (rutinaId: string) => {
    if (!confirm('¿Eliminar esta rutina?')) return
    startTransition(async () => {
      await deleteRutina(rutinaId, clienteId)
      // Si era la última del grupo, cerrar dialog
      if (grupo.rutinas.length <= 1) setOpen(false)
      router.refresh()
    })
  }

  const handleWhatsApp = () => {
    const texto = generarWhatsApp(grupo, clienteNombre)
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  return (
    <>
      {/* ── Tarjeta compacta ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md text-left"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 shrink-0">
          <Dumbbell className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {buildRangoLabel(grupo.fecha_inicio, grupo.fecha_fin)}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {grupo.rutinas.map(r => (
              <span key={r.id} className="text-xs text-muted-foreground truncate max-w-[120px]">{r.nombre}</span>
            )).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`sep-${i}`} className="text-muted-foreground/40 text-xs">·</span>, el], [])}
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            {grupo.rutinas.length} rutina{grupo.rutinas.length !== 1 ? 's' : ''} · {totalEj} ejercicio{totalEj !== 1 ? 's' : ''}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      </button>

      {/* ── Dialog de detalle ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {buildRangoLabel(grupo.fecha_inicio, grupo.fecha_fin)}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {grupo.rutinas.map((rutina, ri) => {
              const dia = [...(rutina.rutina_dias ?? [])].sort((a, b) => a.orden - b.orden)[0]
              const ejercicios = [...(dia?.rutina_ejercicios ?? [])].sort((a, b) => a.orden - b.orden)

              return (
                <div key={rutina.id} className={`flex flex-col gap-2 ${ri > 0 ? 'pt-4 border-t border-slate-100' : ''}`}>
                  {/* Encabezado rutina */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{rutina.nombre}</p>
                      <div className="flex gap-1.5 flex-wrap mt-0.5">
                        {dia?.tipo && <Badge variant="outline" className="text-xs capitalize py-0 h-4">{dia.tipo}</Badge>}
                        {rutina.nivel && <Badge variant="outline" className="text-xs capitalize py-0 h-4">{rutina.nivel}</Badge>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(rutina.id)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-destructive transition shrink-0 mt-0.5"
                      title="Eliminar rutina"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Ejercicios */}
                  {ejercicios.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {ejercicios.map((ej, i) => {
                        const nombre = ej.ejercicios?.nombre ?? ej.nombre_custom ?? '—'
                        return (
                          <div key={ej.id} className="flex items-baseline gap-2 rounded-lg bg-slate-50 px-3 py-2">
                            <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground">{nombre}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {ej.modalidad === 'tiempo'
                                  ? `${ej.series} × ${ej.repeticiones}min · ${Math.round(ej.descanso_segundos / 60)}min desc.`
                                  : ej.modalidad === 'intervalo'
                                  ? `${ej.series} rondas × ${ej.repeticiones}s · ${ej.descanso_serie ?? 0}s/int. · ${Math.round(ej.descanso_segundos / 60)}min desc.`
                                  : `${ej.series}×${ej.repeticiones}${ej.peso ? ` · ${ej.peso}kg` : ''} · ${ej.descanso_segundos}s`
                                }
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic px-1">Sin ejercicios.</p>
                  )}
                </div>
              )
            })}

            {/* WhatsApp */}
            <div className="pt-3 border-t border-slate-100">
              <Button
                className="w-full gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="h-4 w-4" />
                Enviar por WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Lista de fichas ────────────────────────────────────────────────────────────

export function RutinasFichas({
  grupos,
  clienteId,
  clienteNombre,
}: {
  grupos: GrupoFicha[]
  clienteId: string
  clienteNombre: string
}) {
  if (grupos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
        <Dumbbell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">Sin rutinas asignadas</p>
        <p className="text-xs text-muted-foreground mt-1">
          Selecciona sesiones arriba y asigna una plantilla.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {grupos.map(g => (
        <FichaCard key={g.key} grupo={g} clienteId={clienteId} clienteNombre={clienteNombre} />
      ))}
    </div>
  )
}
