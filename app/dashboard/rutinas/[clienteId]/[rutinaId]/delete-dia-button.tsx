'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteRutinaDia } from '../../actions'

export function DeleteDiaButton({ diaId, rutinaId, clienteId }: { diaId: string; rutinaId: string; clienteId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      disabled={isPending}
      onClick={() => {
        if (!confirm('¿Eliminar este día y todos sus ejercicios?')) return
        startTransition(() => deleteRutinaDia(diaId, rutinaId, clienteId))
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
