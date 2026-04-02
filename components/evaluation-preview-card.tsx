"use client"

import { Button } from '@/components/ui/button'
import React from 'react'
import { Pencil, Eye } from 'lucide-react'
import DeleteEvaluationButton from '@/components/delete-evaluation-button'
import EvaluationProgressDialog from '@/components/evaluation-progress-dialog'
import { formatEvaluationDate } from '@/lib/evaluation-date'

function initialsFromName(name?: string) {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function imcBadgeClass(cat?: string) {
  const key = (cat || '').toLowerCase()
  if (key === 'normal') return 'bg-green-100 text-green-800'
  if (key === 'sobrepeso' || key === 'sobre peso') return 'bg-yellow-100 text-yellow-800'
  if (key.startsWith('obesidad')) return 'bg-red-100 text-red-800'
  if (key === 'bajo peso' || key === 'bajopeso') return 'bg-blue-50 text-blue-800'
  return 'bg-gray-100 text-gray-800'
}

export default function EvaluationPreviewCard({ evaluation, clientName, onView, onEdit, onDelete }: { evaluation: any; clientName?: string; onView?: (evaluation: any) => void; onEdit?: (evaluation: any) => void; onDelete?: (evaluation: any) => void }) {
  const date = formatEvaluationDate(evaluation?.fecha, 'es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const initials = initialsFromName(clientName)
  const categoria = evaluation?.categoria_imc ?? ''
  const badgeClass = imcBadgeClass(categoria)
  const imcValue = evaluation?.imc ?? '—'

  return (
    <div className="rounded-xl border bg-card/80 p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
            {initials}
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="truncate font-semibold leading-tight">{clientName ?? '—'}</div>
            <div className="text-xs text-muted-foreground">{date === '—' ? '' : date}</div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView ? onView(evaluation) : null} aria-label="Ver detalle">
              <Eye className="h-4 w-4" />
              <span className="sr-only">Ver detalle</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit ? onEdit(evaluation) : (onView ? onView(evaluation) : null)} aria-label="Editar evaluación">
              <Pencil className="h-4 w-4" />
            </Button>
            {onDelete && <DeleteEvaluationButton evaluation={evaluation} clientName={clientName} onConfirm={onDelete} />}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[auto,1fr]">
        <div className="rounded-lg bg-muted/35 px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-[11px] uppercase leading-none tracking-[0.16em] text-muted-foreground">IMC</div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold leading-none text-foreground">{imcValue}</span>
                <div className={`rounded-full px-2 py-1 text-[11px] font-medium ${badgeClass}`}>{categoria || 'Sin categoria'}</div>
              </div>
            </div>
            <EvaluationProgressDialog
              clientId={evaluation?.cliente_id}
              clientName={clientName}
              buttonLabel="Ver progreso"
              buttonClassName="h-7 shrink-0 rounded-full border-primary/20 bg-primary/10 px-2.5 text-[11px] font-semibold text-primary hover:bg-primary/15 hover:text-primary"
            />
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Objetivo</div>
          <p className="mt-1 break-words text-sm font-medium leading-snug text-foreground">{evaluation?.objetivo ?? '—'}</p>
        </div>
      </div>
    </div>
  )
}
