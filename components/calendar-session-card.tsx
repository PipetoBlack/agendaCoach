'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dumbbell, MessageCircle, XCircle } from 'lucide-react'
import { updateSessionStatusAction } from '@/app/dashboard/sessions/actions'

export type WeekRutinaData = {
  id: string
  nombre: string
  cliente_id: string
  fecha_inicio: string | null
  fecha_fin: string | null
  ejercicios: Array<{
    id: string
    nombre: string
    series: number
    repeticiones: string
    peso: string | null
    modalidad: string
  }>
}

type Session = {
  id: string
  cliente_id: string
  paquete_id: string | null
  fecha_sesion: string
  hora_sesion: string
  estado: string
  clientes: { nombre_completo: string; telefono: string | null }
}

const statusStyles: Record<string, { label: string; cardBorder: string; leftAccent: string; badge: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  programada: { label: 'Programada', cardBorder: 'border-[#3b82f6]/40', leftAccent: 'border-l-[3px] border-l-[#3b82f6]/60', badge: 'secondary' },
  completada: { label: 'Completada', cardBorder: 'border-[#16a34a]/40', leftAccent: 'border-l-[3px] border-l-[#16a34a]/60', badge: 'default' },
  cancelada: { label: 'Cancelada', cardBorder: 'border-[#ef4444]/40', leftAccent: 'border-l-[3px] border-l-[#ef4444]/60', badge: 'destructive' },
}

export function CalendarSessionCard({
  session,
  weekRutinas,
  canCancelFuture,
}: {
  session: Session
  weekRutinas: WeekRutinaData[]
  canCancelFuture: boolean
}) {
  const [open, setOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const style = statusStyles[session.estado] ?? statusStyles.programada
  const nombre = session.clientes?.nombre_completo || 'Sin nombre'
  const hora = session.hora_sesion?.slice(0, 5) || '--:--'

  const sesionRutinas = weekRutinas.filter(r => {
    if (r.cliente_id !== session.cliente_id) return false
    if (r.fecha_inicio && r.fecha_inicio > session.fecha_sesion) return false
    if (r.fecha_fin && r.fecha_fin < session.fecha_sesion) return false
    return true
  })
  const totalEj = sesionRutinas.reduce((s, r) => s + r.ejercicios.length, 0)

  const handleCancel = () => {
    startTransition(async () => {
      await updateSessionStatusAction(session.id, 'cancelada')
      setOpen(false)
      router.refresh()
    })
  }

  const handleWhatsApp = () => {
    const phone = session.clientes?.telefono?.replace(/\D/g, '') || ''
    const lines = [`Hola ${nombre}! Aquí tienes tu rutina del día 💪`]
    for (const r of sesionRutinas) {
      if (sesionRutinas.length > 1) { lines.push(''); lines.push(`*${r.nombre}*`) }
      for (const ej of r.ejercicios) {
        if (ej.modalidad === 'tiempo') lines.push(`• ${ej.nombre}: ${ej.series} × ${ej.repeticiones}min`)
        else if (ej.modalidad === 'intervalo') lines.push(`• ${ej.nombre}: ${ej.series} rondas × ${ej.repeticiones}s`)
        else lines.push(`• ${ej.nombre}: ${ej.series}×${ej.repeticiones}${ej.peso ? ` (${ej.peso}kg)` : ''}`)
      }
    }
    lines.push('', '_Enviado con AgendaCoach_')
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`
      : `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
    window.open(url, '_blank')
  }

  const fechaLabel = new Date(session.fecha_sesion + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <>
      {/* ── Tarjeta compacta en el calendario ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={e => e.key === 'Enter' && setOpen(true)}
        className={`rounded-lg border ${style.cardBorder} ${style.leftAccent} bg-white px-3 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.04)] cursor-pointer transition-shadow hover:shadow-[0_6px_18px_rgba(0,0,0,0.08)]`}
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground leading-snug whitespace-normal break-words">
            {nombre}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="whitespace-nowrap">{hora}</span>
            {totalEj > 0 && (
              <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
                <Dumbbell className="h-3 w-3" />
                <span>{totalEj}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Diálogo de detalle ── */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmCancel(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{nombre}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Fecha + estado */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground capitalize">{fechaLabel} · {hora}</span>
              <Badge variant={style.badge}>{style.label}</Badge>
            </div>

            {/* Rutina */}
            {sesionRutinas.length > 0 && totalEj > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Dumbbell className="h-4 w-4 text-emerald-600" />
                  <span>Rutina del día</span>
                </div>
                {sesionRutinas.map((r, ri) => (
                  <div key={r.id} className={ri > 0 ? 'pt-2 border-t border-slate-100' : ''}>
                    {sesionRutinas.length > 1 && (
                      <p className="text-xs font-semibold text-foreground mb-1.5">{r.nombre}</p>
                    )}
                    <div className="flex flex-col gap-1">
                      {r.ejercicios.map((ej, i) => (
                        <div key={ej.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                          <span className="text-[10px] text-muted-foreground w-4 shrink-0 text-right">{i + 1}</span>
                          <span className="text-sm font-medium text-foreground flex-1 truncate">{ej.nombre}</span>
                          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                            {ej.modalidad === 'tiempo'
                              ? `${ej.series}×${ej.repeticiones}min`
                              : ej.modalidad === 'intervalo'
                              ? `${ej.series}r×${ej.repeticiones}s`
                              : `${ej.series}×${ej.repeticiones}${ej.peso ? ` ${ej.peso}kg` : ''}`
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  className="w-full gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar rutina por WhatsApp
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sin rutina asignada para este día.</p>
            )}

            {/* Cancelar sesión */}
            {canCancelFuture && session.estado === 'programada' && (
              <div className="pt-1 border-t border-slate-100">
                {confirmCancel ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-sm font-medium text-foreground">¿Cancelar esta sesión agendada?</p>
                    <p className="text-xs text-muted-foreground">
                      La sesión volverá a estar disponible y tendrás que agendarla manualmente.
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setConfirmCancel(false)}
                        disabled={isPending}
                      >
                        Volver
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleCancel}
                        disabled={isPending}
                      >
                        {isPending ? 'Cancelando...' : 'Confirmar'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmCancel(true)}
                  >
                    <XCircle className="h-4 w-4" />
                    Cancelar sesión agendada
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
