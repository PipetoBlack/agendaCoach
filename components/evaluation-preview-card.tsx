"use client"

import { Button } from '@/components/ui/button'
import React from 'react'

export default function EvaluationPreviewCard({ evaluation, clientName, onView }: { evaluation: any; clientName?: string; onView?: (evaluation: any) => void }) {
  const date = evaluation?.fecha ? new Date(evaluation.fecha).toLocaleDateString('es-ES') : ''

  return (
    <div className="border rounded p-3 bg-card">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{clientName ?? '—'}</div>
          <div className="text-xs text-muted-foreground">{date}</div>
        </div>
      </div>

      <div className="mt-2 text-sm">
        <div><strong>IMC:</strong> {evaluation?.imc ?? '—'}</div>
        <div><strong>Categoría:</strong> {evaluation?.categoria_imc ?? '—'}</div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="outline" onClick={() => onView ? onView(evaluation) : null}>Ver detalle</Button>
      </div>
    </div>
  )
}
