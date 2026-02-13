'use client'

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
import { deleteClientAction } from '@/app/dashboard/clients/actions'

export function DeleteClientButton({
  clientId,
  clientName,
}: {
  clientId: string
  clientName: string
}) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteClientAction(clientId)
        toast.success(`${clientName} ha sido eliminado`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo eliminar al cliente')
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Eliminar cliente</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Seguro que quieres eliminar a {clientName}? También se borrarán sus paquetes y sesiones agendadas. Esta acción no se puede deshacer.
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
