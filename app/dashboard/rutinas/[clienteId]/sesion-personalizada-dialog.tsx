'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Search, ChevronRight, Check, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { crearSesionPersonalizada } from '../actions'

// ── Types ─────────────────────────────────────────────────────────────────────

type EjercicioLib = { id: string; nombre: string; grupo_muscular: string }

type EjLocal = {
  tmpId: string
  ejercicioId: string | null
  nombre: string
  series: number
  repeticiones: string
  peso: string
  descansoSegundos: number
  modalidad: string
  descansoSerie: number | null
}

type Parte = {
  tmpId: string
  nombre: string
  tipo: string
  ejercicios: EjLocal[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
const num3 = (v: string) => v.replace(/\D/g, '').slice(0, 3)

const GRUPOS_BASE = ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core', 'fullbody']
const LABELS_GRUPO: Record<string, string> = {
  pecho: 'Pecho', espalda: 'Espalda', piernas: 'Piernas', hombros: 'Hombros',
  brazos: 'Brazos', core: 'Core', fullbody: 'Full body',
}

const NIVELES = [
  { value: 'basico', label: 'Básico', desc: 'Adaptación o principiantes' },
  { value: 'intermedio', label: 'Intermedio', desc: 'Con experiencia previa' },
  { value: 'avanzado', label: 'Avanzado', desc: 'Alta intensidad y volumen' },
]

const TIPOS = [
  { value: 'fuerza', label: 'Fuerza', color: 'border-blue-300 bg-blue-50 text-blue-700' },
  { value: 'resistencia', label: 'Resistencia', color: 'border-orange-300 bg-orange-50 text-orange-700' },
  { value: 'hipertrofia', label: 'Hipertrofia', color: 'border-purple-300 bg-purple-50 text-purple-700' },
  { value: 'movilidad', label: 'Movilidad', color: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { value: 'funcional', label: 'Funcional', color: 'border-amber-300 bg-amber-50 text-amber-700' },
  { value: 'mixto', label: 'Mixto', color: 'border-slate-300 bg-slate-50 text-slate-700' },
]

const STEPS = ['Información', 'Tipo', 'Ejercicios', 'Notas']

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current, partesCerradas, isNuevaParte }: {
  current: number
  partesCerradas: Parte[]
  isNuevaParte: boolean
}) {
  return (
    <div className="flex items-center mb-5">
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                done ? 'bg-emerald-600 border-emerald-600 text-white'
                : active ? 'bg-white border-emerald-600 text-emerald-600'
                : 'bg-white border-slate-200 text-muted-foreground'
              }`}>
                {done ? <Check className="h-3.5 w-3.5" /> : n}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-[2px] mt-[-12px] mx-1 transition-colors ${done ? 'bg-emerald-600' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
      {(partesCerradas.length > 0 || isNuevaParte) && (
        <span className="ml-3 text-[10px] font-semibold text-emerald-600 whitespace-nowrap shrink-0">
          Parte {isNuevaParte ? partesCerradas.length + 1 : partesCerradas.length > 0 ? partesCerradas.length + 1 : 1}
        </span>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SesionPersonalizadaDialog({
  open,
  onClose,
  clienteId,
  fechaInicio,
  fechaFin,
  sesionesLabel,
  ejerciciosLib,
}: {
  open: boolean
  onClose: () => void
  clienteId: string
  clienteNombre: string
  fechaInicio: string | null
  fechaFin: string | null
  sesionesLabel: string[]
  ejerciciosLib: EjercicioLib[]
}) {
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // ── Global (shared across all partes) ─────────────────────────────────────
  const [nombre, setNombre] = useState('')
  const [nivel, setNivel] = useState('')
  const [notas, setNotas] = useState('')

  // ── Partes completadas ────────────────────────────────────────────────────
  const [partesCerradas, setPartesCerradas] = useState<Parte[]>([])
  const [isNuevaParte, setIsNuevaParte] = useState(false)
  const [nuevaParteNombre, setNuevaParteNombre] = useState('')

  // ── Current parte ─────────────────────────────────────────────────────────
  const [tipo, setTipo] = useState('')
  const [ejercicios, setEjercicios] = useState<EjLocal[]>([])

  // ── Add exercise form ─────────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false)
  const [ejSearch, setEjSearch] = useState('')
  const [ejSelId, setEjSelId] = useState<string | null>(null)
  const [ejSelNombre, setEjSelNombre] = useState('')
  const [ejCustom, setEjCustom] = useState('')
  const [ejSeries, setEjSeries] = useState('3')
  const [ejReps, setEjReps] = useState('10')
  const [ejPeso, setEjPeso] = useState('')
  const [ejDescanso, setEjDescanso] = useState('1')
  const [ejGrupo, setEjGrupo] = useState('')
  const [ejModalidad, setEjModalidad] = useState<'repeticion' | 'tiempo' | 'intervalo'>('repeticion')
  const [ejDescSerie, setEjDescSerie] = useState('10')

  const gruposMusculares = useMemo(() => {
    const custom = [...new Set(
      ejerciciosLib.map(e => e.grupo_muscular?.toLowerCase()).filter((g): g is string => !!g && !GRUPOS_BASE.includes(g))
    )]
    return [
      ...GRUPOS_BASE.map(v => ({ value: v, label: LABELS_GRUPO[v] })),
      ...custom.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })),
    ]
  }, [ejerciciosLib])

  const filteredEj = useMemo(() => {
    let r = ejerciciosLib
    if (ejSearch) r = r.filter(e => e.nombre.toLowerCase().includes(ejSearch.toLowerCase()))
    if (ejGrupo) r = r.filter(e => e.grupo_muscular === ejGrupo)
    return r.slice(0, 15)
  }, [ejerciciosLib, ejSearch, ejGrupo])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const resetAddForm = () => {
    setShowAddForm(false); setEjSearch(''); setEjSelId(null)
    setEjSelNombre(''); setEjCustom(''); setEjGrupo('')
    setEjSeries('3'); setEjReps('10'); setEjPeso(''); setEjDescanso('1')
    setEjModalidad('repeticion'); setEjDescSerie('10')
  }

  const reset = () => {
    setStep(1); setNombre(''); setNivel(''); setNotas('')
    setPartesCerradas([]); setIsNuevaParte(false); setNuevaParteNombre('')
    setTipo(''); setEjercicios([])
    resetAddForm(); setError(null)
  }

  const handleClose = (v: boolean) => {
    if (!v) { reset(); onClose() }
  }

  const selectEjLib = (ej: EjercicioLib) => {
    setEjSelId(ej.id); setEjSelNombre(ej.nombre); setEjSearch(ej.nombre)
  }

  const addEjercicio = () => {
    const nombreFinal = ejSelId ? ejSelNombre : ejCustom.trim()
    if (!nombreFinal) return
    const m = ejModalidad
    setEjercicios(prev => [...prev, {
      tmpId: uid(),
      ejercicioId: ejSelId,
      nombre: nombreFinal,
      series: parseInt(ejSeries) || (m === 'tiempo' ? 1 : 3),
      repeticiones: ejReps || (m === 'repeticion' ? '10' : '30'),
      peso: m === 'repeticion' ? ejPeso : '',
      descansoSegundos: (parseInt(ejDescanso) || (m === 'repeticion' ? 1 : 2)) * 60,
      modalidad: m,
      descansoSerie: m === 'intervalo' ? (parseInt(ejDescSerie) || 10) : null,
    }])
    resetAddForm()
  }

  // Guarda la parte actual y prepara una nueva
  const handleAddParte = () => {
    const parteNombre = partesCerradas.length === 0
      ? nombre
      : (nuevaParteNombre.trim() || `Parte ${partesCerradas.length + 1}`)
    setPartesCerradas(prev => [...prev, { tmpId: uid(), nombre: parteNombre, tipo, ejercicios }])
    setTipo('')
    setEjercicios([])
    setNuevaParteNombre('')
    setIsNuevaParte(true)
    resetAddForm()
    setStep(2)
  }

  // Atrás desde paso 2 de una parte nueva: deshace la parte recién guardada
  const handleBack = () => {
    if (step === 2 && isNuevaParte) {
      const ultima = partesCerradas[partesCerradas.length - 1]
      setPartesCerradas(prev => prev.slice(0, -1))
      setTipo(ultima.tipo)
      setEjercicios(ultima.ejercicios)
      setIsNuevaParte(partesCerradas.length > 1)
      setStep(3)
      return
    }
    if (step > 1) setStep(s => s - 1)
    else handleClose(false)
  }

  // Nombre de la parte en construcción
  const currentParteName = isNuevaParte
    ? (nuevaParteNombre.trim() || `Parte ${partesCerradas.length + 1}`)
    : nombre

  // Todas las partes al guardar
  const todasLasPartes = (): Parte[] => [
    ...partesCerradas,
    { tmpId: uid(), nombre: currentParteName, tipo, ejercicios },
  ]

  const canNext = () => {
    if (step === 1) return nombre.trim().length > 0 && nivel !== ''
    if (step === 2) return tipo !== ''
    return true
  }

  const handleSave = () => {
    if (!fechaInicio || !fechaFin) { setError('Fechas no disponibles'); return }
    setError(null)
    const partes = todasLasPartes()
    startTransition(async () => {
      for (const parte of partes) {
        const result = await crearSesionPersonalizada({
          clienteId,
          fechaInicio,
          fechaFin,
          nombre: parte.nombre,
          nivel,
          notas,
          tipo: parte.tipo,
          ejercicios: parte.ejercicios.map(e => ({
            ejercicioId: e.ejercicioId,
            nombreCustom: e.ejercicioId ? null : e.nombre,
            series: e.series,
            repeticiones: e.repeticiones,
            peso: e.peso,
            descansoSegundos: e.descansoSegundos,
            modalidad: e.modalidad,
            descansoSerie: e.descansoSerie,
          })),
        })
        if (result.error) { setError(result.error); return }
      }
      reset()
      onClose()
      router.refresh()
    })
  }

  const canAddEj = ejSelId ? true : ejCustom.trim().length > 0
  const parteNum = partesCerradas.length + 1

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sesión personalizada</DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} partesCerradas={partesCerradas} isNuevaParte={isNuevaParte} />

        {/* ── Step 1: Nombre + Nivel ── */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            {sesionesLabel.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Días</p>
                <div className="flex flex-wrap gap-1.5">
                  {sesionesLabel.map((l, i) => (
                    <Badge key={i} variant="outline" className="capitalize text-xs font-normal">{l}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="sp-nombre">Nombre de la sesión</Label>
              <Input id="sp-nombre" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Fuerza tren superior" maxLength={20} autoFocus />
            </div>
            <div className="grid gap-2">
              <Label>Nivel</Label>
              <div className="flex flex-col gap-2">
                {NIVELES.map(n => (
                  <button key={n.value} type="button" onClick={() => setNivel(n.value)}
                    className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition ${
                      nivel === n.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                    {nivel === n.value && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Tipo ── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            {isNuevaParte && (
              <div className="grid gap-1.5">
                <Label htmlFor="sp-parte-nombre">Nombre de la Parte {parteNum} <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                <Input id="sp-parte-nombre" value={nuevaParteNombre}
                  onChange={e => setNuevaParteNombre(e.target.value)} maxLength={20}
                  placeholder={`Ej: Cardio, Tren inferior, Parte ${parteNum}...`} autoFocus />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Tipo de la {isNuevaParte ? `Parte ${parteNum}` : 'sesión'}</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {TIPOS.map(t => (
                  <button key={t.value} type="button" onClick={() => setTipo(t.value)}
                    className={`rounded-xl border-2 px-4 py-3 text-left transition font-semibold text-sm ${
                      tipo === t.value ? t.color : 'border-slate-100 bg-white hover:border-slate-200 text-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Ejercicios ── */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            {/* Partes cerradas (resumen compacto) */}
            {partesCerradas.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {partesCerradas.map((p, i) => (
                  <div key={p.tmpId} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground truncate">{p.nombre}</span>
                      <Badge variant="outline" className="capitalize text-[10px] py-0 h-4 shrink-0">{p.tipo}</Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {p.ejercicios.length} ej.
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-2 my-1">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Parte {parteNum}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Agrega los ejercicios{partesCerradas.length > 0 ? ` de la Parte ${parteNum}` : ''}. Puedes saltarte este paso.
            </p>

            {/* Lista de ejercicios de la parte actual */}
            {ejercicios.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {ejercicios.map((ej, idx) => (
                  <div key={ej.tmpId} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                    <span className="w-5 text-xs text-muted-foreground text-center shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ej.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {ej.modalidad === 'tiempo'
                          ? `${ej.series} × ${ej.repeticiones}min${ej.descansoSegundos > 0 ? ` · ${Math.round(ej.descansoSegundos / 60)}min desc.` : ''}`
                          : ej.modalidad === 'intervalo'
                          ? `${ej.series} rondas × ${ej.repeticiones}s${(ej.descansoSerie ?? 0) > 0 ? ` · ${ej.descansoSerie}s/int.` : ''}${ej.descansoSegundos > 0 ? ` · ${Math.round(ej.descansoSegundos / 60)}min desc.` : ''}`
                          : `${ej.series} series · ${ej.repeticiones} reps${ej.peso ? ` · ${ej.peso}kg` : ''}${ej.descansoSegundos > 0 ? ` · ${Math.round(ej.descansoSegundos / 60)}min` : ''}`
                        }
                      </p>
                    </div>
                    <button type="button" onClick={() => setEjercicios(prev => prev.filter(e => e.tmpId !== ej.tmpId))}
                      className="text-muted-foreground hover:text-destructive transition shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario agregar ejercicio */}
            {showAddForm ? (
              <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-4 flex flex-col gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs">Buscar en la librería</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input className="pl-8 h-8 text-sm" placeholder="Curl bíceps, sentadilla..."
                      value={ejSearch} autoFocus
                      onChange={e => { setEjSearch(e.target.value); setEjSelId(null); setEjSelNombre('') }} />
                  </div>
                  {!ejSelId && (
                    <div className="flex gap-1 flex-wrap">
                      {gruposMusculares.map(g => (
                        <button key={g.value} type="button"
                          onClick={() => setEjGrupo(g.value === ejGrupo ? '' : g.value)}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
                            ejGrupo === g.value
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >{g.label}</button>
                      ))}
                    </div>
                  )}
                  {(ejSearch || ejGrupo) && !ejSelId && (
                    <div className="flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden max-h-40 overflow-y-auto">
                      {filteredEj.length > 0 ? filteredEj.map(ej => (
                        <button key={ej.id} type="button" onClick={() => selectEjLib(ej)}
                          className="flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 transition">
                          <span className="font-medium">{ej.nombre}</span>
                          <span className="text-xs text-muted-foreground ml-2 capitalize">{ej.grupo_muscular}</span>
                        </button>
                      )) : (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados — escribe el nombre abajo</p>
                      )}
                    </div>
                  )}
                  {ejSelId && <p className="text-xs text-emerald-700 font-medium">✓ {ejSelNombre}</p>}
                </div>

                {!ejSelId && (
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">O escribe un nombre personalizado</Label>
                    <Input className="h-8 text-sm" placeholder="Nombre del ejercicio"
                      value={ejCustom} maxLength={20}
                      onChange={e => setEjCustom(e.target.value.slice(0, 20))} />
                  </div>
                )}

                <div className="flex rounded-lg border border-slate-200 overflow-hidden h-8">
                  {(['repeticion', 'tiempo', 'intervalo'] as const).map((m, i) => (
                    <button key={m} type="button"
                      onClick={() => { setEjModalidad(m); setEjDescanso(m === 'repeticion' ? '1' : '2'); setEjSeries(m === 'tiempo' ? '1' : '3') }}
                      className={`flex-1 text-xs font-medium transition ${i > 0 ? 'border-l border-slate-200' : ''} ${
                        ejModalidad === m ? 'bg-emerald-600 text-white' : 'bg-white text-muted-foreground hover:bg-slate-50'
                      }`}
                    >
                      {m === 'repeticion' ? 'Repetición' : m === 'tiempo' ? 'Tiempo' : 'Intervalo'}
                    </button>
                  ))}
                </div>
                {ejModalidad === 'tiempo' && <p className="text-[11px] text-muted-foreground -mt-1">Trotadora, bicicleta, resistencia continua</p>}
                {ejModalidad === 'intervalo' && <p className="text-[11px] text-muted-foreground -mt-1">HIIT, trabajo por intervalos de tiempo</p>}

                {ejModalidad === 'repeticion' && (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="grid gap-1"><Label className="text-xs">Series</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" value={ejSeries} placeholder="3" onChange={e => setEjSeries(num3(e.target.value))} /></div>
                    <div className="grid gap-1"><Label className="text-xs">Reps</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" value={ejReps} placeholder="10" onChange={e => setEjReps(num3(e.target.value))} /></div>
                    <div className="grid gap-1"><Label className="text-xs">Peso</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" value={ejPeso} placeholder="kg" onChange={e => setEjPeso(num3(e.target.value))} /></div>
                    <div className="grid gap-1"><Label className="text-xs">Desc. (min)</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" value={ejDescanso} placeholder="1" onChange={e => setEjDescanso(num3(e.target.value))} /></div>
                  </div>
                )}
                {ejModalidad === 'tiempo' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="grid gap-1"><Label className="text-xs">Series</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" value={ejSeries} placeholder="1" onChange={e => setEjSeries(num3(e.target.value))} /></div>
                    <div className="grid gap-1"><Label className="text-xs">Duración (min)</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" value={ejReps} placeholder="30" onChange={e => setEjReps(num3(e.target.value))} /></div>
                    <div className="grid gap-1"><Label className="text-xs">Desc. (min)</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" value={ejDescanso} placeholder="2" onChange={e => setEjDescanso(num3(e.target.value))} /></div>
                  </div>
                )}
                {ejModalidad === 'intervalo' && (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="grid gap-1"><Label className="text-xs">Rondas</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" value={ejSeries} placeholder="8" onChange={e => setEjSeries(num3(e.target.value))} /></div>
                    <div className="grid gap-1"><Label className="text-xs">Trabajo (s)</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" value={ejReps} placeholder="30" onChange={e => setEjReps(num3(e.target.value))} /></div>
                    <div className="grid gap-1"><Label className="text-xs">D./int. (s)</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" value={ejDescSerie} placeholder="10" onChange={e => setEjDescSerie(num3(e.target.value))} /></div>
                    <div className="grid gap-1"><Label className="text-xs">Desc. (min)</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" value={ejDescanso} placeholder="2" onChange={e => setEjDescanso(num3(e.target.value))} /></div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 h-8"
                    disabled={!canAddEj} onClick={addEjercicio}>Agregar</Button>
                  <Button size="sm" type="button" variant="ghost" className="h-8" onClick={resetAddForm}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" type="button" className="gap-2 border-dashed w-full"
                onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4" /> Agregar ejercicio
              </Button>
            )}

            {/* Añadir otra parte */}
            {!showAddForm && (
              <div className="pt-2 border-t border-slate-100">
                <Button variant="outline" type="button" className="gap-2 w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                  onClick={handleAddParte}>
                  <Plus className="h-4 w-4" />
                  Guardar y añadir Parte {parteNum + 1}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Notas + resumen ── */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-foreground">{nombre}</span>
                <Badge variant="outline" className="capitalize text-xs ml-auto">{nivel}</Badge>
              </div>
              {todasLasPartes().map((parte, pi) => (
                <div key={parte.tmpId} className={`flex flex-col gap-1 ${pi > 0 ? 'pt-2 border-t border-slate-200' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{parte.nombre}</span>
                    <Badge variant="outline" className="capitalize text-[10px] py-0 h-4">{parte.tipo}</Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">{parte.ejercicios.length} ej.</span>
                  </div>
                  {parte.ejercicios.length > 0 && (
                    <ul className="flex flex-col gap-0.5 mt-0.5">
                      {parte.ejercicios.map((ej, i) => (
                        <li key={ej.tmpId} className="text-xs text-muted-foreground flex gap-2">
                          <span className="w-4 text-slate-300 shrink-0">{i + 1}.</span>
                          <span>
                            {ej.nombre} — {ej.modalidad === 'tiempo'
                              ? `${ej.series}×${ej.repeticiones}min`
                              : ej.modalidad === 'intervalo'
                              ? `${ej.series}×${ej.repeticiones}s`
                              : `${ej.series}×${ej.repeticiones}${ej.peso ? ` · ${ej.peso}kg` : ''}`
                            }
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="sp-notas">Notas adicionales</Label>
              <Textarea id="sp-notas" value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="Indicaciones específicas para esta sesión..." rows={3} maxLength={100} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {/* ── Navegación ── */}
        <div className="flex justify-between mt-4 pt-4 border-t border-slate-100">
          <Button variant="ghost" onClick={handleBack} disabled={isPending}>
            {step === 1 ? 'Cancelar' : 'Atrás'}
          </Button>
          {step < 4 ? (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSave} disabled={isPending}>
              {isPending
                ? 'Guardando...'
                : todasLasPartes().length > 1
                ? `Guardar ${todasLasPartes().length} partes`
                : 'Guardar sesión'
              }
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
