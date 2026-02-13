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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createSessionAction } from '@/app/dashboard/sessions/actions'
import { CalendarPlus } from 'lucide-react'

interface Client {
  id: string
  nombre_completo: string
}

interface Package {
  id: string
  cliente_id: string
  sesiones_totales: number
  sesiones_usadas: number
  estado: string
}

export function ScheduleSessionDialog({
  clients,
  packages,
}: {
  clients: Client[]
  packages: Package[]
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedClient, setSelectedClient] = useState('')

  const clientPackages = packages.filter(
    (p) => p.cliente_id === selectedClient && p.estado === 'activo',
  )

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await createSessionAction(formData)
        toast.success('Sesión agendada correctamente')
        setOpen(false)
        setSelectedClient('')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo agendar la sesión')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelectedClient('') }}>
      <DialogTrigger asChild>
        <Button>
          <CalendarPlus className="mr-2 h-4 w-4" />
          Agendar sesión
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Agendar sesión</DialogTitle>
          <DialogDescription>
            Programa una nueva sesión con tu cliente.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="client_id">Cliente *</Label>
              <Select
                name="client_id"
                required
                value={selectedClient}
                onValueChange={setSelectedClient}
              >
                <SelectTrigger id="client_id">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {clientPackages.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="package_id">Paquete de sesiones (opcional)</Label>
                <Select name="package_id">
                  <SelectTrigger id="package_id">
                    <SelectValue placeholder="Sin paquete" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientPackages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.sesiones_usadas}/{p.sesiones_totales} sesiones usadas
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="session_date">Fecha *</Label>
              <Input
                id="session_date"
                name="session_date"
                type="date"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="session_time">Hora *</Label>
              <Input
                id="session_time"
                name="session_time"
                type="time"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Agendando...' : 'Agendar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
