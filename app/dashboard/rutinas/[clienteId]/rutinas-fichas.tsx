'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageCircle, Trash2, Dumbbell, ChevronRight,
  Pencil, Check, X, Plus, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  deleteRutina,
  updateRutinaEjercicio,
  deleteRutinaEjercicio,
  addEjercicioARutina,
} from '../actions'

// ── Types ─────────────────────────────────────────────────────────────────────

type EjercicioLib = { id: string; nombre: string; grupo_muscular: string }

type EjFicha = {
  id: string
  series: number
  repeticiones: string
  peso: string | null
  descanso_segundos: number
  descanso_serie: number | null
  modalidad: string
  nombre_custom: string | null
  orden: number
  ejercicios: { nombre: string } | null
}

type DiaFicha = {
  id: string
  tipo: string
  foco: string
  orden: number
  rutina_ejercicios: EjFicha[]
}

export type RutinaFicha = {
  id: string
  nombre: string
  nivel: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  rutina_dias: DiaFicha[]
}

export type GrupoFicha = {
  key: string
  fecha_inicio: string | null
  fecha_fin: string | null
  rutinas: RutinaFicha[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2)
const num3 = (v: string) => v.replace(/\D/g, '').slice(0, 3)

const fmtCorta = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })

const fmtLarga = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

function buildRangoLabel(fi: string | null, ff: string | null) {
  if (!fi) return 'Sin fecha'
  if (!ff || fi === ff) return fmtCorta(fi)
  return `${fmtCorta(fi)} — ${fmtCorta(ff)}`
}

function safeDescanso(raw: string, fallback: number) {
  const n = parseInt(raw)
  return isNaN(n) ? fallback : n
}

function generarWhatsApp(grupo: GrupoFicha, clienteNombre: string) {
  const lines: string[] = []
  lines.push(`*Plan de entrenamiento — ${clienteNombre}*`)
  if (grupo.fecha_inicio) {
    const fi = fmtLarga(grupo.fecha_inicio)
    const ff = grupo.fecha_fin && grupo.fecha_fin !== grupo.fecha_inicio ? ` al ${fmtLarga(grupo.fecha_fin)}` : ''
    lines.push(`_${fi}${ff}_`)
  }
  for (const rutina of grupo.rutinas) {
    lines.push('')
    lines.push(`*${rutina.nombre}*${rutina.nivel ? ` _(${rutina.nivel})_` : ''}`)
    const dia = [...(rutina.rutina_dias ?? [])].sort((a, b) => a.orden - b.orden)[0]
    if (dia) {
      const ejercicios = [...(dia.rutina_ejercicios ?? [])].sort((a, b) => a.orden - b.orden)
      for (const ej of ejercicios) {
        const nombre = ej.ejercicios?.nombre ?? ej.nombre_custom ?? '—'
        let line: string
        if (ej.modalidad === 'tiempo') {
          line = `• ${nombre}: ${ej.series} × ${ej.repeticiones}min`
          if (ej.descanso_segundos) line += ` · ${Math.round(ej.descanso_segundos / 60)}min desc.`
        } else if (ej.modalidad === 'intervalo') {
          line = `• ${nombre}: ${ej.series} rondas × ${ej.repeticiones}s`
          if (ej.descanso_serie) line += ` · ${ej.descanso_serie}s/int.`
          if (ej.descanso_segundos) line += ` · ${Math.round(ej.descanso_segundos / 60)}min desc.`
        } else {
          line = `• ${nombre}: ${ej.series}×${ej.repeticiones}`
          if (ej.peso) line += ` (${ej.peso} kg)`
          if (ej.descanso_segundos) line += ` · ${Math.round(ej.descanso_segundos / 60)}min desc.`
        }
        lines.push(line)
      }
    }
  }
  lines.push('')
  lines.push('_Enviado con AgendaCoach_')
  return lines.join('\n')
}

// ── Inline edit form for a single exercise ────────────────────────────────────

type EditState = {
  id: string
  modalidad: 'repeticion' | 'tiempo' | 'intervalo'
  series: string
  reps: string
  peso: string
  descanso: string
  descSerie: string
}

function initEdit(ej: EjFicha): EditState {
  const m = (ej.modalidad ?? 'repeticion') as 'repeticion' | 'tiempo' | 'intervalo'
  return {
    id: ej.id,
    modalidad: m,
    series: String(ej.series),
    reps: ej.repeticiones,
    peso: ej.peso ?? '',
    descanso: String(Math.round(ej.descanso_segundos / 60)),
    descSerie: String(ej.descanso_serie ?? 10),
  }
}

function EjEditForm({ ej, clienteId, onDone }: { ej: EjFicha; clienteId: string; onDone: () => void }) {
  const [form, setForm] = useState<EditState>(() => initEdit(ej))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const set = (key: keyof EditState, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const switchMode = (m: 'repeticion' | 'tiempo' | 'intervalo') =>
    setForm(prev => ({ ...prev, modalidad: m, series: m === 'tiempo' ? '1' : prev.series, descanso: m === 'repeticion' ? '60' : '2' }))

  const handleSave = () => {
    const m = form.modalidad
    const descansoSegundos = safeDescanso(form.descanso, m === 'repeticion' ? 1 : 2) * 60
    startTransition(async () => {
      const result = await updateRutinaEjercicio({
        rutinaEjercicioId: form.id,
        clienteId,
        series: parseInt(form.series) || 1,
        repeticiones: form.reps || '10',
        peso: m === 'repeticion' ? form.peso : '',
        descansoSegundos,
        modalidad: m,
        descansoSerie: m === 'intervalo' ? safeDescanso(form.descSerie, 10) : null,
      })
      if (result.error) { setError(result.error); return }
      onDone()
      router.refresh()
    })
  }

  return (
    <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/40 px-3 py-2.5 flex flex-col gap-2">
      <div className="flex rounded-lg border border-slate-200 overflow-hidden h-7">
        {(['repeticion', 'tiempo', 'intervalo'] as const).map((m, i) => (
          <button key={m} type="button" onClick={() => switchMode(m)}
            className={`flex-1 text-[11px] font-medium transition ${i > 0 ? 'border-l border-slate-200' : ''} ${
              form.modalidad === m ? 'bg-emerald-600 text-white' : 'bg-white text-muted-foreground hover:bg-slate-50'
            }`}>
            {m === 'repeticion' ? 'Repetición' : m === 'tiempo' ? 'Tiempo' : 'Intervalo'}
          </button>
        ))}
      </div>
      {form.modalidad === 'repeticion' && (
        <div className="grid grid-cols-4 gap-1.5">
          <div className="grid gap-1"><Label className="text-[10px]">Series</Label><Input className="h-7 text-xs" inputMode="numeric" value={form.series} onChange={e => set('series', num3(e.target.value))} /></div>
          <div className="grid gap-1"><Label className="text-[10px]">Reps</Label><Input className="h-7 text-xs" inputMode="numeric" value={form.reps} onChange={e => set('reps', num3(e.target.value))} /></div>
          <div className="grid gap-1"><Label className="text-[10px]">Peso (kg)</Label><Input className="h-7 text-xs" inputMode="numeric" value={form.peso} onChange={e => set('peso', num3(e.target.value))} /></div>
          <div className="grid gap-1"><Label className="text-[10px]">Desc. (min)</Label><Input className="h-7 text-xs" inputMode="numeric" value={form.descanso} onChange={e => set('descanso', num3(e.target.value))} /></div>
        </div>
      )}
      {form.modalidad === 'tiempo' && (
        <div className="grid grid-cols-3 gap-1.5">
          <div className="grid gap-1"><Label className="text-[10px]">Series</Label><Input className="h-7 text-xs" inputMode="numeric" value={form.series} onChange={e => set('series', num3(e.target.value))} /></div>
          <div className="grid gap-1"><Label className="text-[10px]">Duración (min)</Label><Input className="h-7 text-xs" inputMode="numeric" value={form.reps} onChange={e => set('reps', num3(e.target.value))} /></div>
          <div className="grid gap-1"><Label className="text-[10px]">Desc. (min)</Label><Input className="h-7 text-xs" inputMode="numeric" value={form.descanso} onChange={e => set('descanso', num3(e.target.value))} /></div>
        </div>
      )}
      {form.modalidad === 'intervalo' && (
        <div className="grid grid-cols-4 gap-1.5">
          <div className="grid gap-1"><Label className="text-[10px]">Rondas</Label><Input className="h-7 text-xs" inputMode="numeric" value={form.series} onChange={e => set('series', num3(e.target.value))} /></div>
          <div className="grid gap-1"><Label className="text-[10px]">Trabajo (s)</Label><Input className="h-7 text-xs" inputMode="numeric" value={form.reps} onChange={e => set('reps', num3(e.target.value))} /></div>
          <div className="grid gap-1"><Label className="text-[10px]">D./int. (s)</Label><Input className="h-7 text-xs" inputMode="numeric" value={form.descSerie} onChange={e => set('descSerie', num3(e.target.value))} /></div>
          <div className="grid gap-1"><Label className="text-[10px]">Desc. (min)</Label><Input className="h-7 text-xs" inputMode="numeric" value={form.descanso} onChange={e => set('descanso', num3(e.target.value))} /></div>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-1.5 justify-end">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={onDone} disabled={isPending}>
          <X className="h-3 w-3" /> Cancelar
        </Button>
        <Button size="sm" className="h-7 px-3 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleSave} disabled={isPending}>
          <Check className="h-3 w-3" /> {isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}

// ── Edit panel for a whole rutina ─────────────────────────────────────────────

const GRUPOS_BASE = ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core', 'fullbody']
const LABELS_GRUPO: Record<string, string> = {
  pecho: 'Pecho', espalda: 'Espalda', piernas: 'Piernas', hombros: 'Hombros',
  brazos: 'Brazos', core: 'Core', fullbody: 'Full body',
}

function EditRutinaSection({
  dia,
  ejercicios,
  clienteId,
  ejerciciosLib,
}: {
  dia: DiaFicha | undefined
  ejercicios: EjFicha[]
  clienteId: string
  ejerciciosLib: EjercicioLib[]
}) {
  const [editingEjId, setEditingEjId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [addError, setAddError] = useState<string | null>(null)
  const router = useRouter()

  // Add form state
  const [ejSearch, setEjSearch] = useState('')
  const [ejSelId, setEjSelId] = useState<string | null>(null)
  const [ejSelNombre, setEjSelNombre] = useState('')
  const [ejCustom, setEjCustom] = useState('')
  const [ejGrupo, setEjGrupo] = useState('')
  const [ejSeries, setEjSeries] = useState('3')
  const [ejReps, setEjReps] = useState('10')
  const [ejPeso, setEjPeso] = useState('')
  const [ejDescanso, setEjDescanso] = useState('1')
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

  const resetAddForm = () => {
    setShowAddForm(false); setEjSearch(''); setEjSelId(null); setEjSelNombre('')
    setEjCustom(''); setEjGrupo(''); setEjSeries('3'); setEjReps('10')
    setEjPeso(''); setEjDescanso('1'); setEjModalidad('repeticion'); setEjDescSerie('10')
    setAddError(null)
  }

  const selectEjLib = (ej: EjercicioLib) => {
    setEjSelId(ej.id); setEjSelNombre(ej.nombre); setEjSearch(ej.nombre)
  }

  const switchAddMode = (m: 'repeticion' | 'tiempo' | 'intervalo') => {
    setEjModalidad(m)
    setEjDescanso(m === 'repeticion' ? '1' : '2')
    setEjSeries(m === 'tiempo' ? '1' : '3')
  }

  const handleDeleteEj = (ejId: string) => {
    startTransition(async () => {
      await deleteRutinaEjercicio(ejId, clienteId)
      if (editingEjId === ejId) setEditingEjId(null)
      router.refresh()
    })
  }

  const handleAddEj = () => {
    if (!dia) return
    const nombreFinal = ejSelId ? ejSelNombre : ejCustom.trim()
    if (!nombreFinal) return
    const m = ejModalidad
    const descansoSegundos = safeDescanso(ejDescanso, m === 'repeticion' ? 1 : 2) * 60
    setAddError(null)
    startTransition(async () => {
      const result = await addEjercicioARutina({
        rutinaDiaId: dia.id,
        clienteId,
        ejercicioId: ejSelId,
        nombreCustom: ejSelId ? null : nombreFinal,
        series: parseInt(ejSeries) || (m === 'tiempo' ? 1 : 3),
        repeticiones: ejReps || (m === 'repeticion' ? '10' : '30'),
        peso: m === 'repeticion' ? ejPeso : '',
        descansoSegundos,
        modalidad: m,
        descansoSerie: m === 'intervalo' ? safeDescanso(ejDescSerie, 10) : null,
        orden: ejercicios.length,
      })
      if (result.error) { setAddError(result.error); return }
      resetAddForm()
      router.refresh()
    })
  }

  const canAdd = ejSelId ? true : ejCustom.trim().length > 0

  return (
    <div className="flex flex-col gap-1.5 pl-1">
      {/* Ejercicios existentes */}
      {ejercicios.map((ej, i) => {
        const nombre = ej.ejercicios?.nombre ?? ej.nombre_custom ?? '—'
        const isEditingThis = editingEjId === ej.id

        return (
          <div key={ej.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">{nombre}</span>
                {!isEditingThis && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {ej.modalidad === 'tiempo'
                      ? `${ej.series} × ${ej.repeticiones}min${ej.descanso_segundos > 0 ? ` · ${Math.round(ej.descanso_segundos / 60)}min desc.` : ''}`
                      : ej.modalidad === 'intervalo'
                      ? `${ej.series} rondas × ${ej.repeticiones}s${(ej.descanso_serie ?? 0) > 0 ? ` · ${ej.descanso_serie}s/int.` : ''}${ej.descanso_segundos > 0 ? ` · ${Math.round(ej.descanso_segundos / 60)}min desc.` : ''}`
                      : `${ej.series}×${ej.repeticiones}${ej.peso ? ` · ${ej.peso}kg` : ''}${ej.descanso_segundos > 0 ? ` · ${Math.round(ej.descanso_segundos / 60)}min` : ''}`
                    }
                  </span>
                )}
              </div>
              <button type="button" title={isEditingThis ? 'Cerrar' : 'Editar'}
                onClick={() => setEditingEjId(isEditingThis ? null : ej.id)}
                className={`transition shrink-0 ${isEditingThis ? 'text-emerald-600' : 'text-muted-foreground hover:text-emerald-600'}`}>
                {isEditingThis ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              </button>
              <button type="button" title="Eliminar ejercicio"
                onClick={() => handleDeleteEj(ej.id)} disabled={isPending}
                className="text-muted-foreground hover:text-destructive transition shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {isEditingThis && (
              <EjEditForm ej={ej} clienteId={clienteId} onDone={() => setEditingEjId(null)} />
            )}
          </div>
        )
      })}

      {/* Formulario agregar ejercicio */}
      {showAddForm ? (
        <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-3 flex flex-col gap-2.5">
          <div className="grid gap-1.5">
            <Label className="text-xs">Buscar en la librería</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-8 text-sm" placeholder="Curl bíceps, sentadilla..." value={ejSearch} autoFocus
                onChange={e => { setEjSearch(e.target.value); setEjSelId(null); setEjSelNombre('') }} />
            </div>
            {!ejSelId && (
              <div className="flex gap-1 flex-wrap">
                {gruposMusculares.map(g => (
                  <button key={g.value} type="button"
                    onClick={() => setEjGrupo(g.value === ejGrupo ? '' : g.value)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
                      ejGrupo === g.value ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}>
                    {g.label}
                  </button>
                ))}
              </div>
            )}
            {(ejSearch || ejGrupo) && !ejSelId && (
              <div className="flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden max-h-36 overflow-y-auto">
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
              <Input className="h-8 text-sm" placeholder="Nombre del ejercicio" value={ejCustom} maxLength={20}
                onChange={e => setEjCustom(e.target.value.slice(0, 20))} />
            </div>
          )}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden h-7">
            {(['repeticion', 'tiempo', 'intervalo'] as const).map((m, i) => (
              <button key={m} type="button" onClick={() => switchAddMode(m)}
                className={`flex-1 text-[11px] font-medium transition ${i > 0 ? 'border-l border-slate-200' : ''} ${
                  ejModalidad === m ? 'bg-emerald-600 text-white' : 'bg-white text-muted-foreground hover:bg-slate-50'
                }`}>
                {m === 'repeticion' ? 'Repetición' : m === 'tiempo' ? 'Tiempo' : 'Intervalo'}
              </button>
            ))}
          </div>
          {ejModalidad === 'repeticion' && (
            <div className="grid grid-cols-4 gap-1.5">
              <div className="grid gap-1"><Label className="text-[10px]">Series</Label><Input className="h-7 text-xs" inputMode="numeric" value={ejSeries} onChange={e => setEjSeries(num3(e.target.value))} /></div>
              <div className="grid gap-1"><Label className="text-[10px]">Reps</Label><Input className="h-7 text-xs" inputMode="numeric" value={ejReps} onChange={e => setEjReps(num3(e.target.value))} /></div>
              <div className="grid gap-1"><Label className="text-[10px]">Peso (kg)</Label><Input className="h-7 text-xs" inputMode="numeric" value={ejPeso} onChange={e => setEjPeso(num3(e.target.value))} /></div>
              <div className="grid gap-1"><Label className="text-[10px]">Desc. (min)</Label><Input className="h-7 text-xs" inputMode="numeric" value={ejDescanso} onChange={e => setEjDescanso(num3(e.target.value))} /></div>
            </div>
          )}
          {ejModalidad === 'tiempo' && (
            <div className="grid grid-cols-3 gap-1.5">
              <div className="grid gap-1"><Label className="text-[10px]">Series</Label><Input className="h-7 text-xs" inputMode="numeric" value={ejSeries} onChange={e => setEjSeries(num3(e.target.value))} /></div>
              <div className="grid gap-1"><Label className="text-[10px]">Duración (min)</Label><Input className="h-7 text-xs" inputMode="numeric" value={ejReps} onChange={e => setEjReps(num3(e.target.value))} /></div>
              <div className="grid gap-1"><Label className="text-[10px]">Desc. (min)</Label><Input className="h-7 text-xs" inputMode="numeric" value={ejDescanso} onChange={e => setEjDescanso(num3(e.target.value))} /></div>
            </div>
          )}
          {ejModalidad === 'intervalo' && (
            <div className="grid grid-cols-4 gap-1.5">
              <div className="grid gap-1"><Label className="text-[10px]">Rondas</Label><Input className="h-7 text-xs" inputMode="numeric" value={ejSeries} onChange={e => setEjSeries(num3(e.target.value))} /></div>
              <div className="grid gap-1"><Label className="text-[10px]">Trabajo (s)</Label><Input className="h-7 text-xs" inputMode="numeric" value={ejReps} onChange={e => setEjReps(num3(e.target.value))} /></div>
              <div className="grid gap-1"><Label className="text-[10px]">D./int. (s)</Label><Input className="h-7 text-xs" inputMode="numeric" value={ejDescSerie} onChange={e => setEjDescSerie(num3(e.target.value))} /></div>
              <div className="grid gap-1"><Label className="text-[10px]">Desc. (min)</Label><Input className="h-7 text-xs" inputMode="numeric" value={ejDescanso} onChange={e => setEjDescanso(num3(e.target.value))} /></div>
            </div>
          )}
          {addError && <p className="text-xs text-destructive">{addError}</p>}
          <div className="flex gap-2">
            <Button size="sm" type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 h-8"
              disabled={!canAdd || isPending} onClick={handleAddEj}>
              {isPending ? 'Agregando…' : 'Agregar'}
            </Button>
            <Button size="sm" type="button" variant="ghost" className="h-8" onClick={resetAddForm}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" type="button" size="sm"
          className="gap-1.5 border-dashed w-full h-8 text-xs"
          onClick={() => setShowAddForm(true)}>
          <Plus className="h-3.5 w-3.5" /> Agregar ejercicio
        </Button>
      )}
    </div>
  )
}

// ── Ficha individual (card + dialog) ─────────────────────────────────────────

function FichaCard({
  grupo,
  clienteId,
  clienteNombre,
  ejerciciosLib,
}: {
  grupo: GrupoFicha
  clienteId: string
  clienteNombre: string
  ejerciciosLib: EjercicioLib[]
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [editingRutinaId, setEditingRutinaId] = useState<string | null>(null)
  const router = useRouter()

  const totalEj = grupo.rutinas.reduce((acc, r) => {
    const dia = r.rutina_dias[0]
    return acc + (dia?.rutina_ejercicios?.length ?? 0)
  }, 0)

  const handleDelete = (rutinaId: string) => {
    if (!confirm('¿Eliminar esta rutina?')) return
    startTransition(async () => {
      await deleteRutina(rutinaId, clienteId)
      if (grupo.rutinas.length <= 1) setOpen(false)
      router.refresh()
    })
  }

  const handleWhatsApp = () => {
    const texto = generarWhatsApp(grupo, clienteNombre)
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  return (
    <>
      {/* ── Tarjeta compacta ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md text-left"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 shrink-0">
          <Dumbbell className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {buildRangoLabel(grupo.fecha_inicio, grupo.fecha_fin)}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {grupo.rutinas.map(r => (
              <span key={r.id} className="text-xs text-muted-foreground truncate max-w-[120px]">{r.nombre}</span>
            )).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`sep-${i}`} className="text-muted-foreground/40 text-xs">·</span>, el], [])}
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            {grupo.rutinas.length} rutina{grupo.rutinas.length !== 1 ? 's' : ''} · {totalEj} ejercicio{totalEj !== 1 ? 's' : ''}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      </button>

      {/* ── Dialog de detalle ── */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingRutinaId(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {buildRangoLabel(grupo.fecha_inicio, grupo.fecha_fin)}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {grupo.rutinas.map((rutina, ri) => {
              const dia = [...(rutina.rutina_dias ?? [])].sort((a, b) => a.orden - b.orden)[0]
              const ejercicios = [...(dia?.rutina_ejercicios ?? [])].sort((a, b) => a.orden - b.orden)
              const isEditing = editingRutinaId === rutina.id

              return (
                <div key={rutina.id} className={`flex flex-col gap-2 ${ri > 0 ? 'pt-4 border-t border-slate-100' : ''}`}>

                  {/* Encabezado rutina: nombre + badges | [lápiz] [papelera] */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{rutina.nombre}</p>
                      <div className="flex gap-1.5 flex-wrap mt-0.5">
                        {dia?.tipo && <Badge variant="outline" className="text-xs capitalize py-0 h-4">{dia.tipo}</Badge>}
                        {rutina.nivel && <Badge variant="outline" className="text-xs capitalize py-0 h-4">{rutina.nivel}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      <button
                        type="button"
                        title={isEditing ? 'Cerrar edición' : 'Editar ejercicios'}
                        onClick={() => setEditingRutinaId(isEditing ? null : rutina.id)}
                        className={`transition ${isEditing ? 'text-emerald-600' : 'text-muted-foreground hover:text-emerald-600'}`}
                      >
                        {isEditing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rutina.id)}
                        disabled={isPending}
                        className="text-muted-foreground hover:text-destructive transition"
                        title="Eliminar rutina"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contenido: modo edición o lectura */}
                  {isEditing ? (
                    <EditRutinaSection
                      dia={dia}
                      ejercicios={ejercicios}
                      clienteId={clienteId}
                      ejerciciosLib={ejerciciosLib}
                    />
                  ) : ejercicios.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {ejercicios.map((ej, i) => {
                        const nombre = ej.ejercicios?.nombre ?? ej.nombre_custom ?? '—'
                        return (
                          <div key={ej.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                            <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground">{nombre}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {ej.modalidad === 'tiempo'
                                  ? `${ej.series} × ${ej.repeticiones}min · ${Math.round(ej.descanso_segundos / 60)}min desc.`
                                  : ej.modalidad === 'intervalo'
                                  ? `${ej.series} rondas × ${ej.repeticiones}s · ${ej.descanso_serie ?? 0}s/int. · ${Math.round(ej.descanso_segundos / 60)}min desc.`
                                  : `${ej.series}×${ej.repeticiones}${ej.peso ? ` · ${ej.peso}kg` : ''} · ${ej.descanso_segundos}s`
                                }
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic px-1">Sin ejercicios.</p>
                  )}
                </div>
              )
            })}

            {/* WhatsApp */}
            <div className="pt-3 border-t border-slate-100">
              <Button className="w-full gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white" onClick={handleWhatsApp}>
                <MessageCircle className="h-4 w-4" />
                Enviar por WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Lista de fichas ────────────────────────────────────────────────────────────

export function RutinasFichas({
  grupos,
  clienteId,
  clienteNombre,
  ejerciciosLib,
}: {
  grupos: GrupoFicha[]
  clienteId: string
  clienteNombre: string
  ejerciciosLib: EjercicioLib[]
}) {
  if (grupos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
        <Dumbbell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">Sin rutinas asignadas</p>
        <p className="text-xs text-muted-foreground mt-1">
          Selecciona sesiones arriba y asigna una plantilla.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {grupos.map(g => (
        <FichaCard key={g.key} grupo={g} clienteId={clienteId} clienteNombre={clienteNombre} ejerciciosLib={ejerciciosLib} />
      ))}
    </div>
  )
}
