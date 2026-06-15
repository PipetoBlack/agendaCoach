'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteRutina } from '../../actions'

export function DeleteRutinaButton({ rutinaId, clienteId }: { rutinaId: string; clienteId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      disabled={isPending}
      onClick={() => {
        if (!confirm('¿Eliminar esta rutina completa?')) return
        startTransition(async () => {
          await deleteRutina(rutinaId, clienteId)
          router.push(`/dashboard/rutinas/${clienteId}`)
        })
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
