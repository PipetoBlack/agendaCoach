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
  const currentYear = String(now.getFullYear())
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<EvaluationListItem[]>([])
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1))
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

        if (clientIds.length === 0) {
          if (mounted) {
            setItems([])
          }
          return
        }

        const yearNumber = Number(currentYear)
        const monthNumber = Number(selectedMonth)
        const { start, end } = getRegistrationMonthRange(yearNumber, monthNumber)

        const monthResponse = await supabase
          .from('evaluaciones')
          .select('id, cliente_id, fecha, creado_en, imc')
          .in('cliente_id', clientIds)
          .gte('creado_en', start)
          .lt('creado_en', end)
          .order('creado_en', { ascending: false })
          .order('id', { ascending: false })

        if (monthResponse.error) throw monthResponse.error
        const monthItems = (monthResponse.data ?? []).map((evaluation: any) => ({
          ...evaluation,
          clientName: clientMap[evaluation.cliente_id] ?? '—',
        }))

        if (mounted) {
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
  }, [currentYear, open, selectedMonth])

  const selectedMonthLabel = monthOptions.find((month) => month.value === selectedMonth)?.label ?? 'Mes'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="items-center pr-8 text-center sm:text-center">
          <DialogTitle className="text-center">Historial de evaluaciones registradas</DialogTitle>
          <DialogDescription className="max-w-xl text-center">
            Aquí verás todas las evaluaciones registradas de este mes, incluso si fueron realizadas en fechas anteriores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr),108px] items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value.slice(0, 40))}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData('text')
                  if (!pasted) return
                  const start = event.currentTarget.selectionStart ?? search.length
                  const end = event.currentTarget.selectionEnd ?? search.length
                  const nextValue = `${search.slice(0, start)}${pasted}${search.slice(end)}`
                  if (nextValue.length > 40) {
                    event.preventDefault()
                    setSearch(nextValue.slice(0, 40))
                  }
                }}
                maxLength={40}
                placeholder="Buscar por nombre"
                className="h-10 pl-9"
              />
            </div>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-10 px-3">
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
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {loading
              ? 'Cargando evaluaciones...'
              : `${filteredItems.length} evaluacion${filteredItems.length === 1 ? '' : 'es'} ingresadas en ${selectedMonthLabel.toLowerCase()} de ${currentYear}.`}
          </div>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              No registraste evaluaciones en {selectedMonthLabel.toLowerCase()} de {currentYear}.
            </div>
          )}

          {!loading && !error && items.length > 0 && filteredItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              No se encontraron clientes con ese nombre dentro de los registros de {selectedMonthLabel.toLowerCase()} de {currentYear}.
            </div>
          )}

          <div className="grid max-h-[52vh] gap-2 overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/60 bg-background/80 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{item.clientName}</div>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="text-muted-foreground">
                        Evaluada: {formatEvaluationDate(item.fecha)}
                      </div>
                      <div className="font-medium text-primary">
                        Registrada: {formatRegistrationDate(item.creado_en)}
                      </div>
                    </div>
                  </div>

                  <Button variant="ghost" className="shrink-0" onClick={() => { if (onSelect) onSelect(item); onOpenChange(false) }}>
                    Ver detalle
                  </Button>
                </div>
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
