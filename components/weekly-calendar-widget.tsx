'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CalendarSessionCard, type WeekRutinaData } from '@/components/calendar-session-card'

const TIME_ZONE = 'America/Santiago'

function toYmd(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(d)
}

function getWeekBounds(offset: number) {
  const now = new Date()
  const todayStr = toYmd(now)
  const startOfToday = new Date(`${todayStr}T00:00:00`)
  const startOfWeek = new Date(startOfToday)
  const diffToMonday = (startOfWeek.getDay() + 6) % 7
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday + offset * 7)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  return {
    todayStr,
    startOfToday,
    startOfWeek,
    endOfWeek,
    weekStartStr: toYmd(startOfWeek),
    weekEndStr: toYmd(endOfWeek),
  }
}

type DaySession = {
  id: string
  cliente_id: string
  paquete_id: string | null
  fecha_sesion: string
  hora_sesion: string
  estado: string
  clientes: { nombre_completo: string; telefono: string | null }
}

export function WeeklyCalendarWidget() {
  const [offset, setOffset] = useState(0)
  const [sessions, setSessions] = useState<DaySession[]>([])
  const [weekRutinas, setWeekRutinas] = useState<WeekRutinaData[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async (currentOffset: number) => {
    setLoading(true)
    const { weekStartStr, weekEndStr, todayStr } = getWeekBounds(currentOffset)
    const supabase = createClient()

    const rutinaQueryStart = weekStartStr < todayStr ? weekStartStr : todayStr
    const rutinaQueryEnd = weekEndStr > todayStr ? weekEndStr : todayStr

    const [sessionsRes, rutinasRes] = await Promise.all([
      supabase
        .from('sesiones_programadas')
        .select('id, cliente_id, paquete_id, fecha_sesion, hora_sesion, estado, clientes(nombre_completo, telefono)')
        .gte('fecha_sesion', weekStartStr)
        .lte('fecha_sesion', weekEndStr)
        .order('fecha_sesion', { ascending: true })
        .order('hora_sesion', { ascending: true }),

      supabase
        .from('rutinas')
        .select(`
          id, nombre, cliente_id, fecha_inicio, fecha_fin,
          rutina_dias(
            id, orden,
            rutina_ejercicios(
              id, series, repeticiones, peso, modalidad, nombre_custom, orden,
              ejercicios(id, nombre)
            )
          )
        `)
        .lte('fecha_inicio', rutinaQueryEnd)
        .or(`fecha_fin.gte.${rutinaQueryStart},fecha_fin.is.null`),
    ])

    type RawEj = {
      id: string; series: number; repeticiones: string; peso: string | null
      modalidad: string; nombre_custom: string | null; orden: number
      ejercicios: { nombre: string } | null
    }
    type RawDia = { id: string; orden: number; rutina_ejercicios: RawEj[] }
    type RawRutina = {
      id: string; nombre: string; cliente_id: string
      fecha_inicio: string | null; fecha_fin: string | null; rutina_dias: RawDia[]
    }

    const rutinasArr: WeekRutinaData[] = []
    for (const r of (rutinasRes.data ?? []) as unknown as RawRutina[]) {
      const dia = [...(r.rutina_dias ?? [])].sort((a, b) => a.orden - b.orden)[0]
      if (!dia) continue
      rutinasArr.push({
        id: r.id,
        nombre: r.nombre,
        cliente_id: r.cliente_id,
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        ejercicios: [...(dia.rutina_ejercicios ?? [])].sort((a, b) => a.orden - b.orden).map(ej => ({
          id: ej.id,
          nombre: ej.ejercicios?.nombre ?? ej.nombre_custom ?? '—',
          series: ej.series,
          repeticiones: ej.repeticiones,
          peso: ej.peso,
          modalidad: ej.modalidad,
        })),
      })
    }

    setSessions((sessionsRes.data ?? []) as unknown as DaySession[])
    setWeekRutinas(rutinasArr)
    setLoading(false)
  }, [])

  useEffect(() => { loadData(offset) }, [offset, loadData])

  // Refresh calendar when a session is cancelled from within a card
  useEffect(() => {
    const handler = () => loadData(offset)
    window.addEventListener('session-cancelled', handler)
    return () => window.removeEventListener('session-cancelled', handler)
  }, [offset, loadData])

  const { todayStr, startOfToday, startOfWeek, endOfWeek } = getWeekBounds(offset)

  const weekByDay = sessions.reduce<Record<string, DaySession[]>>((acc, s) => {
    acc[s.fecha_sesion] = acc[s.fecha_sesion] || []
    acc[s.fecha_sesion].push(s)
    return acc
  }, {})

  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + idx)
    const key = toYmd(date)
    const weekdayLong = date.toLocaleDateString('es-CL', { weekday: 'long' })
    return {
      key,
      date,
      weekday: weekdayLong.charAt(0).toUpperCase() + weekdayLong.slice(1),
      dateLabel: date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
      sessions: weekByDay[key] || [],
      isToday: key === todayStr,
    }
  })

  const dayPairs: (typeof weekDays)[] = []
  for (let i = 0; i < weekDays.length; i += 2) dayPairs.push(weekDays.slice(i, i + 2))

  const weekLabel = (() => {
    const sameMonth = startOfWeek.getMonth() === endOfWeek.getMonth() && startOfWeek.getFullYear() === endOfWeek.getFullYear()
    const sd = startOfWeek.toLocaleDateString('es-CL', { day: 'numeric' })
    const ed = endOfWeek.toLocaleDateString('es-CL', { day: 'numeric' })
    const sm = startOfWeek.toLocaleDateString('es-CL', { month: 'long' })
    const em = endOfWeek.toLocaleDateString('es-CL', { month: 'long' })
    return sameMonth ? `${sd} al ${ed} de ${sm}` : `${sd} de ${sm} al ${ed} de ${em}`
  })()

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm w-full overflow-hidden">
      <div className="flex flex-col items-center text-center gap-2 w-full">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Calendario semanal</h2>
          <p className="text-xs text-muted-foreground">Desliza para ver los pares de días</p>
        </div>
        <div className="flex items-center justify-center gap-2 bg-muted/60 rounded-full px-2 py-1 shadow-inner w-full max-w-xs">
          <Button
            variant="ghost" size="icon" className="h-9 w-9"
            onClick={() => setOffset(o => o - 1)} aria-label="Semana anterior"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1 px-2 py-1 text-sm font-semibold text-foreground truncate text-center">
            {offset === 0 ? 'Semana actual' : weekLabel}
          </div>
          {offset !== 0 && (
            <Button
              variant="ghost" size="icon" className="h-9 w-9"
              onClick={() => setOffset(0)} aria-label="Volver a semana actual"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost" size="icon" className="h-9 w-9"
            onClick={() => setOffset(o => o + 1)} aria-label="Semana siguiente"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 h-28" />
          ))}
        </div>
      ) : (
        <div className="mt-4 w-full overflow-x-auto pb-3 snap-x snap-mandatory space-y-3 px-1">
          {dayPairs.map((pair, pairIdx) => (
            <div key={`pair-${pairIdx}`} className="grid min-w-full grid-cols-2 gap-3 snap-center">
              {pair.map((day) => (
                <div
                  key={day.key}
                  className={`relative rounded-2xl border p-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col gap-2 w-full ${
                    day.isToday
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 bg-gradient-to-b from-white to-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-2xl font-bold leading-none text-foreground">{day.weekday}</p>
                    <p className="text-sm font-medium text-muted-foreground">{day.dateLabel}</p>
                  </div>

                  {day.sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin sesiones</p>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
                      {day.sessions.map((s) => (
                        <CalendarSessionCard
                          key={s.id}
                          session={s}
                          weekRutinas={weekRutinas}
                          canCancelFuture={day.date >= startOfToday && s.estado === 'programada'}
                          onCancelled={() => loadData(offset)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {pair.length === 1 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
