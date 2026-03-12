"use client"

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatCard } from '@/components/stat-card'
import { cn } from '@/lib/utils'
import React from 'react'
import { Check, Filter, Info, Users } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ClientDetailDialog,
  selectCurrentActivePackage as selectCurrentActivePackageOriginal,
  type ClienteConStats,
  type Paquete,
  type SesionProgramada,
  type SesionConsumida,
} from '@/components/clients-board'

type ClientItem = {
  id: string
  nombre_completo: string
  rut: string | null
  estado: string | null
  correo?: string | null
  telefono?: string | null
  notas?: string | null
  creado_en?: string
  fecha_nacimiento?: string | null
  genero?: string | null
  derivedStatus?: string
}

const filters = [
  { value: 'todos', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'inactivo', label: 'Inactivos' },
]

function toClienteConStats(cliente: ClientItem, pkgsAll: Paquete[]): ClienteConStats {
  const pkgs = pkgsAll.filter((p) => p.cliente_id === cliente.id)
  const { actual, cola } = selectCurrentActivePackage(pkgs)
  const sesionesTotales = actual?.sesiones_totales || 0
  const sesionesUsadas = actual?.sesiones_usadas || 0
  const estadoCalculado = actual ? 'activo' : 'inactivo'
  const creadoEnDate = cliente.creado_en ? new Date(cliente.creado_en) : null
  const diffDias = creadoEnDate ? (Date.now() - creadoEnDate.getTime()) / (1000 * 60 * 60 * 24) : Number.POSITIVE_INFINITY
  const esNuevo = Number.isFinite(diffDias) ? diffDias <= 7 : cliente.estado === 'nuevo'
  const expiraEn = actual?.fecha_expiracion ? new Date(actual.fecha_expiracion) : null
  const paqueteExpirado = expiraEn ? expiraEn.getTime() < Date.now() : false

  return {
    ...cliente,
    correo: cliente.correo ?? null,
    telefono: cliente.telefono ?? null,
    notas: cliente.notas ?? null,
    genero: cliente.genero ?? null,
    fecha_nacimiento: cliente.fecha_nacimiento ?? null,
    creado_en: cliente.creado_en ?? new Date().toISOString(),
    paquetes: pkgs.length,
    paquetesActivos: pkgs.filter((p) => p.estado === 'activo').length,
    paquetesEnCola: cola.length,
    sesionesTotales,
    sesionesUsadas,
    sesionesRestantes: Math.max(sesionesTotales - sesionesUsadas, 0),
    estadoCalculado,
    esNuevo,
    fechaExpiracionActiva: actual?.fecha_expiracion || null,
    paqueteExpirado,
  }
}

function selectCurrentActivePackage(pkgs: Paquete[]) {
  return selectCurrentActivePackageOriginal(pkgs)
}

type ClientsQuickListProps = {
  clients: ClientItem[]
  count: number
  activeClientIds: string[]
  paquetes: Paquete[]
  sesionesProgramadas: SesionProgramada[]
  sesionesConsumidas: SesionConsumida[]
  trigger?: React.ReactNode
}

export function ClientsQuickList({
  clients,
  count,
  activeClientIds,
  paquetes,
  sesionesProgramadas,
  sesionesConsumidas,
  trigger,
}: ClientsQuickListProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<string>('todos')
  const [query, setQuery] = useState('')

  const activeSet = useMemo(() => new Set(activeClientIds), [activeClientIds])
  const packagesByClient = useMemo(() => {
    const map = new Map<string, Paquete[]>()
    paquetes.forEach((p) => {
      const list = map.get(p.cliente_id) || []
      list.push(p)
      map.set(p.cliente_id, list)
    })
    return map
  }, [paquetes])

  const deriveStatus = (c: ClientItem) => {
    const pkgsCliente = packagesByClient.get(c.id) || []
    const { actual } = selectCurrentActivePackage(pkgsCliente)
    if (activeSet.has(c.id)) return 'activo'
    if (actual) return 'activo'
    return 'inactivo'
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return clients.filter((c) => {
      const derivedStatus = deriveStatus(c)
      const matchesFilter =
        filter === 'todos'
          ? true
          : filter === 'inactivo'
            ? derivedStatus === 'inactivo' || derivedStatus === 'nuevo'
            : derivedStatus === filter
      const matchesSearch =
        term.length === 0 ||
        c.nombre_completo.toLowerCase().includes(term) ||
        (c.rut || '').toLowerCase().includes(term)
      return matchesFilter && matchesSearch
    })
  }, [clients, filter, query, activeSet, packagesByClient])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div onClick={() => setOpen(true)} className="cursor-pointer h-full">
          {trigger || (
            <StatCard
              title="Total de clientes"
              value={count}
              icon={Users}
              className="w-full h-full min-h-[100px]"
            />
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg sm:w-full max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle>Clientes ({filtered.length})</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Buscar por nombre o RUT"
                className="pr-24"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap">
                  <Filter className="h-4 w-4" />
                  <span>{filters.find((f) => f.value === filter)?.label || 'Todos'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {filters.map((f) => (
                  <DropdownMenuItem key={f.value} onClick={() => setFilter(f.value)} className="gap-2">
                    {f.label}
                    {filter === f.value && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No se encontraron clientes.</p>
          ) : (
            filtered.map((c) => {
              const derivedStatus = deriveStatus(c)
              const pkgsCliente = packagesByClient.get(c.id) || []
              const { actual } = selectCurrentActivePackage(pkgsCliente)
              const clienteStats = toClienteConStats(c, paquetes)
              return (
                <div key={c.id} className="rounded border p-2 flex items-center justify-between text-sm gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-foreground font-medium truncate">{c.nombre_completo}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'capitalize shrink-0 border',
                        derivedStatus === 'activo'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-secondary text-secondary-foreground border-transparent',
                      )}
                    >
                      {derivedStatus}
                    </Badge>
                  </div>
                  <ClientDetailDialog
                    cliente={clienteStats}
                    paquetes={paquetes.filter((p) => p.cliente_id === c.id)}
                    sesionesProgramadas={sesionesProgramadas.filter((s) => s.cliente_id === c.id)}
                    sesionesConsumidas={sesionesConsumidas.filter((s) => s.cliente_id === c.id)}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ver detalle">
                        <Info className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}