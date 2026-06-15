'use client'

import { useTransition } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { removeEjercicioDeDia } from '../../actions'

export function DeleteEjercicioButton({ ejercicioRutinaId, rutinaId, clienteId }: { ejercicioRutinaId: string; rutinaId: string; clienteId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      disabled={isPending}
      onClick={() => startTransition(() => removeEjercicioDeDia(ejercicioRutinaId, rutinaId, clienteId))}
    >
      <X className="h-3.5 w-3.5" />
    </Button>
  )
}
