"use client"

import React from 'react'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'

function imcColor(category?: string) {
  if (!category) return 'bg-gray-100 text-gray-800'
  const key = (category || '').toLowerCase()
  if (key.includes('bajo')) return 'bg-blue-100 text-blue-800'
  if (key.includes('normal')) return 'bg-emerald-100 text-emerald-800'
  if (key.includes('sobrepeso')) return 'bg-yellow-100 text-yellow-800'
  if (key.includes('obesidad') || key.includes('alto') || key.includes('elevado')) return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

function normalizeGender(g?: string) {
  if (!g) return 'unknown'
  const s = g.toString().toLowerCase()
  if (s.startsWith('m') || s === 'male' || s === 'masculino' || s === 'hombre') return 'male'
  if (s.startsWith('f') || s === 'female' || s === 'femenino' || s === 'mujer') return 'female'
  return 'unknown'
}

function fatCategory(fat?: number | null, gender?: string) {
  if (fat == null) return { label: '—', color: 'bg-gray-100 text-gray-800' }
  const n = Number(fat)
  if (isNaN(n)) return { label: '—', color: 'bg-gray-400 text-white' }
  const g = normalizeGender(gender)
  // Simplified categories with universally-understood colors:
  // Blue = Bajo, Green = Normal, Yellow = Sobrepeso, Red = Alto/Obesidad
  if (g === 'male') {
    if (n < 6) return { label: 'Bajo', color: 'bg-blue-100 text-blue-800' }
    if (n <= 24) return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800' }
    if (n <= 29) return { label: 'Sobrepeso', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Alto', color: 'bg-red-100 text-red-800' }
  }

  if (g === 'female') {
    if (n < 14) return { label: 'Bajo', color: 'bg-blue-100 text-blue-800' }
    if (n <= 31) return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800' }
    if (n <= 36) return { label: 'Sobrepeso', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Alto', color: 'bg-red-100 text-red-800' }
  }

  // fallback (mixed / unknown)
  if (n < 10) return { label: 'Bajo', color: 'bg-blue-100 text-blue-800' }
  if (n <= 31) return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800' }
  if (n <= 36) return { label: 'Sobrepeso', color: 'bg-yellow-100 text-yellow-800' }
  return { label: 'Alto', color: 'bg-red-100 text-red-800' }
}

function visceralCategory(visc?: number | null) {
  if (visc == null) return { label: '—', color: 'bg-gray-100 text-gray-800' }
  const n = Number(visc)
  if (isNaN(n)) return { label: '—', color: 'bg-gray-400 text-white' }
  if (n <= 12) return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800' }
  return { label: 'Alto', color: 'bg-red-100 text-red-800' }
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

  // removed detailed ACE legend badges per request; simplified categories/colors used instead

  function getFatIdealRange(g?: string) {
    const n = normalizeGender(g)
    if (n === 'male') return '6–24%'
    if (n === 'female') return '14–31%'
    return '6–31%'
  }

  function formatNum(v: any, decimals = 1) {
    if (v == null) return '—'
    const n = Number(v)
    if (isNaN(n)) return '—'
    return decimals === 0 ? String(Math.round(n)) : String(Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals))
  }

  function waistHipCategory(icc?: number | null, gender?: string) {
    if (icc == null) return { label: '—', color: 'bg-gray-100 text-gray-800', info: '' }
    const n = Number(icc)
    if (isNaN(n)) return { label: '—', color: 'bg-gray-400 text-white', info: '' }
    const g = normalizeGender(gender)
    if (g === 'male') {
      if (n < 0.9) return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800', info: 'Riesgo si ≥0.90' }
      return { label: 'Elevado', color: 'bg-red-100 text-red-800', info: 'Riesgo ≥0.90' }
    }
    if (g === 'female') {
      if (n < 0.85) return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800', info: 'Riesgo si ≥0.85' }
      return { label: 'Elevado', color: 'bg-red-100 text-red-800', info: 'Riesgo ≥0.85' }
    }
    // fallback
    if (n < 0.9) return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800', info: 'Umbral general ≥0.90' }
    return { label: 'Elevado', color: 'bg-red-100 text-red-800', info: 'Umbral general ≥0.90' }
  }

  function waistHeightCategory(ice?: number | null) {
    if (ice == null) return { label: '—', color: 'bg-gray-100 text-gray-800', info: '' }
    const n = Number(ice)
    if (isNaN(n)) return { label: '—', color: 'bg-gray-400 text-white', info: '' }
    if (n < 0.5) return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800', info: 'Riesgo si ≥0.50' }
    return { label: 'Elevado', color: 'bg-red-100 text-red-800', info: 'Riesgo ≥0.50' }
  }

  function waterCategoryFromPercent(percent?: number | null, gender?: string) {
    if (percent == null) return { label: '—', color: 'bg-gray-100 text-gray-800', info: '' }
    const p = Number(percent)
    if (isNaN(p)) return { label: '—', color: 'bg-gray-400 text-white', info: '' }
    const g = normalizeGender(gender)
    if (g === 'male') {
      if (p >= 50 && p <= 65) return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800', info: 'Referencia 50–65% del peso' }
      return { label: p < 50 ? 'Bajo' : 'Alto', color: p < 50 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800', info: 'Referencia 50–65% del peso' }
    }
    if (g === 'female') {
      if (p >= 45 && p <= 60) return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800', info: 'Referencia 45–60% del peso' }
      return { label: p < 45 ? 'Bajo' : 'Alto', color: p < 45 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800', info: 'Referencia 45–60% del peso' }
    }
    // unknown
    if (p >= 50 && p <= 65) return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800', info: 'Referencia ~50–65% del peso' }
    return { label: p < 50 ? 'Bajo' : 'Alto', color: p < 50 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800', info: 'Referencia ~50–65% del peso' }
  }

  // prefer birthdate passed as prop, otherwise try to extract from evaluation fields
  const clientBirthdate = clientBirthdateProp ?? evaluation?.cliente_fecha_nacimiento ?? evaluation?.clienteFechaNacimiento ?? undefined
  const age = computeAgeYears(clientBirthdate)

  // Normalize patologías display: interpret empty / NO / N/A / NINGUNA as 'Ninguna'
  const patologiasRaw = evaluation?.patologias ?? null
  let patologiasDisplay: string = 'Ninguna'
  if (patologiasRaw != null) {
    const pStr = String(patologiasRaw).trim()
    const up = pStr.toUpperCase()
    const empties = new Set(['', 'NO', 'N/A', 'NINGUNA', 'NONE', '-'])
    if (pStr.length === 0 || empties.has(up)) patologiasDisplay = 'Ninguna'
    else patologiasDisplay = pStr
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="text-center">Ficha de evaluación</DialogTitle>

        <div className="space-y-3">

          {/* 1) Anamnesis */}
          <section className="p-3 border rounded">
            <h3 className="font-semibold mb-2">Resumen</h3>
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
              <div className="col-span-2 mt-2">
                <div className="text-muted-foreground">Objetivo general</div>
                <div className="font-medium">{evaluation.objetivo ?? '—'}</div>

                <div className="text-muted-foreground mt-2">Patologías</div>
                <div>{patologiasDisplay}</div>

                <div className="text-muted-foreground mt-2">Meta a 30 días</div>
                <div>{evaluation.meta ?? '—'}</div>

                <div className="text-muted-foreground mt-2">Tasa metabólica basal (OMS)</div>
                <div>{(() => {
                  const ageForBmr = age
                  const weight = evaluation?.peso ?? null
                  const bmr = computeBMR(weight, ageForBmr, clientGender)
                  return bmr != null ? `${bmr} kcal/día` : '—'
                })()}</div>
              </div>
            </div>
          </section>

          {/* 2) Resultados (agrupados y categorizados) */}
          <section className="p-3 border rounded">
            <h3 className="font-semibold mb-3">Resultados</h3>

            {/* Análisis de obesidad */}
            <div className="mb-3">
              <h4 className="font-semibold text-sm mb-2">Análisis de obesidad</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 border rounded">
                  <div className="text-muted-foreground">IMC</div>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{imc ?? '—'}</div>
                    <div className={`px-2 py-0.5 rounded text-sm ${imcColor(categoria)}`}>{categoria ?? '—'}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Rango ideal: 18.5–24.9</div>
                </div>

                <div className="p-3 border rounded">
                  <div className="text-muted-foreground">Grasa visceral</div>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{evaluation?.grasa_visceral ?? evaluation?.grasaVisceral ?? '—'}</div>
                    <div className={`px-2 py-0.5 rounded text-sm ${viscCat.color}`}>{viscCat.label}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Normal ≤12</div>
                </div>
              </div>
            </div>

            {/* Análisis músculo–grasa */}
            <div className="mb-3">
              <h4 className="font-semibold text-sm mb-2">Análisis músculo–grasa</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 border rounded">
                  <div className="text-muted-foreground">% Grasa</div>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{fat ?? '—'}</div>
                    <div className={`px-2 py-0.5 rounded text-sm ${fatCat.color}`}>{fatCat.label}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Rango ideal: {getFatIdealRange(clientGender)}</div>
                </div>

                <div className="p-3 border rounded">
                  <div className="text-muted-foreground">Masa muscular (kg)</div>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{evaluation?.masa_muscular ?? evaluation?.masaMuscular ?? '—'}</div>
                    <div className="px-2 py-0.5 rounded text-sm bg-gray-100 text-gray-800">Referencia</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Rango: variable por sexo y edad</div>
                </div>

                <div className="p-3 border rounded">
                  <div className="text-muted-foreground">Masa grasa (kg)</div>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{evaluation?.masa_grasa ?? evaluation?.masaGrasa ?? '—'}</div>
                    <div className="px-2 py-0.5 rounded text-sm bg-gray-100 text-gray-800">Referencia</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Rango: derivado del % grasa</div>
                </div>
              </div>
            </div>

            {/* Hidratación */}
            <div className="mb-3">
              <h4 className="font-semibold text-sm mb-2">Hidratación</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 border rounded">
                  <div className="text-muted-foreground">Agua corporal (L)</div>
                  <div className="font-medium">{evaluation?.agua_corporal ?? evaluation?.aguaCorporal ?? '—'}</div>
                  {evaluation?.agua_corporal && evaluation?.peso && (
                    (() => {
                      const pct = (Number(evaluation?.agua_corporal) / Number(evaluation?.peso)) * 100
                      const wc = waterCategoryFromPercent(pct, clientGender)
                      return (
                        <>
                          <div className="flex items-center justify-between mt-1">
                            <div className="text-xs text-muted-foreground">≈{formatNum(pct, 0)}% del peso</div>
                            <div className={`px-2 py-0.5 rounded text-sm ${wc.color}`}>{wc.label}</div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{wc.info}</div>
                        </>
                      )
                    })()
                  )}
                  {!evaluation?.agua_corporal && (
                    <div className="text-xs text-muted-foreground mt-1">Referencia: ≈50–65% del peso</div>
                  )}
                </div>

                <div className="p-3 border rounded">
                  <div className="text-muted-foreground">Grasa visceral</div>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{evaluation?.grasa_visceral ?? evaluation?.grasaVisceral ?? '—'}</div>
                    <div className={`px-2 py-0.5 rounded text-sm ${viscCat.color}`}>{viscCat.label}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Normal ≤12</div>
                </div>

                {/* removed duplicate % Grasa card - legend now shown in Análisis músculo–grasa */}
              </div>
            </div>

            {/* Perímetros y ratios */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Perímetros y ratios</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 border rounded">
                  <div className="text-muted-foreground">ICC (cintura/cadera)</div>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{evaluation?.icc ?? '—'}</div>
                    {(() => {
                      const wh = waistHipCategory(evaluation?.icc ?? null, clientGender)
                      return <div className={`px-2 py-0.5 rounded text-sm ${wh.color}`}>{wh.label}</div>
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Riesgo: Hombres ≥0.90 · Mujeres ≥0.85</div>
                </div>

                <div className="p-3 border rounded">
                  <div className="text-muted-foreground">ICE (cintura/estatura)</div>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{evaluation?.ice ?? '—'}</div>
                    {(() => {
                      const wht = waistHeightCategory(evaluation?.ice ?? null)
                      return <div className={`px-2 py-0.5 rounded text-sm ${wht.color}`}>{wht.label}</div>
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Riesgo si ≥0.50</div>
                </div>

                <div className="p-3 border rounded">
                  <div className="text-muted-foreground">Cintura (cm)</div>
                  <div className="font-medium">{evaluation?.cintura ?? '—'}</div>
                  <div className="text-xs text-muted-foreground mt-1">Umbrales de riesgo según sexo</div>
                </div>
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

          {/* Otros fusionados dentro de Anamnesis */}

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
