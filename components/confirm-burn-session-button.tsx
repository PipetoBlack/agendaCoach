"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type Props = {
  sessionId: string
  paqueteId: string
  clienteId: string
  disabled?: boolean
  action: (formData: FormData) => Promise<void>
  trigger?: React.ReactNode
}

export function ConfirmBurnSessionButton({ sessionId, paqueteId, clienteId, disabled, action, trigger }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button type="button" disabled={disabled} className="w-full" variant="default" size="sm">
            Quemar sesión
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Quieres quemar esta sesión?</AlertDialogTitle>
          <AlertDialogDescription>
            Se registrará una sesión consumida y la sesión programada se marcará como completada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={action} className="space-y-3">
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="paqueteId" value={paqueteId} />
          <input type="hidden" name="clienteId" value={clienteId} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
            <AlertDialogAction type="submit" onClick={() => setOpen(false)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
