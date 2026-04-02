"use client"

import { useTransition } from 'react'
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
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatEvaluationDate } from '@/lib/evaluation-date'

export default function DeleteEvaluationButton({
  evaluation,
  clientName,
  onConfirm,
}: {
  evaluation: any
  clientName?: string
  onConfirm: (evaluation: any) => Promise<void> | void
}) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await onConfirm(evaluation)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la evaluación')
      }
    })
  }

  const date = formatEvaluationDate(evaluation?.fecha)

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon" className="h-7 w-7">
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Eliminar evaluación</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar evaluación</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Eliminar evaluación del {date} para {clientName ?? 'este cliente'}? Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
