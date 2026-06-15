'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Library, Plus, Search, Trash2, Dumbbell, Pencil, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createEjercicioPropio, deleteEjercicioPropio, deleteEtiquetaCustom } from './actions'

export type EjercicioLib = {
  id: string
  nombre: string
  grupo_muscular: string
  es_global: boolean
}

const GRUPOS_BASE = ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core', 'fullbody']

const mismoNombre = (a: string, b: string) =>
  a.trim().localeCompare(b.trim(), 'es', { sensitivity: 'base' }) === 0

const mismaEtiqueta = (a: string, b: string) =>
  a.trim().localeCompare(b.trim(), 'es', { sensitivity: 'base' }) === 0

export function BibliotecaDialog({ ejercicios }: { ejercicios: EjercicioLib[] }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'list' | 'add' | 'manageTags'>('list')

  // List
  const [search, setSearch] = useState('')
  const [filterGrupo, setFilterGrupo] = useState('')

  // Add form
  const [nombre, setNombre] = useState('')
  const [grupo, setGrupo] = useState('')
  const [grupoCustom, setGrupoCustom] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const allGrupos = useMemo(() => {
    const userExtra = ejercicios
      .filter(e => !e.es_global)
      .map(e => e.grupo_muscular.toLowerCase())
      .filter(g => !GRUPOS_BASE.includes(g))
    return [...GRUPOS_BASE, ...new Set(userExtra)]
  }, [ejercicios])

  const customGrupos = useMemo(
    () => allGrupos.filter(g => !GRUPOS_BASE.includes(g)),
    [allGrupos]
  )

  // Etiqueta duplicada: si el usuario escribe algo que ya existe
  const tagDuplicado = useMemo(() => {
    if (!grupoCustom.trim()) return null
    return allGrupos.find(g => mismaEtiqueta(g, grupoCustom)) ?? null
  }, [grupoCustom, allGrupos])

  const filtered = useMemo(() => {
    let r = ejercicios
    if (search) r = r.filter(e => e.nombre.toLowerCase().includes(search.toLowerCase()))
    if (filterGrupo) r = r.filter(e => e.grupo_muscular.toLowerCase() === filterGrupo)
    return r
  }, [ejercicios, search, filterGrupo])

  const grouped = useMemo(() => {
    const map = new Map<string, EjercicioLib[]>()
    for (const e of filtered) {
      const key = e.grupo_muscular.toLowerCase()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const resetForm = () => {
    setNombre('')
    setGrupo('')
    setGrupoCustom('')
    setShowCustomInput(false)
    setFormError(null)
  }

  const handleClose = (v: boolean) => {
    setOpen(v)
    if (!v) { setSearch(''); setFilterGrupo(''); resetForm(); setMode('list') }
  }

  const selectChip = (g: string) => {
    setGrupo(prev => prev === g ? '' : g)
    setGrupoCustom('')
    setShowCustomInput(false)
    setFormError(null)
  }

  const toggleCustomInput = () => {
    const next = !showCustomInput
    setShowCustomInput(next)
    if (!next) setGrupoCustom('')
    setGrupo('')
    setFormError(null)
  }

  const handleCreate = () => {
    if (!nombre.trim()) { setFormError('Escribe el nombre del ejercicio'); return }

    const grupoFinal = grupoCustom.trim() || grupo
    if (!grupoFinal) { setFormError('Selecciona una etiqueta o crea una nueva'); return }

    if (tagDuplicado) {
      setFormError(`La etiqueta "${tagDuplicado}" ya existe. Selecciónala en los chips de arriba.`)
      return
    }

    const duplicado = ejercicios.find(e => mismoNombre(e.nombre, nombre))
    if (duplicado) {
      setFormError(`"${duplicado.nombre}" ya existe en tu biblioteca · etiqueta: ${duplicado.grupo_muscular}`)
      return
    }

    setFormError(null)
    startTransition(async () => {
      const result = await createEjercicioPropio({
        nombre: nombre.trim(),
        grupo_muscular: grupoFinal.toLowerCase().trim(),
      })
      if (result.error) { setFormError(result.error); return }
      resetForm()
      router.refresh()
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este ejercicio de tu biblioteca?')) return
    startTransition(async () => {
      await deleteEjercicioPropio(id)
      router.refresh()
    })
  }

  const handleDeleteTag = (g: string) => {
    const count = ejercicios.filter(e => !e.es_global && e.grupo_muscular === g).length
    const msg = count > 0
      ? `¿Eliminar la etiqueta "${g}" y sus ${count} ejercicio${count !== 1 ? 's' : ''}?`
      : `¿Eliminar la etiqueta "${g}"?`
    if (!confirm(msg)) return
    startTransition(async () => {
      await deleteEtiquetaCustom(g)
      router.refresh()
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5 text-xs h-8">
        <Library className="h-3.5 w-3.5" />
        Ver biblioteca
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              {mode === 'manageTags' ? 'Gestionar etiquetas' : 'Biblioteca de ejercicios'}
              {mode === 'list' && (
                <span className="text-xs text-muted-foreground font-normal">
                  · {ejercicios.length} ejercicio{ejercicios.length !== 1 ? 's' : ''}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 overflow-y-auto flex-1 px-6 py-4">

            {/* ── Lista ── */}
            {mode === 'list' && (
              <>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input className="pl-8 h-8 text-sm" placeholder="Buscar ejercicio..."
                      value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {allGrupos.map(g => (
                      <button key={g} type="button"
                        onClick={() => setFilterGrupo(prev => prev === g ? '' : g)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition capitalize ${
                          filterGrupo === g
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-muted-foreground border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {grouped.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <Dumbbell className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {search || filterGrupo ? 'Sin resultados' : 'La biblioteca está vacía'}
                    </p>
                    {!search && !filterGrupo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Añade ejercicios para usarlos en tus plantillas.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {grouped.map(([g, ejs]) => (
                      <div key={g}>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 capitalize">
                          {g}
                        </p>
                        <div className="flex flex-col gap-0.5">
                          {ejs.map(ej => (
                            <div key={ej.id}
                              className="flex items-center justify-between rounded-lg px-3 py-2 bg-slate-50 hover:bg-slate-100 transition group">
                              <span className="text-sm text-foreground">{ej.nombre}</span>
                              {ej.es_global ? (
                                <Badge variant="outline" className="text-[10px] py-0 h-4 text-muted-foreground shrink-0">
                                  Global
                                </Badge>
                              ) : (
                                <button type="button" onClick={() => handleDelete(ej.id)} disabled={isPending}
                                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition shrink-0">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Añadir ejercicio ── */}
            {mode === 'add' && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-semibold">Etiqueta (grupo muscular)</Label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {allGrupos.map(g => (
                      <button key={g} type="button" onClick={() => selectChip(g)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition capitalize ${
                          grupo === g
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-muted-foreground border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                    <button type="button" onClick={toggleCustomInput}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition flex items-center gap-1 ${
                        showCustomInput
                          ? 'bg-slate-700 text-white border-slate-700'
                          : 'border-dashed border-slate-300 text-muted-foreground hover:border-emerald-400 hover:text-emerald-700'
                      }`}
                    >
                      <Plus className="h-3 w-3" />
                      Nueva
                    </button>
                  </div>

                  {showCustomInput && (
                    <div className="flex flex-col gap-1">
                      <Input className="h-8 text-sm" autoFocus
                        placeholder="Ej: Glúteos, Cardio, Estiramiento..." maxLength={30}
                        value={grupoCustom}
                        onChange={e => { setGrupoCustom(e.target.value); setFormError(null) }} />
                      {tagDuplicado && (
                        <p className="text-xs text-amber-600">
                          La etiqueta <span className="font-semibold capitalize">"{tagDuplicado}"</span> ya existe — selecciónala en los chips de arriba.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold">Nombre del ejercicio</Label>
                  <Input className="h-9 text-sm" placeholder="Ej: Sentadilla búlgara, Hip thrust..." maxLength={60}
                    value={nombre} onChange={e => { setNombre(e.target.value); setFormError(null) }}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate() }} />
                </div>

                {formError && <p className="text-xs text-destructive leading-snug">{formError}</p>}
              </div>
            )}

            {/* ── Gestionar etiquetas ── */}
            {mode === 'manageTags' && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-muted-foreground">
                  Las etiquetas base no se pueden eliminar. Las propias sí — junto con todos sus ejercicios.
                </p>

                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Base</p>
                  <div className="flex flex-wrap gap-1.5">
                    {GRUPOS_BASE.map(g => (
                      <span key={g}
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium border border-slate-200 bg-slate-50 text-muted-foreground capitalize">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                {customGrupos.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Propias</p>
                    <div className="flex flex-col gap-1">
                      {customGrupos.map(g => {
                        const count = ejercicios.filter(e => !e.es_global && e.grupo_muscular === g).length
                        return (
                          <div key={g} className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-slate-50">
                            <div>
                              <span className="text-sm text-foreground capitalize">{g}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {count} ejercicio{count !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <button type="button" onClick={() => handleDeleteTag(g)} disabled={isPending}
                              className="text-muted-foreground hover:text-destructive transition shrink-0">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">No tienes etiquetas propias aún.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-3 border-t border-slate-100 shrink-0">
            {mode === 'list' && (
              <Button onClick={() => { resetForm(); setMode('add') }}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4" />
                Añadir ejercicio
              </Button>
            )}

            {mode === 'add' && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { resetForm(); setMode('list') }} disabled={isPending}>
                  Cancelar
                </Button>
                <Button variant="outline" size="icon" onClick={() => setMode('manageTags')}
                  disabled={isPending} className="shrink-0" title="Gestionar etiquetas">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button onClick={handleCreate} disabled={isPending}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isPending ? 'Guardando...' : 'Guardar ejercicio'}
                </Button>
              </div>
            )}

            {mode === 'manageTags' && (
              <Button variant="outline" onClick={() => setMode('add')} className="w-full gap-2">
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver al formulario
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
