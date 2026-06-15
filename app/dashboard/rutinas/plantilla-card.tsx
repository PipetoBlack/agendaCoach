'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Dumbbell, Edit2, Trash2, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { deletePlantilla, updatePlantillaCompleta } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

type EjercicioLib = { id: string; nombre: string; grupo_muscular: string }

type EjRutina = {
  id: string
  series: number
  repeticiones: string
  peso: string | null
  descanso_segundos: number
  descanso_serie: number | null
  modalidad: string
  nombre_custom: string | null
  orden: number
  ejercicios: { id: string; nombre: string } | null
}

type DiaPlantilla = {
  id: string
  tipo: string
  foco: string
  orden: number
  rutina_ejercicios: EjRutina[]
}

export type PlantillaConDatos = {
  id: string
  nombre: string
  nivel: string | null
  notas: string | null
  creado_en: string
  rutina_dias: DiaPlantilla[]
}

// Represents an exercise in the edit form (existing from DB or new pending)
type EjEdit = {
  tmpId: string
  dbId: string | null
  ejercicioId: string | null
  nombre: string
  series: number
  repeticiones: string
  peso: string
  descansoSegundos: number
  modalidad: string
  descSerie: number | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
const GRUPOS_BASE = ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core', 'fullbody']
const LABELS_GRUPO: Record<string, string> = {
  pecho: 'Pecho', espalda: 'Espalda', piernas: 'Piernas', hombros: 'Hombros',
  brazos: 'Brazos', core: 'Core', fullbody: 'Full body',
}
const NIVELES = ['basico', 'intermedio', 'avanzado']
const TIPOS = ['fuerza', 'resistencia', 'hipertrofia', 'movilidad', 'funcional', 'mixto']
const num3 = (v: string) => v.replace(/\D/g, '').slice(0, 3)
const txt20 = (v: string) => v.slice(0, 20)

type Mode = 'view' | 'edit' | 'delete'

// ── Component ─────────────────────────────────────────────────────────────────

export function PlantillaCard({
  plantilla,
  ejerciciosLib,
}: {
  plantilla: PlantillaConDatos
  ejerciciosLib: EjercicioLib[]
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('view')
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)
  const router = useRouter()

  const dia = plantilla.rutina_dias[0] ?? null
  const tipo = dia?.tipo ?? ''
  const ejercicios = dia
    ? [...(dia.rutina_ejercicios ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    : []

  const nombreEj = (ej: EjRutina) => ej.ejercicios?.nombre ?? ej.nombre_custom ?? '—'

  // ── Edit: basic fields ──
  const [editNombre, setEditNombre] = useState(plantilla.nombre)
  const [editNivel, setEditNivel] = useState(plantilla.nivel ?? '')
  const [editTipo, setEditTipo] = useState(tipo)
  const [editNotas, setEditNotas] = useState(plantilla.notas ?? '')

  // ── Edit: exercises ──
  const [editEjercicios, setEditEjercicios] = useState<EjEdit[]>([])
  const [showAddEjForm, setShowAddEjForm] = useState(false)
  const [ejSearch, setEjSearch] = useState('')
  const [ejSelId, setEjSelId] = useState<string | null>(null)
  const [ejSelNombre, setEjSelNombre] = useState('')
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
      ejerciciosLib.map(e => e.grupo_muscular?.toLowerCase()).filter((g): g is string => !!g && !GRUPOS_BASE.includes(g))
    )]
    return [
      ...GRUPOS_BASE.map(v => ({ value: v, label: LABELS_GRUPO[v] })),
      ...custom.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })),
    ]
  }, [ejerciciosLib])

  const filteredLib = useMemo(() => {
    let r = ejerciciosLib
    if (ejSearch) r = r.filter(e => e.nombre.toLowerCase().includes(ejSearch.toLowerCase()))
    if (ejGrupo) r = r.filter(e => e.grupo_muscular === ejGrupo)
    return r.slice(0, 15)
  }, [ejerciciosLib, ejSearch, ejGrupo])

  const enterEdit = () => {
    setEditNombre(plantilla.nombre)
    setEditNivel(plantilla.nivel ?? '')
    setEditTipo(tipo)
    setEditNotas(plantilla.notas ?? '')
    setEditEjercicios(
      ejercicios.map(ej => ({
        tmpId: uid(),
        dbId: ej.id,
        ejercicioId: ej.ejercicios?.id ?? null,
        nombre: nombreEj(ej),
        series: ej.series,
        repeticiones: ej.repeticiones,
        peso: ej.peso ?? '',
        descansoSegundos: ej.descanso_segundos,
        modalidad: ej.modalidad ?? 'repeticion',
        descSerie: ej.descanso_serie ?? null,
      }))
    )
    setSaveError(null)
    setMode('edit')
  }

  const resetAddEj = () => {
    setShowAddEjForm(false)
    setEjSearch(''); setEjSelId(null); setEjSelNombre(''); setEjCustom('')
    setEjSeries('3'); setEjReps('10'); setEjPeso(''); setEjDescanso('60'); setEjGrupo('')
    setEjModalidad('repeticion'); setEjDescSerie('10')
  }

  const handleClose = (v: boolean) => {
    setOpen(v)
    if (!v) { setMode('view'); setSaveError(null); resetAddEj() }
  }

  const selectEjLib = (ej: EjercicioLib) => {
    setEjSelId(ej.id); setEjSelNombre(ej.nombre); setEjSearch(ej.nombre)
  }

  const commitAddEj = () => {
    const nombre = ejSelId ? ejSelNombre : ejCustom.trim()
    if (!nombre) return
    const m = ejModalidad
    setEditEjercicios(prev => [...prev, {
      tmpId: uid(),
      dbId: null,
      ejercicioId: ejSelId,
      nombre,
      series: parseInt(ejSeries) || (m === 'tiempo' ? 1 : 3),
      repeticiones: ejReps || (m === 'repeticion' ? '10' : '30'),
      peso: m === 'repeticion' ? ejPeso : '',
      descansoSegundos: m === 'repeticion' ? (parseInt(ejDescanso) || 60) : (parseInt(ejDescanso) || 2) * 60,
      modalidad: m,
      descSerie: m === 'intervalo' ? (parseInt(ejDescSerie) || 10) : null,
    }])
    resetAddEj()
  }

  const removeEjFromEdit = (tmpId: string) =>
    setEditEjercicios(prev => prev.filter(e => e.tmpId !== tmpId))

  const handleSave = () => {
    if (!editNombre.trim()) { setSaveError('El nombre no puede estar vacío'); return }
    setSaveError(null)

    const originalIds = new Set(ejercicios.map(e => e.id))
    const keptIds = new Set(editEjercicios.filter(e => e.dbId).map(e => e.dbId!))
    const toRemove = [...originalIds].filter(id => !keptIds.has(id))
    const toAdd = editEjercicios
      .filter(e => !e.dbId)
      .map(e => ({
        ejercicioId: e.ejercicioId,
        nombreCustom: e.ejercicioId ? null : e.nombre,
        series: e.series,
        repeticiones: e.repeticiones,
        peso: e.peso,
        descansoSegundos: e.descansoSegundos,
        modalidad: e.modalidad,
        descansoSerie: e.descSerie,
      }))

    startTransition(async () => {
      const result = await updatePlantillaCompleta(plantilla.id, {
        nombre: editNombre,
        nivel: editNivel,
        notas: editNotas,
        tipo: editTipo,
        diaId: dia?.id ?? null,
        ejerciciosToRemove: toRemove,
        ejerciciosToAdd: toAdd,
      })
      if (result.error) { setSaveError(result.error); return }
      setMode('view')
      router.refresh()
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deletePlantilla(plantilla.id)
      setOpen(false)
      router.refresh()
    })
  }

  const canAddEj = ejSelId ? true : ejCustom.trim().length > 0

  return (
    <>
      {/* ── Tarjeta ── */}
      <button
        type="button"
        onClick={() => { setMode('view'); setOpen(true) }}
        className="flex items-center justify-between w-full rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 shrink-0">
            <Dumbbell className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{plantilla.nombre}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {ejercicios.length} ejercicio{ejercicios.length !== 1 ? 's' : ''}
              {tipo ? ` · ${tipo}` : ''}
              {plantilla.nivel ? ` · ${plantilla.nivel}` : ''}
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      </button>

      {/* ── Dialog ── */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === 'edit' ? 'Editar plantilla' : mode === 'delete' ? 'Eliminar plantilla' : plantilla.nombre}
            </DialogTitle>
          </DialogHeader>

          {/* ═══ Vista detalle ═══ */}
          {mode === 'view' && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2 flex-wrap">
                {plantilla.nivel && <Badge variant="outline" className="capitalize">{plantilla.nivel}</Badge>}
                {tipo && <Badge variant="outline" className="capitalize">{tipo}</Badge>}
                <Badge variant="outline">{ejercicios.length} ejercicio{ejercicios.length !== 1 ? 's' : ''}</Badge>
              </div>

              {ejercicios.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ejercicios</p>
                  {ejercicios.map((ej, i) => (
                    <div key={ej.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <span className="w-5 text-xs text-muted-foreground text-center shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{nombreEj(ej)}</p>
                        <p className="text-xs text-muted-foreground">
                          {ej.modalidad === 'tiempo'
                            ? `${ej.series} × ${ej.repeticiones}min · ${Math.round(ej.descanso_segundos / 60)}min desc.`
                            : ej.modalidad === 'intervalo'
                            ? `${ej.series} rondas × ${ej.repeticiones}s · ${ej.descanso_serie ?? 0}s/int. · ${Math.round(ej.descanso_segundos / 60)}min desc.`
                            : `${ej.series} series · ${ej.repeticiones} reps${ej.peso ? ` · ${ej.peso}` : ''} · ${ej.descanso_segundos}s descanso`
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Sin ejercicios agregados aún.</p>
              )}

              {plantilla.notas && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notas</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{plantilla.notas}</p>
                </div>
              )}

              <div className="flex justify-between pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                  onClick={() => setMode('delete')}>
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  onClick={enterEdit}>
                  <Edit2 className="h-3.5 w-3.5" /> Editar
                </Button>
              </div>
            </div>
          )}

          {/* ═══ Editar ═══ */}
          {mode === 'edit' && (
            <div className="flex flex-col gap-4">

              {/* Nombre */}
              <div className="grid gap-1.5">
                <Label>Nombre <span className="text-muted-foreground font-normal text-xs">({editNombre.length}/20)</span></Label>
                <Input value={editNombre} maxLength={20} autoFocus
                  onChange={e => setEditNombre(txt20(e.target.value))} />
              </div>

              {/* Nivel */}
              <div className="grid gap-2">
                <Label>Nivel</Label>
                <div className="flex gap-2 flex-wrap">
                  {NIVELES.map(n => (
                    <button key={n} type="button" onClick={() => setEditNivel(n)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
                        editNivel === n ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >{n}</button>
                  ))}
                </div>
              </div>

              {/* Tipo */}
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <div className="flex gap-2 flex-wrap">
                  {TIPOS.map(t => (
                    <button key={t} type="button" onClick={() => setEditTipo(t)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
                        editTipo === t ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >{t}</button>
                  ))}
                </div>
              </div>

              {/* Ejercicios */}
              <div className="grid gap-2">
                <Label>Ejercicios</Label>

                {editEjercicios.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {editEjercicios.map((ej, i) => (
                      <div key={ej.tmpId} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <span className="w-5 text-xs text-muted-foreground text-center shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{ej.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {ej.modalidad === 'tiempo'
                              ? `${ej.series} × ${ej.repeticiones}min · ${Math.round(ej.descansoSegundos / 60)}min desc.`
                              : ej.modalidad === 'intervalo'
                              ? `${ej.series} rondas × ${ej.repeticiones}s · ${ej.descSerie ?? 0}s/int. · ${Math.round(ej.descansoSegundos / 60)}min desc.`
                              : `${ej.series} series · ${ej.repeticiones} reps${ej.peso ? ` · ${ej.peso}` : ''} · ${ej.descansoSegundos}s`
                            }
                          </p>
                        </div>
                        <button type="button" onClick={() => removeEjFromEdit(ej.tmpId)}
                          className="text-muted-foreground hover:text-destructive transition shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulario agregar ejercicio */}
                {showAddEjForm ? (
                  <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-3 flex flex-col gap-3">
                    {/* Búsqueda */}
                    <div className="grid gap-1.5">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input className="pl-8 h-8 text-sm" placeholder="Buscar ejercicio..."
                          value={ejSearch} autoFocus
                          onChange={e => { setEjSearch(e.target.value); setEjSelId(null); setEjSelNombre('') }} />
                      </div>

                      {/* Chips de grupo muscular */}
                      <div className="flex flex-wrap gap-1">
                        {gruposMusculares.map(g => (
                          <button
                            key={g.value}
                            type="button"
                            onClick={() => { setEjGrupo(prev => prev === g.value ? '' : g.value); setEjSelId(null); setEjSelNombre('') }}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition ${
                              ejGrupo === g.value
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-muted-foreground border-slate-200 hover:border-emerald-300'
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>

                      {(ejSearch || ejGrupo) && !ejSelId && (
                        <div className="flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden max-h-32 overflow-y-auto">
                          {ejSearch === '' && ejGrupo && (
                            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              {gruposMusculares.find(g => g.value === ejGrupo)?.label}
                            </p>
                          )}
                          {filteredLib.length > 0 ? filteredLib.map(ej => (
                            <button key={ej.id} type="button" onClick={() => selectEjLib(ej)}
                              className="flex items-center justify-between px-3 py-1.5 text-sm text-left hover:bg-slate-50 transition">
                              <span className="font-medium">{ej.nombre}</span>
                              <span className="text-xs text-muted-foreground ml-2 capitalize">{ej.grupo_muscular}</span>
                            </button>
                          )) : (
                            <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
                          )}
                        </div>
                      )}

                      {ejSelId && <p className="text-xs text-emerald-700 font-medium">✓ {ejSelNombre}</p>}
                    </div>

                    {!ejSelId && (
                      <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">O nombre personalizado</Label>
                        <Input className="h-8 text-sm" placeholder="Nombre del ejercicio"
                          maxLength={20} value={ejCustom}
                          onChange={e => setEjCustom(txt20(e.target.value))} />
                      </div>
                    )}

                    {/* Modalidad toggle */}
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

                    {/* Parámetros */}
                    {ejModalidad === 'repeticion' && (
                      <div className="grid grid-cols-4 gap-2">
                        <div className="grid gap-1">
                          <Label className="text-xs">Series</Label>
                          <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                            value={ejSeries} placeholder="3"
                            onChange={e => setEjSeries(num3(e.target.value))} />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Reps</Label>
                          <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                            value={ejReps} placeholder="10"
                            onChange={e => setEjReps(num3(e.target.value))} />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Peso</Label>
                          <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                            value={ejPeso} placeholder="kg"
                            onChange={e => setEjPeso(num3(e.target.value))} />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Desc. (s)</Label>
                          <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                            value={ejDescanso} placeholder="60"
                            onChange={e => setEjDescanso(num3(e.target.value))} />
                        </div>
                      </div>
                    )}
                    {ejModalidad === 'tiempo' && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="grid gap-1">
                          <Label className="text-xs">Series</Label>
                          <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                            value={ejSeries} placeholder="1"
                            onChange={e => setEjSeries(num3(e.target.value))} />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Duración (min)</Label>
                          <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                            value={ejReps} placeholder="30"
                            onChange={e => setEjReps(num3(e.target.value))} />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Desc. (min)</Label>
                          <Input className="h-7 text-xs" inputMode="numeric" maxLength={2}
                            value={ejDescanso} placeholder="2"
                            onChange={e => setEjDescanso(num3(e.target.value))} />
                        </div>
                      </div>
                    )}
                    {ejModalidad === 'intervalo' && (
                      <div className="grid grid-cols-4 gap-2">
                        <div className="grid gap-1">
                          <Label className="text-xs">Rondas</Label>
                          <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                            value={ejSeries} placeholder="8"
                            onChange={e => setEjSeries(num3(e.target.value))} />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Trabajo (s)</Label>
                          <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                            value={ejReps} placeholder="30"
                            onChange={e => setEjReps(num3(e.target.value))} />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">D./int. (s)</Label>
                          <Input className="h-7 text-xs" inputMode="numeric" maxLength={3}
                            value={ejDescSerie} placeholder="10"
                            onChange={e => setEjDescSerie(num3(e.target.value))} />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Desc. (min)</Label>
                          <Input className="h-7 text-xs" inputMode="numeric" maxLength={2}
                            value={ejDescanso} placeholder="2"
                            onChange={e => setEjDescanso(num3(e.target.value))} />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button size="sm" type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 h-8"
                        disabled={!canAddEj} onClick={commitAddEj}>
                        Agregar
                      </Button>
                      <Button size="sm" type="button" variant="ghost" className="h-8" onClick={resetAddEj}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" type="button" className="gap-2 border-dashed w-full h-8 text-xs"
                    onClick={() => setShowAddEjForm(true)}>
                    <Plus className="h-3.5 w-3.5" /> Agregar ejercicio
                  </Button>
                )}
              </div>

              {/* Notas */}
              <div className="grid gap-1.5">
                <Label>Notas <span className="text-muted-foreground font-normal text-xs">({editNotas.length}/100)</span></Label>
                <Textarea value={editNotas} rows={3} maxLength={100}
                  placeholder="Indicaciones, progresión, observaciones..."
                  onChange={e => setEditNotas(e.target.value.slice(0, 100))} />
              </div>

              {saveError && <p className="text-sm text-destructive">{saveError}</p>}

              <div className="flex justify-between pt-3 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setMode('view')} disabled={isPending}>Cancelar</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleSave} disabled={isPending || !editNombre.trim()}>
                  {isPending ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </div>
          )}

          {/* ═══ Confirmar eliminación ═══ */}
          {mode === 'delete' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-foreground">
                ¿Eliminar la plantilla <strong>{plantilla.nombre}</strong>? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-between pt-3 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setMode('view')} disabled={isPending}>Cancelar</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                  {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
