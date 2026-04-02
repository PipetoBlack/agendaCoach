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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  order: number
  evaluationShortLabel: string
  evaluationLabel: string
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
  minValid: number
  maxValid: number
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
    minValid: 20,
    maxValid: 350,
  },
  {
    key: 'imc',
    title: 'IMC',
    unit: '',
    color: '#2563eb',
    description: 'Seguimiento del índice de masa corporal a lo largo del tiempo.',
    emptyMessage: 'Todavía no hay registros de IMC para mostrar una progresión.',
    decimals: 1,
    minValid: 10,
    maxValid: 90,
  },
  {
    key: 'porcentaje_grasa',
    title: '% grasa',
    unit: '%',
    color: '#ea580c',
    description: 'Variación del porcentaje de grasa corporal entre evaluaciones.',
    emptyMessage: 'Todavía no hay registros de porcentaje de grasa para mostrar una progresión.',
    decimals: 1,
    minValid: 2,
    maxValid: 75,
  },
]

type MetricChartPoint = ProgressPoint & {
  value: number | null
}

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

function sanitizeMetricValue(metric: MetricDefinition, value: number | null) {
  if (value == null || !Number.isFinite(value)) return null
  if (value < metric.minValid || value > metric.maxValid) return null
  return value
}

function getChangeText(value: number | null, metric: MetricDefinition) {
  if (value == null) return 'Sin cambio calculable'
  if (value === 0) return 'Sin variación'
  return `${value > 0 ? '+' : ''}${formatMetricValue(value, metric.decimals, metric.unit)}`
}

function buildProgressPoint(row: EvaluationHistoryRow, index: number): ProgressPoint {
  const order = index + 1

  return {
    id: String(row.id ?? index),
    order,
    evaluationShortLabel: `E${order}`,
    evaluationLabel: `Evaluación ${order}`,
    fecha: row.fecha,
    fechaCorta: formatShortDate(row.fecha),
    fechaCompleta: formatLongDate(row.fecha),
    peso: toNullableNumber(row.peso),
    imc: toNullableNumber(row.imc),
    porcentaje_grasa: toNullableNumber(row.porcentaje_grasa),
  }
}

function SummaryStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/85 px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

function ProgressMetricChart({ data, metric }: { data: ProgressPoint[]; metric: MetricDefinition }) {
  const chartData: MetricChartPoint[] = data.map((point) => ({
    ...point,
    value: sanitizeMetricValue(metric, point[metric.key]),
  }))

  const validPoints = chartData.filter((point): point is MetricChartPoint & { value: number } => point.value !== null)
  const hasData = validPoints.length > 0
  const firstValidPoint = hasData ? validPoints[0] : null
  const currentPoint = hasData ? validPoints[validPoints.length - 1] : null
  const deltaValue = validPoints.length > 1 && firstValidPoint && currentPoint
    ? currentPoint.value - firstValidPoint.value
    : null
  const skippedCount = chartData.filter((point) => point[metric.key] != null && point.value === null).length

  const chartConfig: ChartConfig = {
    value: {
      label: metric.title,
      color: metric.color,
    },
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{metric.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{metric.description}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <SummaryStat
          label="Actual"
          value={currentPoint ? formatMetricValue(currentPoint.value, metric.decimals, metric.unit) : '—'}
          hint={currentPoint ? `${currentPoint.evaluationLabel} · ${currentPoint.fechaCompleta}` : 'Sin dato válido'}
        />
        <SummaryStat
          label="Cambio total"
          value={getChangeText(deltaValue, metric)}
          hint={firstValidPoint ? `Comparado con ${firstValidPoint.evaluationLabel}` : 'Se necesita más historial'}
        />
        <SummaryStat
          label="Trayectoria"
          value={hasData ? `${validPoints.length} mediciones útiles` : 'Sin datos'}
          hint={hasData ? `De ${validPoints[0].evaluationShortLabel} a ${validPoints[validPoints.length - 1].evaluationShortLabel}` : 'Sin puntos para graficar'}
        />
      </div>

      {hasData ? (
        <ChartContainer config={chartConfig} className="mt-5 h-[220px] w-full aspect-auto rounded-xl border border-border/60 bg-background/70 p-2 sm:p-3">
          <LineChart data={chartData} margin={{ top: 8, right: 10, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="evaluationShortLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={18}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={42}
              tickFormatter={(value: number) => formatAxisTick(value)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const point = payload?.[0]?.payload as MetricChartPoint | undefined
                    if (!point) return 'Sin fecha'
                    return `${point.evaluationLabel} · ${point.fechaCompleta}`
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
              dataKey="value"
              stroke="var(--color-value)"
              strokeWidth={2.5}
              connectNulls
              dot={{ r: 3, fill: 'var(--color-value)' }}
              activeDot={{ r: 5, fill: 'var(--color-value)' }}
            />
          </LineChart>
        </ChartContainer>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
          {metric.emptyMessage}
        </div>
      )}

      {skippedCount > 0 ? (
        <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Se omitieron {skippedCount} registro{skippedCount > 1 ? 's' : ''} atípico{skippedCount > 1 ? 's' : ''} de {metric.title.toLowerCase()} para no distorsionar la trayectoria.
        </div>
      ) : null}
    </div>
  )
}

export default function EvaluationProgressDialog({ clientId, clientName, buttonClassName, iconOnly = false, buttonLabel = 'Ver progreso' }: { clientId?: string; clientName?: string; buttonClassName?: string; iconOnly?: boolean; buttonLabel?: string }) {
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
            Vista pensada para leer la trayectoria real del cliente según el orden de sus evaluaciones.
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
            <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Trayectoria real
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-foreground">Resumen del seguimiento</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Cada punto representa una evaluación real del cliente. Si hubo varias el mismo día, se ordenaron según el registro para mostrar la secuencia correcta.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/20 bg-background/80 px-4 py-3 text-center">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Evaluaciones</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{progressData.length}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <SummaryStat
                  label="Primera"
                  value={progressData[0]?.fechaCompleta ?? '—'}
                  hint={progressData[0]?.evaluationLabel ?? 'Sin registro'}
                />
                <SummaryStat
                  label="Última"
                  value={progressData[progressData.length - 1]?.fechaCompleta ?? '—'}
                  hint={progressData[progressData.length - 1]?.evaluationLabel ?? 'Sin registro'}
                />
                <SummaryStat
                  label="Secuencia"
                  value={`${progressData[0]?.evaluationShortLabel ?? '—'} a ${progressData[progressData.length - 1]?.evaluationShortLabel ?? '—'}`}
                  hint={progressData.length === 1 ? 'Solo hay una medición por ahora' : 'Orden cronológico confirmado'}
                />
              </div>

              <div className="mt-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Línea de evaluaciones</div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {progressData.map((point, index) => (
                    <div
                      key={point.id}
                      className={cn(
                        'min-w-[92px] rounded-xl border px-3 py-2',
                        index === progressData.length - 1
                          ? 'border-primary/25 bg-primary/10'
                          : 'border-border/60 bg-background/80'
                      )}
                    >
                      <div className="text-xs font-semibold text-foreground">{point.evaluationShortLabel}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{point.fechaCorta}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Tabs defaultValue={metricDefinitions[0].key} className="space-y-3">
              <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-muted/60 p-1">
                {metricDefinitions.map((metric) => (
                  <TabsTrigger key={metric.key} value={metric.key} className="rounded-lg px-2 py-2 text-xs sm:text-sm">
                    {metric.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {metricDefinitions.map((metric) => (
                <TabsContent key={metric.key} value={metric.key} className="mt-0">
                  <ProgressMetricChart data={progressData} metric={metric} />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}