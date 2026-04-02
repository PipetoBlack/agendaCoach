"use client"

import React from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type EvaluationHistoryRow = {
  id: number | string | null
  fecha: string | null
  peso: number | null
  imc: number | null
  porcentaje_grasa: number | null
}

type MetricKey = 'peso' | 'imc' | 'porcentaje_grasa'

type ProgressPoint = {
  id: string
  fecha: string | null
  fechaCorta: string
  fechaCompleta: string
  peso: number | null
  imc: number | null
  porcentaje_grasa: number | null
}

type MetricDefinition = {
  key: MetricKey
  title: string
  unit: string
  color: string
  description: string
  emptyMessage: string
  decimals: number
}

const metricDefinitions: MetricDefinition[] = [
  {
    key: 'peso',
    title: 'Peso',
    unit: 'kg',
    color: '#0f8a72',
    description: 'Evolución del peso corporal según las evaluaciones registradas.',
    emptyMessage: 'Todavía no hay registros de peso para mostrar una progresión.',
    decimals: 1,
  },
  {
    key: 'imc',
    title: 'IMC',
    unit: '',
    color: '#2563eb',
    description: 'Seguimiento del índice de masa corporal a lo largo del tiempo.',
    emptyMessage: 'Todavía no hay registros de IMC para mostrar una progresión.',
    decimals: 1,
  },
  {
    key: 'porcentaje_grasa',
    title: '% grasa',
    unit: '%',
    color: '#ea580c',
    description: 'Variación del porcentaje de grasa corporal entre evaluaciones.',
    emptyMessage: 'Todavía no hay registros de porcentaje de grasa para mostrar una progresión.',
    decimals: 1,
  },
]

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatShortDate(value: string | null) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(date).replace('.', '')
}

function formatLongDate(value: string | null) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatNumber(value: number, decimals: number) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}

function formatMetricValue(value: number, decimals: number, unit: string) {
  const formatted = formatNumber(value, decimals)
  return unit ? `${formatted} ${unit}` : formatted
}

function formatDelta(value: number, decimals: number, unit: string) {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${formatMetricValue(value, decimals, unit)}`
}

function formatAxisTick(value: number) {
  return formatNumber(value, 0)
}

function buildProgressPoint(row: EvaluationHistoryRow, index: number): ProgressPoint {
  return {
    id: String(row.id ?? index),
    fecha: row.fecha,
    fechaCorta: formatShortDate(row.fecha),
    fechaCompleta: formatLongDate(row.fecha),
    peso: toNullableNumber(row.peso),
    imc: toNullableNumber(row.imc),
    porcentaje_grasa: toNullableNumber(row.porcentaje_grasa),
  }
}

function ProgressMetricChart({ data, metric }: { data: ProgressPoint[]; metric: MetricDefinition }) {
  const values = data
    .map((point) => point[metric.key])
    .filter((value): value is number => typeof value === 'number')

  const hasData = values.length > 0
  const currentValue = hasData ? values[values.length - 1] : null
  const deltaValue = values.length > 1 ? values[values.length - 1] - values[0] : null

  const chartConfig: ChartConfig = {
    [metric.key]: {
      label: metric.title,
      color: metric.color,
    },
  }

  return (
    <div className="rounded-xl border border-border/70 bg-background/80 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{metric.title}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{metric.description}</p>
        </div>

        <div className="rounded-lg bg-muted/35 px-3 py-2 text-left sm:min-w-[140px] sm:text-right">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Actual</div>
          <div className="mt-1 text-lg font-semibold leading-none text-foreground">
            {currentValue != null ? formatMetricValue(currentValue, metric.decimals, metric.unit) : '—'}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {deltaValue != null ? `Variación: ${formatDelta(deltaValue, metric.decimals, metric.unit)}` : 'Se necesita más historial'}
          </div>
        </div>
      </div>

      {hasData ? (
        <ChartContainer config={chartConfig} className="mt-4 h-[190px] w-full aspect-auto">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="fechaCorta"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={36}
              tickFormatter={(value: number) => formatAxisTick(value)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const point = payload?.[0]?.payload as ProgressPoint | undefined
                    return point?.fechaCompleta ?? 'Sin fecha'
                  }}
                  formatter={(value) => {
                    if (typeof value !== 'number') return null
                    return (
                      <div className="flex min-w-[8rem] items-center justify-between gap-4">
                        <span className="text-muted-foreground">{metric.title}</span>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {formatMetricValue(value, metric.decimals, metric.unit)}
                        </span>
                      </div>
                    )
                  }}
                />
              }
            />
            <Line
              type="monotone"
              dataKey={metric.key}
              stroke={`var(--color-${metric.key})`}
              strokeWidth={2.5}
              connectNulls
              dot={{ r: 2.5, fill: `var(--color-${metric.key})` }}
              activeDot={{ r: 4, fill: `var(--color-${metric.key})` }}
            />
          </LineChart>
        </ChartContainer>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
          {metric.emptyMessage}
        </div>
      )}
    </div>
  )
}

export default function EvaluationProgressDialog({ clientId, clientName, buttonClassName, iconOnly = false, buttonLabel = 'Progreso' }: { clientId?: string; clientName?: string; buttonClassName?: string; iconOnly?: boolean; buttonLabel?: string }) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [progressData, setProgressData] = React.useState<ProgressPoint[]>([])

  React.useEffect(() => {
    if (!open || !clientId) return

    let active = true

    async function loadProgress() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const { data, error: queryError } = await supabase
          .from('evaluaciones')
          .select('id, fecha, peso, imc, porcentaje_grasa')
          .eq('cliente_id', clientId)
          .order('fecha', { ascending: true })
          .order('id', { ascending: true })

        if (queryError) throw queryError

        const rows = Array.isArray(data) ? (data as EvaluationHistoryRow[]) : []
        const nextData = rows.map((row, index) => buildProgressPoint(row, index))

        if (active) setProgressData(nextData)
      } catch (err) {
        if (!active) return
        setProgressData([])
        setError('No se pudo cargar el progreso de este cliente.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProgress()

    return () => {
      active = false
    }
  }, [open, clientId])

  if (!clientId) return null

  const triggerButton = (
    <Button
      variant={iconOnly ? 'ghost' : 'outline'}
      size={iconOnly ? 'icon' : 'sm'}
      className={cn(iconOnly ? 'h-8 w-8 rounded-full' : 'h-8 gap-1.5 px-2.5 text-xs', buttonClassName)}
      aria-label={buttonLabel}
    >
      <TrendingUp className="h-3.5 w-3.5" />
      {iconOnly ? <span className="sr-only">{buttonLabel}</span> : buttonLabel}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {iconOnly ? (
        <TooltipProvider delayDuration={120}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                {triggerButton}
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Ver progreso</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <DialogTrigger asChild>
          {triggerButton}
        </DialogTrigger>
      )}

      <DialogContent className="max-w-3xl">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Progreso de {clientName ?? 'cliente'}</DialogTitle>
          <DialogDescription>
            Seguimiento visual de peso, IMC y porcentaje de grasa en las evaluaciones registradas.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-[280px] animate-pulse rounded-xl border bg-muted/30" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && progressData.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            Aún no hay evaluaciones suficientes para mostrar una progresión de este cliente.
          </div>
        )}

        {!loading && !error && progressData.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              {progressData.length === 1
                ? 'Se encontró 1 evaluación registrada. La gráfica se irá enriqueciendo a medida que cargues nuevas mediciones.'
                : `Se encontraron ${progressData.length} evaluaciones registradas para este cliente.`}
            </div>

            {metricDefinitions.map((metric) => (
              <ProgressMetricChart key={metric.key} data={progressData} metric={metric} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}