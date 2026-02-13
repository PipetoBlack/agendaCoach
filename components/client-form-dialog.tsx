'use client'

import React from "react"

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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createClientAction, updateClientAction } from '@/app/dashboard/clients/actions'
import { Plus, Pencil } from 'lucide-react'

interface Client {
  id: string
  nombre_completo: string
  rut: string | null
  correo: string | null
  telefono: string | null
  estado: string
  notas: string | null
  fecha_nacimiento: string | null
  genero: string | null
}

export function ClientFormDialog({
  client,
  trigger,
}: {
  client?: Client
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isEditing = !!client

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        if (isEditing) {
          formData.set('id', client.id)
          await updateClientAction(formData)
          toast.success('Cliente actualizado correctamente')
        } else {
          await createClientAction(formData)
          toast.success('Cliente creado correctamente')
        }
        setOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Algo salió mal')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Agregar cliente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEditing ? 'Editar cliente' : 'Nuevo cliente'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza la información del cliente.'
              : 'Agrega un nuevo cliente a tu práctica.'}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Nombre completo *</Label>
              <Input
                id="full_name"
                name="full_name"
                required
                defaultValue={client?.nombre_completo ?? ''}
                placeholder="Nombre completo del cliente"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rut">RUT</Label>
              <Input
                id="rut"
                name="rut"
                defaultValue={client?.rut ?? ''}
                placeholder="12.345.678-9"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={client?.correo ?? ''}
                placeholder="cliente@ejemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={client?.telefono ?? ''}
                placeholder="+56 9 1234 5678"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birth_date">Fecha de nacimiento</Label>
              <Input
                id="birth_date"
                name="birth_date"
                type="date"
                defaultValue={client?.fecha_nacimiento ?? ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gender">Género</Label>
              <Select name="gender" defaultValue={client?.genero ?? ''}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Selecciona género" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="femenino">Femenino</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                  <SelectItem value="prefiere_no_decir">Prefiere no decir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isEditing && (
              <div className="grid gap-2">
                <Label htmlFor="status">Estado</Label>
                <Select name="status" defaultValue={client?.estado ?? 'nuevo'}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuevo">Nuevo</SelectItem>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={client?.notas ?? ''}
                placeholder="Notas opcionales sobre este cliente..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? 'Guardando...'
                  : 'Creando...'
                : isEditing
                  ? 'Guardar cambios'
                  : 'Crear cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditClientButton({ client }: { client: Client }) {
  return (
    <ClientFormDialog
      client={client}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Editar cliente</span>
        </Button>
      }
    />
  )
}
