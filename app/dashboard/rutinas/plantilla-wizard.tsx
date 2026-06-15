'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Search, ChevronRight, Check, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { createPlantillaCompleta } from './actions'

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

// Avoid crypto.randomUUID which isn't available in all environments
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

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

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-6">
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
    </div>
  )
}

export function PlantillaWizard({ ejercicios }: { ejercicios: EjercicioLib[] }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Step 1
  const [nombre, setNombre] = useState('')
  const [nivel, setNivel] = useState('')
  // Step 2
  const [tipo, setTipo] = useState('')
  // Step 3 — ejercicios directos (sin días)
  const [ejerciciosRutina, setEjerciciosRutina] = useState<EjLocal[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [ejSearch, setEjSearch] = useState('')
  const [ejSelectedId, setEjSelectedId] = useState<string | null>(null)
  const [ejSelectedNombre, setEjSelectedNombre] = useState('')
  const [ejCustom, setEjCustom] = useState('')
  const [ejSeries, setEjSeries] = useState('3')
  const [ejReps, setEjReps] = useState('10')
  const [ejPeso, setEjPeso] = useState('')
  const [ejDescanso, setEjDescanso] = useState('60')
  const [ejGrupo, setEjGrupo] = useState('')
  const [ejModalidad, setEjModalidad] = useState<'repeticion' | 'tiempo' | 'intervalo'>('repeticion')
  const [ejDescSerie, setEjDescSerie] = useState('10')

  const gruposMusculares = useMemo(() => {
    const custom = [...new Set(
      ejercicios.map(e => e.grupo_muscular?.toLowerCase()).filter((g): g is string => !!g && !GRUPOS_BASE.includes(g))
    )]
    return [
      ...GRUPOS_BASE.map(v => ({ value: v, label: LABELS_GRUPO[v] })),
      ...custom.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })),
    ]
  }, [ejercicios])

  // Step 4
  const [notas, setNotas] = useState('')

  const reset = () => {
    setStep(1); setNombre(''); setNivel(''); setTipo('')
    setEjerciciosRutina([]); setShowAddForm(false)
    setEjSearch(''); setEjSelectedId(null); setEjSelectedNombre(''); setEjCustom(''); setEjGrupo('')
    setEjSeries('3'); setEjReps('10'); setEjPeso(''); setEjDescanso('60')
    setEjModalidad('repeticion'); setEjDescSerie('10')
    setNotas(''); setError(null)
  }

  const filteredEj = useMemo(() => {
    let r = ejercicios
    if (ejSearch) r = r.filter(e => e.nombre.toLowerCase().includes(ejSearch.toLowerCase()))
    if (ejGrupo) r = r.filter(e => e.grupo_muscular === ejGrupo)
    return r.slice(0, 15)
  }, [ejercicios, ejSearch, ejGrupo])

  const selectEjLib = (ej: EjercicioLib) => {
    setEjSelectedId(ej.id)
    setEjSelectedNombre(ej.nombre)
    setEjSearch(ej.nombre)
  }

  const resetAddForm = () => {
    setShowAddForm(false); setEjSearch(''); setEjSelectedId(null)
    setEjSelectedNombre(''); setEjCustom(''); setEjGrupo('')
    setEjSeries('3'); setEjReps('10'); setEjPeso(''); setEjDescanso('60')
    setEjModalidad('repeticion'); setEjDescSerie('10')
  }

  const addEjercicio = () => {
    const nombreFinal = ejSelectedId ? ejSelectedNombre : ejCustom.trim()
    if (!nombreFinal) return
    const m = ejModalidad
    setEjerciciosRutina(prev => [...prev, {
      tmpId: uid(),
      ejercicioId: ejSelectedId,
      nombre: nombreFinal,
      series: parseInt(ejSeries) || (m === 'tiempo' ? 1 : 3),
      repeticiones: ejReps || (m === 'repeticion' ? '10' : '30'),
      peso: m === 'repeticion' ? ejPeso : '',
      descansoSegundos: m === 'repeticion' ? (parseInt(ejDescanso) || 60) : (parseInt(ejDescanso) || 2) * 60,
      modalidad: m,
      descansoSerie: m === 'intervalo' ? (parseInt(ejDescSerie) || 10) : null,
    }])
    resetAddForm()
  }

  const removeEj = (tmpId: string) =>
    setEjerciciosRutina(prev => prev.filter(e => e.tmpId !== tmpId))

  const canNext = () => {
    if (step === 1) return nombre.trim().length > 0 && nivel !== ''
    if (step === 2) return tipo !== ''
    return true
  }

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const result = await createPlantillaCompleta({
        nombre, nivel, notas,
        // Internamente empaquetamos los ejercicios en un único "día" con el tipo elegido
        dias: [{
          nombre: nombre.trim(),
          tipo,
          foco: 'general',
          ejercicios: ejerciciosRutina.map(e => ({
            ejercicioId: e.ejercicioId,
            nombreCustom: e.ejercicioId ? null : e.nombre,
            series: e.series,
            repeticiones: e.repeticiones,
            peso: e.peso,
            descansoSegundos: e.descansoSegundos,
            modalidad: e.modalidad,
            descansoSerie: e.descansoSerie,
          })),
        }],
      })
      if (result.error) { setError(result.error); return }
      setOpen(false)
      reset()
      router.refresh()
    })
  }

  const canAddEj = ejSelectedId ? true : ejCustom.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Nueva plantilla
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear plantilla de entrenamiento</DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} />

        {/* ── Step 1: Nombre + Nivel ── */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div className="grid gap-1.5">
              <Label htmlFor="nombre-plantilla">Nombre de la plantilla</Label>
              <Input
                id="nombre-plantilla"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Fuerza superior básica"
                maxLength={20}
                autoFocus
              />
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
          <div className="grid gap-2">
            <Label>Tipo de entrenamiento</Label>
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
        )}

        {/* ── Step 3: Ejercicios ── */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Agrega los ejercicios de esta rutina. Puedes saltarte este paso.
            </p>

            {ejerciciosRutina.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {ejerciciosRutina.map((ej, idx) => (
                  <div key={ej.tmpId} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                    <span className="w-5 text-xs text-muted-foreground text-center shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ej.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {ej.modalidad === 'tiempo'
                          ? `${ej.series} × ${ej.repeticiones}min · ${Math.round(ej.descansoSegundos / 60)}min desc.`
                          : ej.modalidad === 'intervalo'
                          ? `${ej.series} rondas × ${ej.repeticiones}s · ${ej.descansoSerie ?? 0}s/int. · ${Math.round(ej.descansoSegundos / 60)}min desc.`
                          : `${ej.series} series · ${ej.repeticiones} reps${ej.peso ? ` · ${ej.peso}kg` : ''} · ${ej.descansoSegundos}s`
                        }
                      </p>
                    </div>
                    <button type="button" onClick={() => removeEj(ej.tmpId)}
                      className="text-muted-foreground hover:text-destructive transition shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showAddForm ? (
              <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-4 flex flex-col gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs">Buscar en la librería</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="pl-8 h-8 text-sm"
                      placeholder="Curl bíceps, sentadilla..."
                      value={ejSearch}
                      onChange={e => {
                        setEjSearch(e.target.value)
                        setEjSelectedId(null)
                        setEjSelectedNombre('')
                      }}
                      autoFocus
                    />
                  </div>

                  {/* Filtro por grupo muscular */}
                  {!ejSelectedId && (
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

                  {(ejSearch || ejGrupo) && !ejSelectedId && (
                    <div className="flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden max-h-40 overflow-y-auto">
                      {ejGrupo && !ejSearch && (
                        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {gruposMusculares.find(g => g.value === ejGrupo)?.label}
                        </p>
                      )}
                      {filteredEj.length > 0 ? filteredEj.map(ej => (
                        <button key={ej.id} type="button" onClick={() => selectEjLib(ej)}
                          className="flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 transition">
                          <span className="font-medium">{ej.nombre}</span>
                          <span className="text-xs text-muted-foreground ml-2 capitalize">{ej.grupo_muscular}</span>
                        </button>
                      )) : (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                          Sin resultados — escribe el nombre abajo
                        </p>
                      )}
                    </div>
                  )}

                  {ejSelectedId && (
                    <p className="text-xs text-emerald-700 font-medium">✓ {ejSelectedNombre}</p>
                  )}
                </div>

                {!ejSelectedId && (
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">O escribe un nombre personalizado</Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="Nombre del ejercicio"
                      value={ejCustom}
                      onChange={e => setEjCustom(e.target.value.slice(0, 20))}
                      maxLength={20}
                    />
                  </div>
                )}

                {/* Modalidad */}
                <div className="flex rounded-lg border border-slate-200 overflow-hidden h-8">
                  {(['repeticion', 'tiempo', 'intervalo'] as const).map((m, i) => (
                    <button key={m} type="button"
                      onClick={() => { setEjModalidad(m); setEjDescanso(m === 'repeticion' ? '60' : '2'); setEjSeries(m === 'tiempo' ? '1' : '3') }}
                      className={`flex-1 text-xs font-medium transition ${i > 0 ? 'border-l border-slate-200' : ''} ${
                        ejModalidad === m ? 'bg-emerald-600 text-white' : 'bg-white text-muted-foreground hover:bg-slate-50'
                      }`}
                    >
                      {m === 'repeticion' ? 'Repetición' : m === 'tiempo' ? 'Tiempo' : 'Intervalo'}
                    </button>
                  ))}
                </div>
                {ejModalidad === 'tiempo' && (
                  <p className="text-[11px] text-muted-foreground -mt-1">Trotadora, bicicleta, resistencia continua</p>
                )}
                {ejModalidad === 'intervalo' && (
                  <p className="text-[11px] text-muted-foreground -mt-1">HIIT, trabajo por intervalos de tiempo</p>
                )}

                {ejModalidad === 'repeticion' && (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">Series</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                        value={ejSeries} placeholder="3"
                        onChange={e => setEjSeries(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Reps</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                        value={ejReps} placeholder="10"
                        onChange={e => setEjReps(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Peso</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                        value={ejPeso} placeholder="kg"
                        onChange={e => setEjPeso(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Desc. (s)</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                        value={ejDescanso} placeholder="60"
                        onChange={e => setEjDescanso(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </div>
                  </div>
                )}
                {ejModalidad === 'tiempo' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">Series</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                        value={ejSeries} placeholder="1"
                        onChange={e => setEjSeries(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Duración (min)</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                        value={ejReps} placeholder="30"
                        onChange={e => setEjReps(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Desc. (min)</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" maxLength={2}
                        value={ejDescanso} placeholder="2"
                        onChange={e => setEjDescanso(e.target.value.replace(/\D/g, '').slice(0, 2))} />
                    </div>
                  </div>
                )}
                {ejModalidad === 'intervalo' && (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">Rondas</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                        value={ejSeries} placeholder="8"
                        onChange={e => setEjSeries(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Trabajo (s)</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                        value={ejReps} placeholder="30"
                        onChange={e => setEjReps(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">D./int. (s)</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                        value={ejDescSerie} placeholder="10"
                        onChange={e => setEjDescSerie(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Desc. (min)</Label>
                      <Input className="h-7 text-xs" inputMode="numeric" maxLength={2}
                        value={ejDescanso} placeholder="2"
                        onChange={e => setEjDescanso(e.target.value.replace(/\D/g, '').slice(0, 2))} />
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" type="button"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 h-8"
                    disabled={!canAddEj} onClick={addEjercicio}>
                    Agregar
                  </Button>
                  <Button size="sm" type="button" variant="ghost" className="h-8" onClick={resetAddForm}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" type="button" className="gap-2 border-dashed w-full"
                onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4" />
                Agregar ejercicio
              </Button>
            )}
          </div>
        )}

        {/* ── Step 4: Notas ── */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-foreground">{nombre}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize text-xs">{nivel}</Badge>
                <Badge variant="outline" className="capitalize text-xs">{tipo}</Badge>
                <Badge variant="outline" className="text-xs">
                  {ejerciciosRutina.length} ejercicio{ejerciciosRutina.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              {ejerciciosRutina.length > 0 && (
                <ul className="mt-1 flex flex-col gap-1">
                  {ejerciciosRutina.map((ej, i) => (
                    <li key={ej.tmpId} className="text-xs text-muted-foreground flex gap-2">
                      <span className="w-4 text-slate-300 shrink-0">{i + 1}.</span>
                      <span>{ej.nombre} — {ej.series}×{ej.repeticiones}{ej.peso ? ` · ${ej.peso}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="notas-plantilla">Notas adicionales</Label>
              <Textarea
                id="notas-plantilla"
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Indicaciones generales, progresión, observaciones..."
                rows={4}
                maxLength={100}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {/* Navegación */}
        <div className="flex justify-between mt-4 pt-4 border-t border-slate-100">
          <Button variant="ghost" onClick={() => step > 1 ? setStep(s => s - 1) : setOpen(false)}>
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
              {isPending ? 'Guardando...' : 'Guardar plantilla'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
