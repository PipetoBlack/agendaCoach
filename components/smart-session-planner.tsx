"use client"

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { createRecurringSessionsAction } from '@/app/dashboard/sessions/actions'
import { Calendar, Clock, Repeat } from 'lucide-react'

const dayOptions = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

export type ClientLite = { id: string; nombre_completo: string }

export type PackageLite = {
  id: string
  cliente_id: string
  sesiones_totales: number
  sesiones_usadas: number
  sesiones_agendadas?: number
  fecha_expiracion: string | null
  estado: string
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function generateOccurrences(params: {
  startDate: string
  days: number[]
  weeks: number
  maxCount: number
  limitDateOverride?: Date
}) {
  const { startDate, days, weeks, maxCount, limitDateOverride } = params
  if (!startDate || days.length === 0 || weeks <= 0 || maxCount <= 0) return []

  const selectedDays = [...days]
  const start = new Date(`${startDate}T00:00:00`)
  const limitDate = limitDateOverride ? new Date(limitDateOverride) : (() => {
    const d = new Date(start)
    d.setDate(d.getDate() + weeks * 7)
    return d
  })()

  const result: Date[] = []
  for (const cursor = new Date(start); cursor < limitDate && result.length < maxCount; cursor.setDate(cursor.getDate() + 1)) {
    if (selectedDays.includes(cursor.getDay())) {
      result.push(new Date(cursor))
    }
  }
  return result
}

export function SmartSessionPlanner({
  clients,
  packages,
}: {
  clients: ClientLite[]
  packages: PackageLite[]
}) {
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedPackage, setSelectedPackage] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [sessionTime, setSessionTime] = useState('')
  const [weeksInput, setWeeksInput] = useState('4')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const weeksValue = weeksInput === '' ? 0 : Math.max(1, Number(weeksInput) || 0)

  const clientPackages = useMemo(
    () =>
      packages.filter((p) => {
        if (p.cliente_id !== selectedClient) return false
        if (p.estado !== 'activo') return false
        const remainingPkg = p.sesiones_totales - p.sesiones_usadas - (p.sesiones_agendadas ?? 0)
        return remainingPkg > 0
      }),
    [packages, selectedClient],
  )

  useEffect(() => {
    if (clientPackages.length > 0) {
      const withRemaining = clientPackages.find((p) => p.sesiones_totales > p.sesiones_usadas)
      setSelectedPackage(withRemaining ? withRemaining.id : clientPackages[0].id)
    } else {
      setSelectedPackage('')
    }
  }, [clientPackages])

  const selectedPkgData = clientPackages.find((p) => p.id === selectedPackage)
  const remaining = selectedPkgData
    ? Math.max(
        selectedPkgData.sesiones_totales -
          selectedPkgData.sesiones_usadas -
          (selectedPkgData.sesiones_agendadas ?? 0),
        0,
      )
    : 0
  const expiryDate = selectedPkgData?.fecha_expiracion ? new Date(selectedPkgData.fecha_expiracion) : null
  const expiryBoundary = expiryDate ? new Date(expiryDate.getTime() + 24 * 60 * 60 * 1000) : null

  const planned = selectedDays.length * weeksValue

  const occurrences = useMemo(() => {
    if (!selectedPkgData || remaining <= 0) return []
    const start = new Date(`${startDate}T00:00:00`)
    let limitDate = new Date(start)
    limitDate.setDate(limitDate.getDate() + weeksValue * 7)
    if (expiryBoundary && expiryBoundary < limitDate) {
      limitDate = expiryBoundary
    }
    if (expiryBoundary && start >= expiryBoundary) return []
    return generateOccurrences({
      startDate,
      days: selectedDays,
      weeks: weeksValue,
      maxCount: remaining,
      limitDateOverride: limitDate,
    })
  }, [selectedPkgData, remaining, startDate, selectedDays, weeksValue, expiryBoundary])

  const willCreate = occurrences.length

  const previewSessions = useMemo(() => occurrences.slice(0, 10), [occurrences])

  const handleToggleDay = (dayValue: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue) ? prev.filter((d) => d !== dayValue) : [...prev, dayValue],
    )
  }

  const overLimit = selectedPkgData ? planned > remaining : false
  const canSubmit =
    !!selectedClient &&
    !!selectedPackage &&
    selectedDays.length > 0 &&
    !!startDate &&
    !!sessionTime &&
    weeksValue > 0 &&
    willCreate > 0 &&
    !overLimit

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error('Completa todos los campos y selecciona al menos un día')
      return
    }

    startTransition(async () => {
      try {
        await createRecurringSessionsAction({
          clientId: selectedClient,
          packageId: selectedPackage,
          startDate,
          sessionTime,
          days: selectedDays,
          weeks: weeksValue,
        })
        toast.success(`Se programaron ${willCreate} sesiones`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudieron crear las sesiones')
      }
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-heading">Crear agenda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clientPackages.length === 0 && selectedClient && (
              <p className="text-xs text-destructive">Este cliente no tiene paquetes activos.</p>
            )}
          </div>

          <div className="grid gap-3">
            <Label>Días de la semana</Label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {dayOptions.map((d) => {
                const active = selectedDays.includes(d.value)
                return (
                  <Button
                    key={d.value}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => handleToggleDay(d.value)}
                  >
                    {d.label}
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="session_time" className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" /> Horario
              </Label>
              <Input
                id="session_time"
                type="time"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="start_date" className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" /> Fecha inicio
              </Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="weeks" className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Repeat className="h-4 w-4 text-muted-foreground" /> Semanas a repetir
              </Label>
              <Input
                id="weeks"
                type="number"
                min={1}
                value={weeksInput}
                placeholder="Valor mínimo 1"
                inputMode="numeric"
                pattern="[0-9]*"
                onKeyDown={(e) => {
                  const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End']
                  if (allowed.includes(e.key)) return
                  if (!/^\d$/.test(e.key)) e.preventDefault()
                }}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/\D+/g, '').slice(0, 4)
                  setWeeksInput(sanitized)
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-foreground">Paquete</Label>
              <Select value={selectedPackage} onValueChange={setSelectedPackage} disabled={clientPackages.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona paquete" />
                </SelectTrigger>
                <SelectContent>
                  {clientPackages.map((p) => {
                    const remainingPkg = Math.max(
                      p.sesiones_totales - p.sesiones_usadas - (p.sesiones_agendadas ?? 0),
                      0,
                    )
                    const booked = (p.sesiones_usadas ?? 0) + (p.sesiones_agendadas ?? 0)
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {remainingPkg} restantes · {booked}/{p.sesiones_totales} ocupadas
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div>
              Se crearán <strong className="text-foreground">{willCreate}</strong> de {planned || 0} sesiones planificadas
              {selectedPkgData && planned > remaining ? ' (limitadas por el paquete)' : ''}
              {selectedPkgData && overLimit ? ' (reduce días/semanas: supera el paquete)' : ''}
              {selectedPkgData && expiryBoundary && willCreate < planned ? ' (acotadas por la fecha de término)' : ''}.
              {selectedPkgData && expiryBoundary && new Date(`${startDate}T00:00:00`) >= expiryBoundary && (
                  <span className="text-destructive"> La fecha de inicio está vencida para este paquete.</span>
                )}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={!canSubmit || isPending} className="w-full">
            {isPending ? 'Generando...' : `Agendar ${willCreate || 0} sesiones`}
          </Button>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Vista previa ({willCreate} sesiones)</CardTitle>
          <CardDescription>
            Muestra las primeras fechas generadas según la configuración actual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {previewSessions.length === 0 ? (
            <div className="text-sm text-muted-foreground">Configura un cliente, horario y días para ver la vista previa.</div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-auto pr-1">
              {previewSessions.map((d, idx) => (
                <div key={`${d.toISOString()}-${idx}`} className="rounded border p-2 bg-muted/30 text-sm flex items-center justify-between">
                  <span className="text-foreground">{formatDateLabel(d)}</span>
                  <Badge variant="outline">{sessionTime || '--:--'}</Badge>
                </div>
              ))}
              {willCreate > previewSessions.length && (
                <p className="text-xs text-muted-foreground">
                  Mostrando {previewSessions.length} de {willCreate} sesiones generadas.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
