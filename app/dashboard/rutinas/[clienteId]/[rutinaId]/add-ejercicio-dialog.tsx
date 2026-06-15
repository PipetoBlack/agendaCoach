'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { addEjercicioToDia, createEjercicioCustom } from '../../actions'

type Ejercicio = {
  id: string
  nombre: string
  categoria: string
  grupo_muscular: string
  foco: string
  es_global: boolean
}

const grupoLabel: Record<string, string> = {
  pecho: 'Pecho', espalda: 'Espalda', piernas: 'Piernas',
  hombros: 'Hombros', brazos: 'Brazos', core: 'Core', fullbody: 'Full body',
}

export function AddEjercicioDialog({
  rutinaDiaId, rutinaId, clienteId, ejercicios,
}: {
  rutinaDiaId: string
  rutinaId: string
  clienteId: string
  ejercicios: Ejercicio[]
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'biblioteca' | 'custom'>('biblioteca')
  const [search, setSearch] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState('todos')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [series, setSeries] = useState('3')
  const [reps, setReps] = useState('10')
  const [peso, setPeso] = useState('')
  const [descanso, setDescanso] = useState('60')
  // custom
  const [customNombre, setCustomNombre] = useState('')
  const [customCategoria, setCustomCategoria] = useState('')
  const [customGrupo, setCustomGrupo] = useState('')
  const [customFoco, setCustomFoco] = useState('')

  const filtrados = useMemo(() => {
    return ejercicios.filter((e) => {
      const matchGrupo = grupoFiltro === 'todos' || e.grupo_muscular === grupoFiltro
      const matchSearch = e.nombre.toLowerCase().includes(search.toLowerCase())
      return matchGrupo && matchSearch
    })
  }, [ejercicios, grupoFiltro, search])

  const reset = () => {
    setSearch(''); setGrupoFiltro('todos'); setSelectedId(null)
    setSeries('3'); setReps('10'); setPeso(''); setDescanso('60')
    setCustomNombre(''); setCustomCategoria(''); setCustomGrupo(''); setCustomFoco('')
    setError(null); setTab('biblioteca')
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      if (tab === 'custom') {
        const fd = new FormData()
        fd.set('nombre', customNombre)
        fd.set('categoria', customCategoria)
        fd.set('grupo_muscular', customGrupo)
        fd.set('foco', customFoco)
        const created = await createEjercicioCustom(fd)
        if (created.error) { setError(created.error); return }

        const fd2 = new FormData()
        fd2.set('rutinaDiaId', rutinaDiaId)
        fd2.set('rutinaId', rutinaId)
        fd2.set('clienteId', clienteId)
        fd2.set('ejercicioId', created.id!)
        fd2.set('series', series)
        fd2.set('repeticiones', reps)
        fd2.set('peso', peso)
        fd2.set('descansoSegundos', descanso)
        const result = await addEjercicioToDia(fd2)
        if (result.error) { setError(result.error); return }
      } else {
        if (!selectedId) { setError('Selecciona un ejercicio'); return }
        const fd = new FormData()
        fd.set('rutinaDiaId', rutinaDiaId)
        fd.set('rutinaId', rutinaId)
        fd.set('clienteId', clienteId)
        fd.set('ejercicioId', selectedId)
        fd.set('series', series)
        fd.set('repeticiones', reps)
        fd.set('peso', peso)
        fd.set('descansoSegundos', descanso)
        const result = await addEjercicioToDia(fd)
        if (result.error) { setError(result.error); return }
      }
      setOpen(false)
      reset()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
          <Plus className="h-4 w-4" />
          Agregar ejercicio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar ejercicio</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mt-1">
          {(['biblioteca', 'custom'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${tab === t ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t === 'biblioteca' ? 'Biblioteca' : 'Personalizado'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {tab === 'biblioteca' ? (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar ejercicio..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {Object.entries(grupoLabel).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1 max-h-52 overflow-y-auto rounded-lg border border-slate-100 p-1">
                {filtrados.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
                ) : (
                  filtrados.map((ej) => (
                    <button
                      key={ej.id}
                      type="button"
                      onClick={() => setSelectedId(ej.id)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${selectedId === ej.id ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'}`}
                    >
                      <span className="font-medium text-foreground">{ej.nombre}</span>
                      <Badge variant="outline" className="text-xs text-muted-foreground ml-2 shrink-0">
                        {grupoLabel[ej.grupo_muscular] ?? ej.grupo_muscular}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid gap-1.5">
                <Label>Nombre del ejercicio</Label>
                <Input value={customNombre} onChange={(e) => setCustomNombre(e.target.value)} placeholder="Ej: Press en banco con cadenas" required maxLength={60} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-1.5">
                  <Label>Categoría</Label>
                  <Select value={customCategoria} onValueChange={setCustomCategoria} required>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {['fuerza','resistencia','hipertrofia','movilidad','cardio','funcional'].map((v) => (
                        <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Grupo muscular</Label>
                  <Select value={customGrupo} onValueChange={setCustomGrupo} required>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(grupoLabel).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Foco</Label>
                  <Select value={customFoco} onValueChange={setCustomFoco} required>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="superior">Superior</SelectItem>
                      <SelectItem value="inferior">Inferior</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="core">Core</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Parámetros comunes */}
          <div className="grid grid-cols-4 gap-2">
            <div className="grid gap-1.5">
              <Label>Series</Label>
              <Input type="number" min="1" max="20" value={series} onChange={(e) => setSeries(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Reps</Label>
              <Input value={reps} onChange={(e) => setReps(e.target.value)} placeholder="10" maxLength={10} />
            </div>
            <div className="grid gap-1.5">
              <Label>Peso</Label>
              <Input value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="20kg" maxLength={15} />
            </div>
            <div className="grid gap-1.5">
              <Label>Descanso</Label>
              <Input type="number" min="0" max="600" value={descanso} onChange={(e) => setDescanso(e.target.value)} placeholder="60" />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
            {isPending ? 'Agregando...' : 'Agregar ejercicio'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
