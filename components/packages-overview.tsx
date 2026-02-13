import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface SessionPackage {
  id: string
  sesiones_totales: number
  sesiones_usadas: number
  fecha_expiracion: string | null
  estado: string
  clientes: {
    nombre_completo: string
  }
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  activo: 'default',
  completado: 'secondary',
  expirado: 'destructive',
}

export function PackagesOverview({ packages }: { packages: SessionPackage[] }) {
  if (packages.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">Paquetes de sesiones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {packages.map((pkg) => {
            const progress =
              pkg.sesiones_totales > 0
                ? Math.round((pkg.sesiones_usadas / pkg.sesiones_totales) * 100)
                : 0
            const expires = pkg.fecha_expiracion
              ? format(parseISO(pkg.fecha_expiracion), 'd MMM yyyy', { locale: es })
              : null
            return (
              <div
                key={pkg.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {pkg.clientes?.nombre_completo || 'Sin nombre'}
                  </span>
                  <Badge variant={statusColors[pkg.estado] ?? 'secondary'}>
                    {pkg.estado === 'activo'
                      ? 'Activo'
                      : pkg.estado === 'completado'
                        ? 'Completado'
                        : pkg.estado === 'expirado'
                          ? 'Vencido'
                          : pkg.estado}
                  </Badge>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {pkg.sesiones_usadas} / {pkg.sesiones_totales} sesiones usadas
                  </span>
                  {expires && <span>Vence: {expires}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
