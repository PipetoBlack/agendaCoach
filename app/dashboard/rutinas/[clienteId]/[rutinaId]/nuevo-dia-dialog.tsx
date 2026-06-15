'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createRutinaDia } from '../../actions'

export function NuevoDiaDialog({ rutinaId, clienteId }: { rutinaId: string; clienteId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tipo, setTipo] = useState('')
  const [foco, setFoco] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('rutinaId', rutinaId)
    formData.set('clienteId', clienteId)
    formData.set('tipo', tipo)
    formData.set('foco', foco)

    startTransition(async () => {
      const result = await createRutinaDia(formData)
      if (result.error) { setError(result.error); return }
      setOpen(false)
      setTipo(''); setFoco('')
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2 border-dashed">
          <Plus className="h-4 w-4" />
          Agregar día
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nuevo día de entrenamiento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="nombre">Nombre del día</Label>
            <Input id="nombre" name="nombre" placeholder="Ej: Día A · Tren superior" required maxLength={40} />
          </div>
          <div className="grid gap-1.5">
            <Label>Tipo de entrenamiento</Label>
            <Select value={tipo} onValueChange={setTipo} required>
              <SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fuerza">Fuerza</SelectItem>
                <SelectItem value="resistencia">Resistencia</SelectItem>
                <SelectItem value="hipertrofia">Hipertrofia</SelectItem>
                <SelectItem value="movilidad">Movilidad</SelectItem>
                <SelectItem value="funcional">Funcional</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Foco</Label>
            <Select value={foco} onValueChange={setFoco} required>
              <SelectTrigger><SelectValue placeholder="Selecciona foco" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="superior">Tren superior</SelectItem>
                <SelectItem value="inferior">Tren inferior</SelectItem>
                <SelectItem value="core">Core</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending || !tipo || !foco}>
            {isPending ? 'Guardando...' : 'Agregar día'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
