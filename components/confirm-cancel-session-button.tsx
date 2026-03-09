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
  disabled?: boolean
  action: (formData: FormData) => Promise<void>
}

export function ConfirmCancelSessionButton({ sessionId, disabled, action }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full" disabled={disabled}>
          Cancelar sesión
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Quieres cancelar esta sesión?</AlertDialogTitle>
          <AlertDialogDescription>
            La sesión quedará cancelada y podrás reprogramarla más tarde.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={action} className="space-y-3">
          <input type="hidden" name="sessionId" value={sessionId} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Mantener</AlertDialogCancel>
            <AlertDialogAction type="submit" onClick={() => setOpen(false)}>
              Cancelar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
