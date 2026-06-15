'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createRutina } from '../actions'

export function NuevaRutinaDialog({
  clienteId,
  variant = 'default',
}: {
  clienteId: string
  variant?: 'default' | 'outline'
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('clienteId', clienteId)

    startTransition(async () => {
      const result = await createRutina(formData)
      if (result.error) { setError(result.error); return }
      setOpen(false)
      router.push(`/dashboard/rutinas/${clienteId}/${result.id}`)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={variant} className={variant === 'default' ? 'bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5' : 'gap-1.5'}>
          <Plus className="h-4 w-4" />
          Nueva rutina
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nueva rutina</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="nombre">Nombre del plan</Label>
            <Input id="nombre" name="nombre" placeholder="Ej: Mes 1 — Adaptación" required maxLength={60} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="fechaInicio">Fecha inicio</Label>
              <Input id="fechaInicio" name="fechaInicio" type="date" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fechaFin">Fecha fin</Label>
              <Input id="fechaFin" name="fechaFin" type="date" required />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
            {isPending ? 'Creando...' : 'Crear rutina'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
