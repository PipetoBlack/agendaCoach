'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createPackageAction } from '@/app/dashboard/sessions/actions'
import { Package, CalendarDays } from 'lucide-react'

export function PackageFormDialog({ defaultClientId }: { defaultClientId?: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await createPackageAction(formData)
        toast.success('Paquete de sesiones creado')
        setOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo crear el paquete')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Package className="mr-2 h-4 w-4" />
          Nuevo paquete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] sm:max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Nuevo paquete de sesiones</DialogTitle>
          <DialogDescription>
            Crea un paquete de sesiones para un cliente.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <div className="flex flex-col gap-4 py-4">
            <input type="hidden" name="client_id" value={defaultClientId} />
            <div className="grid gap-2">
              <Label htmlFor="total_sessions">Total de sesiones *</Label>
              <Input
                id="total_sessions"
                name="total_sessions"
                type="number"
                min="1"
                required
                placeholder="ej: 10"
              />
            </div>
            <div className="grid gap-2">
              <Label>Fecha de inicio</Label>
              <div className="flex items-center gap-2 rounded-md border border-input bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span>{today}</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expiry_date">Fecha de vencimiento (opcional)</Label>
              <Input
                id="expiry_date"
                name="expiry_date"
                type="date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creando...' : 'Crear paquete'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
