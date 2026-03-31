"use client"

import React from 'react'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'

function imcColor(category?: string) {
  if (!category) return 'bg-gray-400 text-white'
  if (category === 'Normal') return 'bg-emerald-600 text-white'
  if (category === 'Bajo peso') return 'bg-yellow-500 text-white'
  if (category.startsWith('Obesidad')) return 'bg-red-600 text-white'
  if (category === 'Sobrepeso') return 'bg-orange-500 text-white'
  return 'bg-gray-500 text-white'
}

function normalizeGender(g?: string) {
  if (!g) return 'unknown'
  const s = g.toString().toLowerCase()
  if (s.startsWith('m') || s === 'male' || s === 'masculino' || s === 'hombre') return 'male'
  if (s.startsWith('f') || s === 'female' || s === 'femenino' || s === 'mujer') return 'female'
  return 'unknown'
}

function fatCategory(fat?: number | null, gender?: string) {
  if (fat == null) return { label: '—', color: 'bg-gray-400 text-white' }
  const n = Number(fat)
  if (isNaN(n)) return { label: '—', color: 'bg-gray-400 text-white' }
  const g = normalizeGender(gender)

  if (g === 'male') {
    if (n <= 5) return { label: 'Esencial', color: 'bg-violet-600 text-white' }
    if (n <= 13) return { label: 'Atleta', color: 'bg-emerald-600 text-white' }
    if (n <= 17) return { label: 'Fitness', color: 'bg-sky-600 text-white' }
    if (n <= 24) return { label: 'Promedio', color: 'bg-orange-400 text-black' }
    return { label: 'Obesidad', color: 'bg-red-600 text-white' }
  }

  if (g === 'female') {
    if (n <= 13) return { label: 'Esencial', color: 'bg-violet-600 text-white' }
    if (n <= 20) return { label: 'Atleta', color: 'bg-emerald-600 text-white' }
    if (n <= 24) return { label: 'Fitness', color: 'bg-sky-600 text-white' }
    if (n <= 31) return { label: 'Promedio', color: 'bg-orange-400 text-black' }
    return { label: 'Obesidad', color: 'bg-red-600 text-white' }
  }

  // fallback (mixed / unknown)
  if (n <= 13) return { label: 'Bajo', color: 'bg-violet-600 text-white' }
  if (n <= 20) return { label: 'Atleta', color: 'bg-emerald-600 text-white' }
  if (n <= 24) return { label: 'Fitness', color: 'bg-sky-600 text-white' }
  if (n <= 31) return { label: 'Promedio', color: 'bg-orange-400 text-black' }
  return { label: 'Obesidad', color: 'bg-red-600 text-white' }
}

function visceralCategory(visc?: number | null) {
  if (visc == null) return { label: '—', color: 'bg-gray-400 text-white' }
  const n = Number(visc)
  if (isNaN(n)) return { label: '—', color: 'bg-gray-400 text-white' }
  if (n <= 12) return { label: 'Normal', color: 'bg-emerald-600 text-white' }
  return { label: 'Elevado', color: 'bg-red-600 text-white' }
}

export default function EvaluationDetailModal({ open, onOpenChange, evaluation, clientName, clientGender }: { open: boolean; onOpenChange: (open: boolean) => void; evaluation: any; clientName?: string; clientGender?: string }) {
  if (!evaluation) return null

  const fecha = evaluation?.fecha ? new Date(evaluation.fecha).toLocaleDateString('es-ES') : '—'

  const fat = evaluation?.porcentaje_grasa ?? evaluation?.porcentajeGrasa ?? null
  const imc = evaluation?.imc ?? null
  const categoria = evaluation?.categoria_imc ?? evaluation?.categoriaImc ?? null
  const fatCat = fatCategory(fat, clientGender)
  const viscCat = visceralCategory(evaluation?.grasa_visceral ?? evaluation?.grasaVisceral ?? null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Ficha de evaluación</DialogTitle>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{clientName ?? '—'}</div>
              <div className="text-xs text-muted-foreground">{fecha}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded text-sm ${imcColor(categoria)}`}>{categoria ?? '—'}</div>
              <div className={`px-3 py-1 rounded text-sm ${fatCat.color}`}>{fatCat.label}{fat != null ? ` · ${fat}%` : ''}</div>
              <div className={`px-3 py-1 rounded text-sm ${viscCat.color}`}>Visceral: {viscCat.label}</div>
            </div>
          </div>

          <section className="p-3 border rounded">
            <h3 className="font-semibold mb-2">Composición corporal</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">IMC</div>
                <div className="font-medium">{imc ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">% Grasa</div>
                <div className="font-medium">{fat ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Masa muscular (kg)</div>
                <div>{evaluation?.masa_muscular ?? evaluation?.masaMuscular ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Masa grasa (kg)</div>
                <div>{evaluation?.masa_grasa ?? evaluation?.masaGrasa ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Agua corporal (L)</div>
                <div>{evaluation?.agua_corporal ?? evaluation?.aguaCorporal ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Grasa visceral</div>
                <div>{evaluation?.grasa_visceral ?? evaluation?.grasaVisceral ?? '—'}</div>
              </div>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              <div><strong>Nota:</strong> Los rangos ideales varían según edad y sexo. Esta vista muestra los valores registrados; para ver interpretación detallada, utiliza la sección de clasificación o consulta datos de referencia.</div>
            </div>
            {/* Legend */}
            <div className="mt-3 text-xs">
              <div className="font-semibold mb-1">Leyenda — % Grasa (ACE)</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <div className="font-medium">Hombres</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <div className="px-2 py-0.5 rounded bg-violet-600 text-white text-[11px]">Esencial ≤5%</div>
                    <div className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px]">Atleta 6–13%</div>
                    <div className="px-2 py-0.5 rounded bg-sky-600 text-white text-[11px]">Fitness 14–17%</div>
                    <div className="px-2 py-0.5 rounded bg-orange-400 text-black text-[11px]">Promedio 18–24%</div>
                    <div className="px-2 py-0.5 rounded bg-red-600 text-white text-[11px]">Obesidad ≥25%</div>
                  </div>
                </div>
                <div>
                  <div className="font-medium">Mujeres</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <div className="px-2 py-0.5 rounded bg-violet-600 text-white text-[11px]">Esencial ≤13%</div>
                    <div className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px]">Atleta 14–20%</div>
                    <div className="px-2 py-0.5 rounded bg-sky-600 text-white text-[11px]">Fitness 21–24%</div>
                    <div className="px-2 py-0.5 rounded bg-orange-400 text-black text-[11px]">Promedio 25–31%</div>
                    <div className="px-2 py-0.5 rounded bg-red-600 text-white text-[11px]">Obesidad ≥32%</div>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Grasa visceral: ≤12 normal, &gt;12 riesgo cardiovascular mayor.</div>
            </div>
          </section>

          {evaluation?.pliegues && (
            <section className="p-3 border rounded">
              <h3 className="font-semibold mb-2">Pliegues (mm)</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Bicipital: {evaluation.pliegues.bicipital ?? '—'}</div>
                <div>Tricipital: {evaluation.pliegues.tricipital ?? '—'}</div>
                <div>Subescapular: {evaluation.pliegues.subescapular ?? '—'}</div>
                <div>Suprailiaco: {evaluation.pliegues.suprailiaco ?? '—'}</div>
              </div>
            </section>
          )}

          <section className="p-3 border rounded">
            <h3 className="font-semibold mb-2">Perímetros</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Cintura: {evaluation.cintura ?? '—'}</div>
              <div>Cadera: {evaluation.cadera ?? '—'}</div>
              <div>ICC: {evaluation.icc ?? '—'}</div>
              <div>ICE: {evaluation.ice ?? '—'}</div>
            </div>
          </section>

          <section className="p-3 border rounded">
            <h3 className="font-semibold mb-2">Observaciones</h3>
            <div className="text-sm"><strong>Objetivo:</strong> {evaluation.objetivo ?? '—'}</div>
            <div className="text-sm mt-1"><strong>Patologías:</strong> {evaluation.patologias ?? '—'}</div>
            <div className="text-sm mt-1"><strong>Meta:</strong> {evaluation.meta ?? '—'}</div>
          </section>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
