"use client"

import React, { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { createClient } from '@/lib/supabase/client'
import { formatEvaluationDate } from '@/lib/evaluation-date'

type EvaluationListItem = {
  id: number | string
  cliente_id?: string | null
  fecha: string | null
  creado_en: string | null
  objetivo?: string | null
  imc?: number | null
  clientName: string
}

const monthOptions = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

function formatRegistrationDate(value?: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'

  return parsed.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getRegistrationYear(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  return String(parsed.getFullYear())
}

function getRegistrationMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, month, 1, 0, 0, 0, 0)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export default function MoreEvaluationsModal({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (open: boolean) => void; onSelect?: (evaluation: any) => void }) {
  const now = new Date()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<EvaluationListItem[]>([])
  const [availableYears, setAvailableYears] = useState<string[]>([String(now.getFullYear())])
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1))
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()))
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const deferredSearch = React.useDeferredValue(search)
  const normalizedSearch = deferredSearch.trim().toLowerCase()

  const filteredItems = normalizedSearch
    ? items.filter((item) => item.clientName.toLowerCase().includes(normalizedSearch))
    : items

  useEffect(() => {
    if (!open) return
    let mounted = true

    async function loadMonth() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          if (mounted) {
            setItems([])
            setError('No se pudo identificar al usuario actual.')
          }
          return
        }

        const { data: clients, error: clientsError } = await supabase
          .from('clientes')
          .select('id, nombre_completo')
          .eq('usuario_id', user.id)
          .order('nombre_completo')

        if (clientsError) throw clientsError

        const clientIds = (clients ?? []).map((client: { id: string }) => client.id).filter(Boolean)
        const clientMap: Record<string, string> = {}
        ;(clients ?? []).forEach((client: { id: string; nombre_completo?: string | null }) => {
          clientMap[client.id] = client.nombre_completo ?? '—'
        })

        const yearsFromClients = new Set<string>([String(new Date().getFullYear())])

        if (clientIds.length === 0) {
          if (mounted) {
            setItems([])
            setAvailableYears(Array.from(yearsFromClients).sort((a, b) => Number(b) - Number(a)))
          }
          return
        }

        const yearNumber = Number(selectedYear)
        const monthNumber = Number(selectedMonth)
        const { start, end } = getRegistrationMonthRange(yearNumber, monthNumber)

        const [monthResponse, allDatesResponse] = await Promise.all([
          supabase
            .from('evaluaciones')
            .select('id, cliente_id, fecha, creado_en, objetivo, imc')
            .in('cliente_id', clientIds)
            .gte('creado_en', start)
            .lt('creado_en', end)
            .order('creado_en', { ascending: false })
            .order('id', { ascending: false }),
          supabase
            .from('evaluaciones')
            .select('creado_en')
            .in('cliente_id', clientIds)
            .order('creado_en', { ascending: false }),
        ])

        if (monthResponse.error) throw monthResponse.error
        if (allDatesResponse.error) throw allDatesResponse.error

        ;(allDatesResponse.data ?? []).forEach((row: { creado_en?: string | null }) => {
          const year = getRegistrationYear(row.creado_en)
          if (year) yearsFromClients.add(year)
        })

        const sortedYears = Array.from(yearsFromClients).sort((a, b) => Number(b) - Number(a))
        const monthItems = (monthResponse.data ?? []).map((evaluation: any) => ({
          ...evaluation,
          clientName: clientMap[evaluation.cliente_id] ?? '—',
        }))

        if (mounted) {
          setAvailableYears(sortedYears)
          setItems(monthItems)
        }
      } catch (err) {
        if (mounted) {
          setItems([])
          setError(err instanceof Error ? err.message : 'No se pudo cargar el historial mensual.')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadMonth()
    return () => { mounted = false }
  }, [open, selectedMonth, selectedYear])

  const selectedMonthLabel = monthOptions.find((month) => month.value === selectedMonth)?.label ?? 'Mes'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="items-center pr-8 text-center sm:text-center">
          <DialogTitle className="text-center">Historial de evaluaciones registradas</DialogTitle>
          <DialogDescription className="max-w-xl text-center">
            Este indicador cuenta las evaluaciones que registraste en el sistema en el mes seleccionado, aunque la fecha evaluada pertenezca a otro mes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr),140px,120px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre"
                className="pl-9"
              />
            </div>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {loading
              ? 'Cargando evaluaciones...'
              : `${filteredItems.length} evaluacion${filteredItems.length === 1 ? '' : 'es'} ingresadas en ${selectedMonthLabel.toLowerCase()} de ${selectedYear}.`}
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              No registraste evaluaciones en {selectedMonthLabel.toLowerCase()} de {selectedYear}.
            </div>
          )}

          {!loading && !error && items.length > 0 && filteredItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              No se encontraron clientes con ese nombre dentro de los registros de {selectedMonthLabel.toLowerCase()} de {selectedYear}.
            </div>
          )}

          <div className="grid max-h-[52vh] gap-2 overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 p-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{item.clientName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Fecha evaluada: {formatEvaluationDate(item.fecha)}
                  </div>
                  <div className="mt-1 text-xs font-medium text-primary">
                    Registrada: {formatRegistrationDate(item.creado_en)}
                  </div>
                  {item.objetivo ? (
                    <div className="mt-2 truncate text-xs text-muted-foreground">
                      Objetivo: {item.objetivo}
                    </div>
                  ) : null}
                </div>

                <Button variant="ghost" onClick={() => { if (onSelect) onSelect(item); onOpenChange(false) }}>
                  Ver detalle
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
