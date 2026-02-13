'use client'

import { useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  updateSessionStatusAction,
  deleteSessionAction,
} from '@/app/dashboard/sessions/actions'

interface Session {
  id: string
  fecha_sesion: string
  hora_sesion: string
  estado: string
  clientes: {
    nombre_completo: string
  }
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  programada: 'default',
  completada: 'secondary',
  cancelada: 'destructive',
}

const statusLabels: Record<string, string> = {
  programada: 'Agendada',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

export function SessionsTable({ sessions }: { sessions: Session[] }) {
  const [isPending, startTransition] = useTransition()

  const handleStatusChange = (sessionId: string, status: string) => {
    startTransition(async () => {
      try {
        await updateSessionStatusAction(sessionId, status)
        toast.success(
          status === 'completada'
            ? 'Sesión marcada como completada'
            : 'Sesión marcada como cancelada',
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo actualizar')
      }
    })
  }

  const handleDelete = (sessionId: string) => {
    startTransition(async () => {
      try {
        await deleteSessionAction(sessionId)
        toast.success('Sesión eliminada')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo eliminar')
      }
    })
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-foreground">Todavía no tienes sesiones</p>
        <p className="text-sm text-muted-foreground mt-1">
          Agenda tu primera sesión para comenzar.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="hidden md:table-cell">Hora</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-16">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell className="font-medium text-foreground">
                {session.clientes?.nombre_completo || 'Desconocido'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(parseISO(session.fecha_sesion), 'd MMM yyyy', { locale: es })}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {session.hora_sesion.slice(0, 5)}
              </TableCell>
              <TableCell>
                <Badge variant={statusColors[session.estado] ?? 'secondary'}>
                  {statusLabels[session.estado] ?? session.estado}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isPending}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Acciones</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {session.estado === 'programada' && (
                      <>
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(session.id, 'completada')
                          }
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Marcar como completada
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(session.id, 'cancelada')
                          }
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancelar sesión
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleDelete(session.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
