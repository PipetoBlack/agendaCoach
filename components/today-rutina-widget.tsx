'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Dumbbell, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type EjData = {
  id: string
  nombre: string
  series: number
  repeticiones: string
  peso: string | null
  modalidad: string
}

type RutinaData = {
  id: string
  nombre: string
  ejercicios: EjData[]
}

export function TodayRutinaWidget({
  rutinas,
  clienteNombre,
  clienteTelefono,
}: {
  rutinas: RutinaData[]
  clienteNombre: string
  clienteTelefono: string | null
}) {
  const [expanded, setExpanded] = useState(false)

  const totalEj = rutinas.reduce((s, r) => s + r.ejercicios.length, 0)
  if (rutinas.length === 0 || totalEj === 0) return null

  const handleWhatsApp = () => {
    const lines: string[] = []
    lines.push(`Hola ${clienteNombre}! Aquí tienes tu rutina de hoy 💪`)
    for (const r of rutinas) {
      if (rutinas.length > 1) {
        lines.push('')
        lines.push(`*${r.nombre}*`)
      }
      for (const ej of r.ejercicios) {
        if (ej.modalidad === 'tiempo') {
          lines.push(`• ${ej.nombre}: ${ej.series} × ${ej.repeticiones}min`)
        } else if (ej.modalidad === 'intervalo') {
          lines.push(`• ${ej.nombre}: ${ej.series} rondas × ${ej.repeticiones}s`)
        } else {
          lines.push(`• ${ej.nombre}: ${ej.series}×${ej.repeticiones}${ej.peso ? ` (${ej.peso}kg)` : ''}`)
        }
      }
    }
    lines.push('')
    lines.push('_Enviado con AgendaCoach_')
    const phone = clienteTelefono?.replace(/\D/g, '') || ''
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`
      : `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
    window.open(url, '_blank')
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-emerald-50 transition"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2 text-emerald-700 font-medium">
          <Dumbbell className="h-3.5 w-3.5" />
          <span>Rutina de hoy · {totalEj} ejercicio{totalEj !== 1 ? 's' : ''}</span>
        </div>
        {expanded
          ? <ChevronUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          : <ChevronDown className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        }
      </button>

      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-2 border-t border-emerald-100">
          {rutinas.map((r, ri) => (
            <div key={r.id} className={ri > 0 ? 'pt-1 border-t border-emerald-100' : 'pt-2'}>
              {rutinas.length > 1 && (
                <p className="text-xs font-semibold text-foreground mb-1.5">{r.nombre}</p>
              )}
              <div className="flex flex-col gap-1">
                {r.ejercicios.map((ej, i) => (
                  <div key={ej.id} className="flex items-center gap-2 rounded bg-white px-2 py-1.5 border border-emerald-100/60">
                    <span className="text-[10px] text-muted-foreground w-3 shrink-0 text-right">{i + 1}</span>
                    <span className="text-xs font-medium text-foreground flex-1 truncate">{ej.nombre}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
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
            className="mt-1 w-full gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white h-8 text-xs"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Enviar rutina por WhatsApp
          </Button>
        </div>
      )}
    </div>
  )
}
