"use client"

import { Button } from '@/components/ui/button'
import React from 'react'
import { Pencil, Eye } from 'lucide-react'
import DeleteEvaluationButton from '@/components/delete-evaluation-button'

function initialsFromName(name?: string) {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function imcBadgeClass(cat?: string) {
  const key = (cat || '').toLowerCase()
  switch (key) {
    case 'normal':
      return 'bg-green-100 text-green-800'
    case 'sobrepeso':
      return 'bg-yellow-100 text-yellow-800'
    case 'obesidad':
      return 'bg-red-100 text-red-800'
    case 'bajo peso':
    case 'bajopeso':
      return 'bg-blue-50 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function EvaluationPreviewCard({ evaluation, clientName, onView, onEdit, onDelete }: { evaluation: any; clientName?: string; onView?: (evaluation: any) => void; onEdit?: (evaluation: any) => void; onDelete?: (evaluation: any) => void }) {
  const date = evaluation?.fecha
    ? new Date(evaluation.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''
  const initials = initialsFromName(clientName)
  const categoria = evaluation?.categoria_imc ?? ''
  const badgeClass = imcBadgeClass(categoria)
  const imcValue = evaluation?.imc ?? '—'

  return (
    <div className="border rounded-xl p-4 bg-card/70 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
            {initials}
          </div>
          <div className="space-y-0.5">
            <div className="font-semibold leading-tight">{clientName ?? '—'}</div>
            <div className="text-xs text-muted-foreground">{date}</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
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

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xs uppercase text-muted-foreground">IMC</span>
          <span className="text-xs font-semibold leading-none text-foreground">{imcValue}</span>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>{categoria || 'Sin categoría'}</div>
      </div>

      <div className="mt-3 text-sm text-foreground">
        <span className="text-muted-foreground">Objetivo:</span> {evaluation?.objetivo ?? '—'}
      </div>
    </div>
  )
}
