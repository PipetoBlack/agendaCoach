'use client'

import React from "react"

import { useEffect, useState, useTransition } from 'react'
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
import { cn } from '@/lib/utils'

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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [defaultFirstName, defaultLastName] = React.useMemo(() => {
    if (!client?.nombre_completo) return ['', '']
    const parts = client.nombre_completo.trim().split(/\s+/)
    if (parts.length === 1) return [parts[0], '']
    return [parts[0], parts.slice(1).join(' ')]
  }, [client?.nombre_completo])

  const nameRegex = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]{1,20}$/
  const rutRegex = /^\d{0,9}$/
  const phoneRegex = /^\+?[0-9]+$/
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

  const validateField = (key: string, value: string) => {
    let error = ''
    const trimmed = value.trim()
    switch (key) {
      case 'first_name':
      case 'last_name':
        if (!trimmed) error = 'Requerido'
        else if (!nameRegex.test(trimmed)) error = 'No se admite este formato'
        break
      case 'rut':
        if (trimmed && !rutRegex.test(trimmed)) error = 'Solo números, hasta 9 dígitos'
        break
      case 'phone':
        if (!trimmed) error = 'Requerido'
        else if (!phoneRegex.test(trimmed)) error = 'Solo números y +'
        break
      case 'email':
        if (trimmed && !emailRegex.test(trimmed)) error = 'Correo inválido'
        break
      case 'notes':
        if (trimmed.length > 100) error = 'Máx. 100 caracteres'
        break
      default:
        break
    }
    setErrors((prev) => ({ ...prev, [key]: error }))
    return error
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    validateField(name, value)
  }

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const handleSubmit = (formData: FormData) => {
    // client-side guard before server
    const fieldsToValidate = ['first_name', 'last_name', 'rut', 'phone', 'email', 'notes']
    const hasErrors = fieldsToValidate
      .map((key) => {
        const val = formData.get(key) as string
        return validateField(key, val || '')
      })
      .some((msg) => msg)
    if (hasErrors) return

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
            <Plus className="mr-100 h-4 w-4" />
            Agregar Cliente
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
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">Nombre *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  required
                  maxLength={20}
                  pattern="^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]{1,20}$"
                  title="Solo letras y espacios, máximo 20 caracteres"
                  defaultValue={defaultFirstName}
                  placeholder="Nombre"
                  onBlur={handleBlur}
                  onChange={(e) => validateField('first_name', e.target.value)}
                  aria-invalid={!!errors.first_name}
                  className={cn(errors.first_name && 'border-destructive focus-visible:ring-destructive')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name">Apellido *</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  required
                  maxLength={20}
                  pattern="^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]{1,20}$"
                  title="Solo letras y espacios, máximo 20 caracteres"
                  defaultValue={defaultLastName}
                  placeholder="Apellido"
                  onBlur={handleBlur}
                  onChange={(e) => validateField('last_name', e.target.value)}
                  aria-invalid={!!errors.last_name}
                  className={cn(errors.last_name && 'border-destructive focus-visible:ring-destructive')}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rut">RUT</Label>
              <Input
                id="rut"
                name="rut"
                inputMode="numeric"
                pattern="^\d{0,9}$"
                maxLength={9}
                title="Solo números, hasta 9 dígitos, sin puntos ni guion"
                defaultValue={client?.rut ?? ''}
                placeholder="123456789"
                onBlur={handleBlur}
                onChange={(e) => validateField('rut', e.target.value)}
                aria-invalid={!!errors.rut}
                className={cn(errors.rut && 'border-destructive focus-visible:ring-destructive')}
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
                onBlur={handleBlur}
                onChange={(e) => validateField('email', e.target.value)}
                aria-invalid={!!errors.email}
                className={cn(errors.email && 'border-destructive focus-visible:ring-destructive')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                name="phone"
                required
                inputMode="tel"
                pattern="^\+?[0-9]+$"
                maxLength={20}
                title="Solo números y opcional prefijo +"
                defaultValue={client?.telefono ?? ''}
                placeholder="+56 9 1234 5678"
                onBlur={handleBlur}
                onChange={(e) => validateField('phone', e.target.value)}
                aria-invalid={!!errors.phone}
                className={cn(errors.phone && 'border-destructive focus-visible:ring-destructive')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birth_date">Fecha de nacimiento</Label>
              <Input
                id="birth_date"
                name="birth_date"
                type="date"
                className="text-sm h-10"
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
            <div className="grid gap-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                name="notes"
                maxLength={100}
                defaultValue={client?.notas ?? ''}
                placeholder="Notas opcionales sobre este cliente..."
                rows={3}
                onBlur={handleBlur}
                onChange={(e) => validateField('notes', e.target.value)}
                aria-invalid={!!errors.notes}
                className={cn(errors.notes && 'border-destructive focus-visible:ring-destructive')}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
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
