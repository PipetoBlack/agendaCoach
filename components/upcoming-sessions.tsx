import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Clock } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface UpcomingSession {
  id: string
  fecha_sesion: string
  hora_sesion: string
  estado: string
  clientes: {
    nombre_completo: string
  }
}

export function UpcomingSessions({ sessions }: { sessions: UpcomingSession[] }) {
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Próximas sesiones</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No hay sesiones próximas agendadas.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                    <CalendarDays className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {session.clientes?.nombre_completo || 'Cliente desconocido'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(parseISO(session.fecha_sesion), 'd MMM yyyy', { locale: es })}</span>
                      <Clock className="h-3 w-3" />
                      <span>{session.hora_sesion.slice(0, 5)}</span>
                    </div>
                  </div>
                </div>
                <Badge
                  variant={session.estado === 'programada' ? 'default' : 'secondary'}
                >
                  {session.estado === 'programada'
                    ? 'Agendada'
                    : session.estado === 'completada'
                      ? 'Completada'
                      : session.estado}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
