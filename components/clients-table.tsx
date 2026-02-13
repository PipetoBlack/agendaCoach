import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EditClientButton } from '@/components/client-form-dialog'
import { DeleteClientButton } from '@/components/delete-client-button'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Client {
  id: string
  nombre_completo: string
  rut: string | null
  correo: string | null
  telefono: string | null
  estado: string
  notas: string | null
  creado_en: string
}

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  activo: 'default',
  nuevo: 'secondary',
  inactivo: 'outline',
}

const statusLabels: Record<string, string> = {
  activo: 'Activo',
  nuevo: 'Nuevo',
  inactivo: 'Inactivo',
}

export function ClientsTable({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-foreground">Todavía no tienes clientes</p>
        <p className="text-sm text-muted-foreground mt-1">
          Agrega tu primer cliente para comenzar.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead className="hidden md:table-cell">RUT</TableHead>
            <TableHead className="hidden md:table-cell">Correo</TableHead>
            <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="hidden lg:table-cell">Creado</TableHead>
            <TableHead className="w-24">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium text-foreground">
                {client.nombre_completo}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {client.rut || '-'}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {client.correo || '-'}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground">
                {client.telefono || '-'}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant[client.estado] ?? 'secondary'}>
                  {statusLabels[client.estado] ?? client.estado}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground">
                {format(parseISO(client.creado_en), 'd MMM yyyy', { locale: es })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <EditClientButton client={client} />
                  <DeleteClientButton
                    clientId={client.id}
                    clientName={client.nombre_completo}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
