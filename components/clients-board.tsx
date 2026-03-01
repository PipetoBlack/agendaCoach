"use client"

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { PackageFormDialog } from '@/components/package-form-dialog'
import { EditClientButton } from '@/components/client-form-dialog'
import { DeleteClientButton } from '@/components/delete-client-button'
import { burnSessionAction, deletePackageAction, updatePackageExpiryAction } from '@/app/dashboard/sessions/actions'
import {
  Mail,
  Phone,
  Search,
  Filter,
  Package,
  User,
  PhoneCall,
  MailCheck,
  Flame,
  Calendar,
  Clock,
  Sparkles,
  StickyNote,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
type Cliente = {
  id: string
  nombre_completo: string
  rut: string | null
  correo: string | null
  telefono: string | null
  estado: string
  notas: string | null
  creado_en: string
  fecha_nacimiento: string | null
  genero: string | null
}

type Paquete = {
  id: string
  cliente_id: string
  sesiones_totales: number
  sesiones_usadas: number
  estado: string
  fecha_inicio?: string | null
  fecha_expiracion?: string | null
}

type SesionProgramada = {
  id: string
  cliente_id: string
  paquete_id: string | null
  fecha_sesion: string
  hora_sesion: string
  estado: string
}

type SesionConsumida = {
  id: string
  cliente_id: string
  paquete_id: string | null
  consumida_en: string
  notas: string | null
  origen: string | null
}

type ClienteConStats = Cliente & {
  paquetes: number
  paquetesActivos: number
  paquetesEnCola: number
  sesionesTotales: number
  sesionesUsadas: number
  sesionesRestantes: number
  estadoCalculado: 'activo' | 'inactivo'
  esNuevo: boolean
  fechaExpiracionActiva: string | null
  paqueteExpirado: boolean
}

function comparePackages(a: Paquete, b: Paquete) {
  const fa = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : 0
  const fb = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : 0
  if (fa !== fb) return fa - fb
  return a.id.localeCompare(b.id)
}

function selectCurrentActivePackage(pkgs: Paquete[]) {
  const activosOrdenados = pkgs
    .filter((p) => p.estado === 'activo')
    .filter((p) => p.sesiones_usadas < p.sesiones_totales)
    .sort(comparePackages)
  const actual = activosOrdenados[0] || null
  const cola = actual ? activosOrdenados.slice(1) : activosOrdenados
  return { actual, cola }
}

const estadoStyles: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  activo: { label: 'Activo', variant: 'default' },
  inactivo: { label: 'Inactivo', variant: 'outline' },
  nuevo: { label: 'Nuevo', variant: 'secondary' },
}

const filtros = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'activo', etiqueta: 'Activos' },
  { valor: 'inactivo', etiqueta: 'Inactivos' },
  { valor: 'nuevo', etiqueta: 'Nuevos' },
]

function buildStats(clientes: Cliente[], paquetes: Paquete[]): ClienteConStats[] {
  const paquetesPorCliente = paquetes.reduce<Record<string, Paquete[]>>((acc, pkg) => {
    acc[pkg.cliente_id] = acc[pkg.cliente_id] || []
    acc[pkg.cliente_id].push(pkg)
    return acc
  }, {})

  return clientes.map((cliente) => {
    const pkgs = paquetesPorCliente[cliente.id] || []
    const { actual, cola } = selectCurrentActivePackage(pkgs)
    const sesionesTotales = actual?.sesiones_totales || 0
    const sesionesUsadas = actual?.sesiones_usadas || 0
    const estadoCalculado = actual ? 'activo' : 'inactivo'
    const creadoEn = (cliente as any).created_at ? new Date((cliente as any).created_at) : null
    const hoy = new Date()
    const diffMs = creadoEn ? hoy.getTime() - creadoEn.getTime() : Number.POSITIVE_INFINITY
    const diffDias = diffMs / (1000 * 60 * 60 * 24)
    const esNuevo = Number.isFinite(diffDias) ? diffDias <= 7 : cliente.estado === 'nuevo'
    const expiraEn = actual?.fecha_expiracion ? new Date(actual.fecha_expiracion) : null
    const expirada = expiraEn ? expiraEn.getTime() < hoy.getTime() : false
    return {
      ...cliente,
      paquetes: pkgs.length,
      paquetesActivos: pkgs.filter((p) => p.estado === 'activo').length,
      paquetesEnCola: cola.length,
      sesionesTotales,
      sesionesUsadas,
      sesionesRestantes: Math.max(sesionesTotales - sesionesUsadas, 0),
      estadoCalculado,
      esNuevo,
      fechaExpiracionActiva: actual?.fecha_expiracion || null,
      paqueteExpirado: expirada,
    }
  })
}

export function ClientsBoard({
  clients,
  paquetes,
  sesionesProgramadas = [],
  sesionesConsumidas = [],
}: {
  clients: Cliente[]
  paquetes: Paquete[]
  sesionesProgramadas?: SesionProgramada[]
  sesionesConsumidas?: SesionConsumida[]
}) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  const clientesConStats = useMemo(() => buildStats(clients, paquetes), [clients, paquetes])

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    return clientesConStats.filter((c) => {
      const coincideEstado =
        filtroEstado === 'todos'
          ? true
          : filtroEstado === 'nuevo'
            ? c.esNuevo
            : c.estadoCalculado === filtroEstado
      const coincideTexto =
        term.length === 0 ||
        c.nombre_completo.toLowerCase().includes(term) ||
        (c.rut || '').toLowerCase().includes(term)
      return coincideEstado && coincideTexto
    })
  }, [busqueda, filtroEstado, clientesConStats])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 md:max-w-md w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o RUT"
              className="pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {filtros.map((f) => (
            <Button
              key={f.valor}
              size="sm"
              variant={filtroEstado === f.valor ? 'default' : 'outline'}
              onClick={() => setFiltroEstado(f.valor)}
            >
              {f.etiqueta}
            </Button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          No se encontraron clientes.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((cliente) => {
            const estadoInfo = estadoStyles[cliente.estado] ?? { label: cliente.estado, variant: 'secondary' }
            const estadoActivoInfo = estadoStyles[cliente.estadoCalculado]
            const progreso = cliente.sesionesTotales > 0 ? Math.round((cliente.sesionesUsadas / cliente.sesionesTotales) * 100) : 0
            const sesionesProgCliente = sesionesProgramadas.filter((s) => s.cliente_id === cliente.id)
            const sesionesConsCliente = sesionesConsumidas.filter((s) => s.cliente_id === cliente.id)
            return (
              <Card key={cliente.id} className="border-border/70 shadow-sm hover:shadow-lg transition-shadow bg-gradient-to-b from-background to-muted/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{cliente.nombre_completo}</span>
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        {estadoActivoInfo && <Badge variant={estadoActivoInfo.variant}>{estadoActivoInfo.label}</Badge>}
                        {cliente.esNuevo && <Badge variant={estadoStyles.nuevo.variant}>{estadoStyles.nuevo.label}</Badge>}
                        {cliente.paquetesEnCola > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            {cliente.paquetesEnCola} en cola
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <EditClientButton client={cliente} />
                      <DeleteClientButton clientId={cliente.id} clientName={cliente.nombre_completo} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    {cliente.correo && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{cliente.correo}</span>
                      </div>
                    )}
                    {cliente.telefono && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{cliente.telefono}</span>
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {cliente.sesionesTotales > 0 ? (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Sesiones</span>
                          <span className="text-foreground font-medium">
                            {cliente.sesionesUsadas} / {cliente.sesionesTotales || 0}
                          </span>
                        </div>
                        <Progress value={progreso} />
                        <p className="text-xs text-muted-foreground">
                          {cliente.sesionesRestantes} sesiones restantes
                        </p>
                        {cliente.fechaExpiracionActiva && (
                          <p
                            className={`text-xs ${cliente.paqueteExpirado ? 'text-destructive' : 'text-muted-foreground'}`}
                          >
                            Término: {new Date(cliente.fechaExpiracionActiva).toLocaleDateString('es-CL')}
                            {cliente.paqueteExpirado ? ' (vencido)' : ''}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin paquete activo. Crea uno para comenzar.</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-2 w-full">
                  <PackageFormDialog defaultClientId={cliente.id} />
                  <ClientDetailDialog
                    cliente={cliente}
                    paquetes={paquetes}
                    sesionesProgramadas={sesionesProgCliente}
                    sesionesConsumidas={sesionesConsCliente}
                  />
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ClientDetailDialog({
  cliente,
  paquetes,
  sesionesProgramadas,
  sesionesConsumidas,
}: {
  cliente: ClienteConStats
  paquetes: Paquete[]
  sesionesProgramadas: SesionProgramada[]
  sesionesConsumidas: SesionConsumida[]
}) {
  const [open, setOpen] = useState(false)
  const [showHistorialPaquetes, setShowHistorialPaquetes] = useState(false)
  const [isBurning, setIsBurning] = useState(false)
  const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null)
  const [showCola, setShowCola] = useState(false)
  const [showExtendForm, setShowExtendForm] = useState(false)
  const [extendDate, setExtendDate] = useState('')
  const [isExtending, setIsExtending] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showHistorialQuemadas, setShowHistorialQuemadas] = useState(false)
  const [filtroFechaQuemadas, setFiltroFechaQuemadas] = useState('')
  const [paginaQuemadas, setPaginaQuemadas] = useState(1)
  const [confirmBurnOpen, setConfirmBurnOpen] = useState(false)

  useEffect(() => {
    setPaginaQuemadas(1)
  }, [filtroFechaQuemadas, showHistorialQuemadas])
  const paquetesCliente = paquetes.filter((p) => p.cliente_id === cliente.id)
  const { actual: paqueteActivo, cola: paquetesEnCola } = selectCurrentActivePackage(paquetesCliente)
  const progreso = paqueteActivo && paqueteActivo.sesiones_totales > 0
    ? Math.min(Math.round((paqueteActivo.sesiones_usadas / paqueteActivo.sesiones_totales) * 100), 100)
    : 0
  const paqueteExpirado = paqueteActivo?.fecha_expiracion
    ? new Date(paqueteActivo.fecha_expiracion).getTime() < new Date().getTime()
    : false
  const restantes = paqueteActivo
    ? Math.max(paqueteActivo.sesiones_totales - paqueteActivo.sesiones_usadas, 0)
    : 0
  const total = paqueteActivo?.sesiones_totales ?? 0

  const clienteDesde = new Date(cliente.creado_en).toLocaleDateString('es-CL')
  const fechaNacimiento = cliente.fecha_nacimiento
    ? new Date(cliente.fecha_nacimiento).toLocaleDateString('es-CL')
    : 'No registrada'
  const edad = cliente.fecha_nacimiento
    ? (() => {
        const hoy = new Date()
        const nacimiento = new Date(cliente.fecha_nacimiento!)
        let years = hoy.getFullYear() - nacimiento.getFullYear()
        const monthDiff = hoy.getMonth() - nacimiento.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && hoy.getDate() < nacimiento.getDate())) {
          years -= 1
        }
        return Math.max(years, 0)
      })()
    : null
  const generoLabel = cliente.genero
    ? cliente.genero === 'prefiere_no_decir'
      ? 'Prefiere no decir'
      : cliente.genero.charAt(0).toUpperCase() + cliente.genero.slice(1)
    : 'No registrado'
  const observacion = cliente.notas?.trim() ? cliente.notas.trim() : 'Sin observación'

  const agendadas = sesionesProgramadas.filter((s) => s.estado === 'programada').length
  const agendadasTotal = total || sesionesProgramadas.length

  const sesionesQuemadasOrdenadas = [...sesionesConsumidas].sort(
    (a, b) => new Date(b.consumida_en).getTime() - new Date(a.consumida_en).getTime(),
  )
  const ultimasQuemadas = sesionesQuemadasOrdenadas.slice(0, 3)

  const historialQuemadas = useMemo(() => {
    const filtradas = filtroFechaQuemadas
      ? sesionesQuemadasOrdenadas.filter((s) => s.consumida_en.slice(0, 10) === filtroFechaQuemadas)
      : sesionesQuemadasOrdenadas

    const pageSize = 5
    const total = filtradas.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const currentPage = Math.min(paginaQuemadas, totalPages)
    const start = (currentPage - 1) * pageSize
    const slice = filtradas.slice(start, start + pageSize)

    const grupos: { fechaKey: string; fechaLabel: string; sesiones: SesionConsumida[] }[] = []
    slice.forEach((s) => {
      const key = s.consumida_en.slice(0, 10)
      let grupo = grupos.find((g) => g.fechaKey === key)
      if (!grupo) {
        grupo = { fechaKey: key, fechaLabel: new Date(s.consumida_en).toLocaleDateString('es-CL'), sesiones: [] }
        grupos.push(grupo)
      }
      grupo.sesiones.push(s)
    })

    return { total, grupos, totalPages, currentPage, pageSize }
  }, [sesionesQuemadasOrdenadas, filtroFechaQuemadas, paginaQuemadas])

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.toLocaleDateString('es-CL')} · ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
  }

  const handleBurnSession = () => {
    if (!paqueteActivo) return
    setIsBurning(true)
    burnSessionAction({ paqueteId: paqueteActivo.id, clienteId: cliente.id })
      .then(() => toast.success('Sesión quemada'))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'No se pudo quemar la sesión'))
      .finally(() => setIsBurning(false))
  }

  const handleDeletePackage = (packageId: string) => {
    setDeletingPackageId(packageId)
    deletePackageAction(packageId)
      .then(() => toast.success('Paquete eliminado'))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el paquete'))
      .finally(() => setDeletingPackageId(null))
  }

  const openExtendDialog = () => {
    if (paqueteActivo?.fecha_expiracion) {
      setExtendDate(paqueteActivo.fecha_expiracion.slice(0, 10))
    } else {
      setExtendDate(new Date().toISOString().slice(0, 10))
    }
    setShowExtendForm(true)
  }

  const handleExtend = () => {
    if (!paqueteActivo) return
    if (!extendDate) {
      toast.error('Selecciona una fecha de término')
      return
    }
    setIsExtending(true)
    updatePackageExpiryAction({ packageId: paqueteActivo.id, expiryDate: extendDate })
      .then(() => {
        toast.success('Paquete extendido')
        setShowExtendForm(false)
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'No se pudo extender el paquete'))
      .finally(() => setIsExtending(false))
  }

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-center">
          Ver detalles
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl capitalize">{cliente.nombre_completo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 rounded-xl border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-muted-foreground" /> Información Personal
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Estado: </span>
                <Badge variant={cliente.estadoCalculado === 'activo' ? 'default' : 'outline'}>
                  {cliente.estadoCalculado === 'activo' ? 'Activo' : 'Inactivo'}
                </Badge>
                {cliente.estado === 'nuevo' && <Badge variant={estadoStyles.nuevo.variant}>{estadoStyles.nuevo.label}</Badge>}
              </div>
              {cliente.rut && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>RUT: <strong className="text-foreground">{cliente.rut}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Fecha de nacimiento: <strong className="text-foreground">{fechaNacimiento}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Edad: <strong className="text-foreground">{edad !== null ? `${edad} años` : 'No registrada'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Género: <strong className="text-foreground">{generoLabel}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Cliente desde: <strong className="text-foreground">{clienteDesde}</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <StickyNote className="h-4 w-4 mt-0.5" />
                <span>Observación: <strong className="text-foreground">{observacion}</strong></span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MailCheck className="h-4 w-4 text-muted-foreground" /> Contacto
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!cliente.correo} asChild={!cliente.correo}>
                  {cliente.correo ? <a href={`mailto:${cliente.correo}`}>Email</a> : <span>Email</span>}
                </Button>
                <Button variant="outline" size="sm" disabled={!cliente.telefono} asChild={!cliente.telefono}>
                  {cliente.telefono ? <a href={`https://wa.me/${cliente.telefono}`} target="_blank" rel="noreferrer">WhatsApp</a> : <span>WhatsApp</span>}
                </Button>
              </div>
            </div>
            <div className="text-sm space-y-1 text-muted-foreground">
              {cliente.correo && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{cliente.correo}</span>
                </div>
              )}
              {cliente.telefono && (
                <div className="flex items-center gap-2">
                  <PhoneCall className="h-4 w-4" />
                  <span>{cliente.telefono}</span>
                </div>
              )}
              {!cliente.correo && !cliente.telefono && <span>Sin datos de contacto</span>}
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Package className="h-4 w-4 text-muted-foreground" /> Paquete activo
              </div>
              <div className="flex items-center gap-2">
                {paquetesEnCola.length > 0 && (
                  <Button variant="secondary" size="sm" onClick={() => setShowCola((v) => !v)}>
                    {paquetesEnCola.length} en cola
                  </Button>
                )}
                <Button variant="outline" size="sm" disabled={!paqueteActivo} onClick={openExtendDialog}>
                  Extender
                </Button>
                {paqueteActivo && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingPackageId === paqueteActivo.id}
                        onClick={() => setDeleteConfirm('')}
                      >
                        {deletingPackageId === paqueteActivo.id ? 'Eliminando...' : 'Eliminar'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar paquete</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará este paquete y sus sesiones asociadas. Escribe "Eliminar" para confirmar.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Eliminar"
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={deleteConfirm.toLowerCase() !== 'eliminar' || deletingPackageId === paqueteActivo.id}
                          onClick={() => handleDeletePackage(paqueteActivo.id)}
                        >
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            {paqueteActivo ? (
              <div className="space-y-4">
                <div className="grid gap-2 rounded-lg border bg-background p-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                    <span>Sesiones quemadas</span>
                    <span>{paqueteActivo.sesiones_usadas} / {total}</span>
                  </div>
                  {paqueteActivo.fecha_inicio && (
                    <div className="text-xs text-muted-foreground">Inicio: {new Date(paqueteActivo.fecha_inicio).toLocaleDateString('es-CL')}</div>
                  )}
                  {paqueteActivo.fecha_expiracion && (
                    <div
                      className={`text-xs ${paqueteExpirado ? 'text-destructive' : 'text-muted-foreground'}`}
                    >
                      Término: {new Date(paqueteActivo.fecha_expiracion).toLocaleDateString('es-CL')}
                      {paqueteExpirado ? ' (vencido)' : ''}
                    </div>
                  )}
                  <Progress value={progreso} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Flame className="h-3 w-3" /> {restantes} pendientes</span>
                    <span>{progreso}%</span>
                  </div>
                  <AlertDialog open={confirmBurnOpen} onOpenChange={setConfirmBurnOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full" disabled={isBurning}>
                        {isBurning ? 'Registrando...' : 'Quemar sesión'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Quieres quemar una sesión hoy?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción registrará una sesión consumida para este paquete.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBurning}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            setConfirmBurnOpen(false)
                            handleBurnSession()
                          }}
                          disabled={isBurning}
                        >
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="grid gap-2 rounded-lg border bg-background p-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                    <span>Sesiones agendadas</span>
                    <span>{agendadas} / {agendadasTotal || '—'}</span>
                  </div>
                  <Progress value={agendadasTotal > 0 ? Math.min((agendadas / agendadasTotal) * 100, 100) : 0} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{agendadas > 0 ? 'Sesiones futuras registradas' : 'Sin sesiones agendadas'}</span>
                    <Button variant="outline" size="sm" className="h-7 px-2" disabled>
                      Agenda
                    </Button>
                  </div>
                </div>

                {showCola && paquetesEnCola.length > 0 && (
                  <div className="grid gap-2 rounded-lg border bg-background p-3">
                    <div className="text-sm font-semibold text-foreground flex items-center justify-between">
                      <span>Paquetes en cola</span>
                    </div>
                    <div className="grid gap-2 max-h-48 overflow-auto pr-1">
                      {paquetesEnCola.map((p, idx) => {
                        const prog = p.sesiones_totales > 0 ? Math.round((p.sesiones_usadas / p.sesiones_totales) * 100) : 0
                        return (
                          <div key={p.id} className="rounded border p-3 text-sm space-y-2 bg-muted/20">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">En cola #{idx + 1}</span>
                              <Badge variant={p.estado === 'activo' ? 'default' : 'outline'}>{p.estado}</Badge>
                            </div>
                            {p.fecha_inicio && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                Inicio: <strong className="text-foreground">{new Date(p.fecha_inicio).toLocaleDateString('es-CL')}</strong>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              Total sesiones: <strong className="text-foreground">{p.sesiones_totales}</strong>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground text-xs">
                              <span>{p.sesiones_usadas} usadas</span>
                              <span>{p.sesiones_totales} totales</span>
                            </div>
                            <Progress value={prog} />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={() => handleDeletePackage(p.id)}
                              disabled={deletingPackageId === p.id}
                            >
                              {deletingPackageId === p.id ? 'Eliminando...' : 'Eliminar paquete'}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Crea un paquete para activar al cliente.</p>
            )}
          </div>

          <div className="grid gap-3 rounded-xl border p-4 bg-background sm:mx-0 mx-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" /> Sesiones quemadas recientes
              </h3>
              <Button variant="outline" size="sm" onClick={() => setShowHistorialQuemadas(true)}>
                Ver historial
              </Button>
            </div>
            {ultimasQuemadas.length > 0 ? (
              <div className="space-y-2 text-sm text-foreground">
                {ultimasQuemadas.map((s) => (
                  <div key={s.id} className="rounded border p-2 bg-muted/30">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Sesion quemada</span>
                      <span className="text-xs text-muted-foreground">{s.origen || 'manual'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDateTime(s.consumida_en)}</div>
                    {s.notas && <div className="text-xs text-muted-foreground">{s.notas}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>No hay registros de sesiones quemadas. Registra una sesión para ver aquí las últimas 3.</p>
              </div>
            )}
          </div>

          <div className="grid gap-3 rounded-xl border p-4 bg-background sm:mx-0 mx-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" /> Historial de paquetes
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 leading-none"
                onClick={() => setShowHistorialPaquetes((v) => !v)}
              >
                {showHistorialPaquetes ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>
            {showHistorialPaquetes && paquetesCliente.length > 0 ? (
              <div className="grid gap-2 max-h-52 overflow-auto pr-1">
                {paquetesCliente.map((p, idx) => {
                  const prog = p.sesiones_totales > 0 ? Math.round((p.sesiones_usadas / p.sesiones_totales) * 100) : 0
                  return (
                    <div key={p.id} className="rounded border p-3 text-sm space-y-2 bg-background">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Paquete {idx + 1}</span>
                        <Badge variant={p.estado === 'activo' ? 'default' : 'outline'}>{p.estado === 'activo' ? 'Completándose' : 'Finalizado'}</Badge>
                      </div>
                      {p.fecha_inicio && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          Inicio: <strong className="text-foreground">{new Date(p.fecha_inicio).toLocaleDateString('es-CL')}</strong>
                        </div>
                      )}
                      {p.fecha_expiracion && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          Finalizó: <strong className="text-foreground">{new Date(p.fecha_expiracion).toLocaleDateString('es-CL')}</strong>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        Total sesiones: <strong className="text-foreground">{p.sesiones_totales}</strong>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>{p.sesiones_usadas} usadas</span>
                        <span>{p.sesiones_totales} totales</span>
                      </div>
                      <Progress value={prog} />
                    </div>
                  )
                })}
              </div>
            ) : showHistorialPaquetes ? (
              <p className="text-sm text-muted-foreground">Sin paquetes registrados aún.</p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={showExtendForm} onOpenChange={setShowExtendForm}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Extender paquete</DialogTitle>
          <DialogDescription>Actualiza la fecha de término de este paquete de sesiones.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-sm font-medium text-foreground">Nueva fecha de término</span>
            <Input type="date" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowExtendForm(false)} disabled={isExtending}>
              Cancelar
            </Button>
            <Button onClick={handleExtend} disabled={isExtending}>
              {isExtending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={showHistorialQuemadas} onOpenChange={setShowHistorialQuemadas}>
      <DialogContent className="w-full max-w-2xl sm:max-w-2xl max-h-[85vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Historial de sesiones quemadas</DialogTitle>
          <DialogDescription>
            Total: {historialQuemadas.total} sesiones
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="text-sm text-muted-foreground">Filtrar por fecha</div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={filtroFechaQuemadas}
                onChange={(e) => setFiltroFechaQuemadas(e.target.value)}
                className="w-full sm:w-44"
              />
              {filtroFechaQuemadas && (
                <Button variant="ghost" size="sm" onClick={() => setFiltroFechaQuemadas('')}>
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {historialQuemadas.grupos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay sesiones quemadas para la fecha seleccionada.</p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-auto pr-1 sm:pr-2">
              {historialQuemadas.grupos.map((grupo) => (
                <div key={grupo.fechaKey} className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                    <span>{grupo.fechaLabel}</span>
                    <span className="text-xs text-muted-foreground">{grupo.sesiones.length} sesiones</span>
                  </div>
                  <div className="space-y-2">
                    {grupo.sesiones.map((s) => (
                      <div key={s.id} className="rounded border p-2 bg-background">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>Sesión quemada</span>
                          <span className="text-xs text-muted-foreground">{s.origen || 'manual'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(s.consumida_en).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {s.notas && <div className="text-xs text-muted-foreground">{s.notas}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {historialQuemadas.total > historialQuemadas.pageSize && (
            <div className="flex items-center justify-between gap-3 pt-2 text-sm">
              <div className="text-muted-foreground">
                Página {historialQuemadas.currentPage} de {historialQuemadas.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historialQuemadas.currentPage === 1}
                  onClick={() => setPaginaQuemadas((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historialQuemadas.currentPage === historialQuemadas.totalPages}
                  onClick={() => setPaginaQuemadas((p) => Math.min(historialQuemadas.totalPages, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    </>
  )
}
