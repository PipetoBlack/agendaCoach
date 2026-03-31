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

export default function EvaluationDetailModal({ open, onOpenChange, evaluation, clientName, clientGender, clientBirthdate: clientBirthdateProp }: { open: boolean; onOpenChange: (open: boolean) => void; evaluation: any; clientName?: string; clientGender?: string; clientBirthdate?: string }) {
  if (!evaluation) return null
  const fecha = evaluation?.fecha ? new Date(evaluation.fecha).toLocaleDateString('es-ES') : '—'

  // Accept optional client birthdate via evaluation or props
  // (page should pass client fecha_nacimiento when opening modal)
  // try to get birthdate from evaluation.cliente_fecha_nacimiento if present
  // (but main page currently passes clientGender and clientName separately)

  const fat = evaluation?.porcentaje_grasa ?? evaluation?.porcentajeGrasa ?? null
  const imc = evaluation?.imc ?? null
  const categoria = evaluation?.categoria_imc ?? evaluation?.categoriaImc ?? null
  const fatCat = fatCategory(fat, clientGender)
  const viscCat = visceralCategory(evaluation?.grasa_visceral ?? evaluation?.grasaVisceral ?? null)

  function computeAgeYears(fecha?: string | null) {
    if (!fecha) return null
    const born = new Date(fecha)
    if (isNaN(born.getTime())) return null
    return Math.floor((Date.now() - born.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  }

  function formatGenderLabel(g?: string) {
    const n = normalizeGender(g)
    if (n === 'male') return 'Masculino'
    if (n === 'female') return 'Femenino'
    return g ?? '—'
  }

  function computeBMR(weightKg: number | null | undefined, ageYears: number | null | undefined, gender?: string) {
    if (!weightKg || !ageYears) return null
    const g = normalizeGender(gender)
    const w = Number(weightKg)
    const a = Number(ageYears)
    if (isNaN(w) || isNaN(a)) return null

    // Schofield (FAO/WHO) approximation for adults
    if (g === 'male') {
      if (a >= 18 && a <= 29) return Math.round((15.057 * w + 692.2))
      if (a <= 59) return Math.round((11.472 * w + 873.1))
      return Math.round((11.711 * w + 587.7))
    }
    if (g === 'female') {
      if (a >= 18 && a <= 29) return Math.round((14.818 * w + 486.6))
      if (a <= 59) return Math.round((8.126 * w + 845.6))
      return Math.round((9.082 * w + 658.5))
    }
    return null
  }

  function renderFatLegend(g?: string) {
    const n = normalizeGender(g)
    if (n === 'male') {
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          <div className="px-2 py-0.5 rounded bg-violet-600 text-white text-[11px]">Esencial ≤5%</div>
          <div className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px]">Atleta 6–13%</div>
          <div className="px-2 py-0.5 rounded bg-sky-600 text-white text-[11px]">Fitness 14–17%</div>
          <div className="px-2 py-0.5 rounded bg-orange-400 text-black text-[11px]">Promedio 18–24%</div>
          <div className="px-2 py-0.5 rounded bg-red-600 text-white text-[11px]">Obesidad ≥25%</div>
        </div>
      )
    }
    if (n === 'female') {
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          <div className="px-2 py-0.5 rounded bg-violet-600 text-white text-[11px]">Esencial ≤13%</div>
          <div className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px]">Atleta 14–20%</div>
          <div className="px-2 py-0.5 rounded bg-sky-600 text-white text-[11px]">Fitness 21–24%</div>
          <div className="px-2 py-0.5 rounded bg-orange-400 text-black text-[11px]">Promedio 25–31%</div>
          <div className="px-2 py-0.5 rounded bg-red-600 text-white text-[11px]">Obesidad ≥32%</div>
        </div>
      )
    }

    // unknown gender -> show both
    return (
      <div className="grid grid-cols-2 gap-3">
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
    )
  }

  // prefer birthdate passed as prop, otherwise try to extract from evaluation fields
  const clientBirthdate = clientBirthdateProp ?? evaluation?.cliente_fecha_nacimiento ?? evaluation?.clienteFechaNacimiento ?? undefined
  const age = computeAgeYears(clientBirthdate)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-center">Ficha de evaluación</DialogTitle>

        <div className="space-y-3">

          {/* 1) Anamnesis */}
          <section className="p-3 border rounded">
            <h3 className="font-semibold mb-2">Anamnesis</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Nombre</div>
                <div className="font-medium">{clientName ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Fecha evaluación</div>
                <div className="font-medium">{fecha}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Edad</div>
                <div>{age != null ? `${age} años` : '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Género</div>
                <div className="font-medium">{formatGenderLabel(clientGender)}</div>
              </div>
            </div>
          </section>

          {/* 2) Resultados */}
          <section className="p-3 border rounded">
            <h3 className="font-semibold mb-2">Resultados</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">IMC</div>
                <div className="font-medium">{imc ?? '—'}</div>
                <div className="text-xs text-muted-foreground">Rango ideal: 18.5–24.9</div>
              </div>

              <div>
                <div className="text-muted-foreground">% Grasa</div>
                <div className="font-medium">{fat ?? '—'}{fat != null ? ` · ${fatCat.label}` : ''}</div>
                <div className="text-xs text-muted-foreground">Rango referencia (ACE) para este sexo:</div>
                {renderFatLegend(clientGender)}
              </div>

              <div>
                <div className="text-muted-foreground">Grasa visceral</div>
                <div className="font-medium">{evaluation?.grasa_visceral ?? evaluation?.grasaVisceral ?? '—'}</div>
                <div className="text-xs text-muted-foreground">Normal ≤12</div>
              </div>

              <div>
                <div className="text-muted-foreground">ICC</div>
                <div className="font-medium">{evaluation?.icc ?? '—'}</div>
                <div className="text-xs text-muted-foreground">Relación cintura/cadera</div>
              </div>
            </div>
          </section>

          {/* 3) Métricas (mostrar todos los valores aunque falten) */}
          <section className="p-3 border rounded">
            <h3 className="font-semibold mb-2">Métricas</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Peso (kg)</div>
                <div className="font-medium">{evaluation?.peso ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Estatura (cm)</div>
                <div className="font-medium">{evaluation?.estatura ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">% Grasa</div>
                <div>{fat ?? '—'}</div>
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
                <div className="text-muted-foreground">Cintura (cm)</div>
                <div>{evaluation?.cintura ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Cadera (cm)</div>
                <div>{evaluation?.cadera ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">ICE</div>
                <div>{evaluation?.ice ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">ICC</div>
                <div>{evaluation?.icc ?? '—'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground">Pliegues (mm)</div>
                <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                  <div>Bicipital: {evaluation?.pliegues?.bicipital ?? '—'}</div>
                  <div>Tricipital: {evaluation?.pliegues?.tricipital ?? '—'}</div>
                  <div>Subescapular: {evaluation?.pliegues?.subescapular ?? '—'}</div>
                  <div>Suprailiaco: {evaluation?.pliegues?.suprailiaco ?? evaluation?.pliegues?.suprail ?? '—'}</div>
                </div>
              </div>
            </div>
          </section>

          {/* 4) Otros */}
          <section className="p-3 border rounded">
            <h3 className="font-semibold mb-2">Otros</h3>
            <div className="text-sm"><strong>Objetivo:</strong> {evaluation.objetivo ?? '—'}</div>
            <div className="text-sm mt-1"><strong>Patologías:</strong> {evaluation.patologias ?? '—'}</div>
            <div className="text-sm mt-1"><strong>Meta:</strong> {evaluation.meta ?? '—'}</div>
            <div className="text-sm mt-2"><strong>Tasa metabólica basal (OMS):</strong> {
              (() => {
                const ageForBmr = age
                const weight = evaluation?.peso ?? null
                const bmr = computeBMR(weight, ageForBmr, clientGender)
                return bmr != null ? `${bmr} kcal/día` : '—'
              })()
            }</div>
          </section>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
