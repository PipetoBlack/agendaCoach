"use client"

import { useMemo, useState } from 'react'
import { StatCard } from '@/components/stat-card'
import { Package } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export type ExpiringPackageItem = {
  id: string
  cliente_id: string
  estado: string
  sesiones_totales: number
  sesiones_usadas: number
  fecha_expiracion: string
  clientes: { nombre_completo: string | null } | null
}

export function ExpiringPackagesCard({ packages }: { packages: ExpiringPackageItem[] }) {
  const [open, setOpen] = useState(false)

  const items = useMemo(() => {
    const now = Date.now()
    return [...packages].sort((a, b) => {
      const aDate = new Date(a.fecha_expiracion).getTime()
      const bDate = new Date(b.fecha_expiracion).getTime()
      const aExpired = aDate < now
      const bExpired = bDate < now
      if (aExpired !== bExpired) return aExpired ? 1 : -1 // futuros primero, vencidos al final
      return aDate - bDate
    })
  }, [packages])

  const count = items.length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          <StatCard
            title="Paquetes por vencer"
            value={count}
            description="Vencen o vencieron con sesiones pendientes"
            icon={Package}
          />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Paquetes por vencer ({count})</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay paquetes por vencer en la próxima semana.</p>
          ) : (
            items.map((p) => {
              const nombre = p.clientes?.nombre_completo || 'Sin nombre'
              const pendientes = Math.max(p.sesiones_totales - p.sesiones_usadas, 0)
              const isExpired = new Date(p.fecha_expiracion).getTime() < Date.now()
              return (
                <div key={p.id} className="rounded border p-3 bg-muted/30 flex flex-col gap-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-medium">{nombre}</span>
                    <Badge variant={isExpired ? 'destructive' : 'secondary'} className="capitalize">
                      {isExpired ? 'Vencido' : p.estado}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex items-center justify-between">
                    <span>{pendientes} sesiones pendiente{pendientes === 1 ? '' : 's'}</span>
                    <span className={`text-xs ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
                      {isExpired ? 'Venció: ' : 'Vence: '}
                      {new Date(p.fecha_expiracion).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
