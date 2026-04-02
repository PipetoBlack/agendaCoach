import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { formatEvaluationDate } from '@/lib/evaluation-date'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function HistorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: clients } = await supabase.from('clientes').select('id,nombre_completo').eq('usuario_id', user.id)
  const clientIds = (clients || []).map((c: any) => c.id)

  const { data: evaluations } = await supabase
    .from('evaluaciones')
    .select('*')
    .in('cliente_id', clientIds)
    .order('fecha', { ascending: false })
    .order('id', { ascending: false })

  const clientsMap: Record<string, string> = {}
  (clients || []).forEach((c: any) => (clientsMap[c.id] = c.nombre_completo))

  // Ensure evaluations are sorted by fecha desc
  const sortedEvals = (evaluations || []).slice().sort((a: any, b: any) => {
      const da = a?.fecha ? new Date(a.fecha).getTime() : 0
      const db = b?.fecha ? new Date(b.fecha).getTime() : 0
      if (db - da !== 0) return db - da
      return (b.id ?? 0) - (a.id ?? 0)
    })

  const grouped: Record<string, any[]> = {}
  ;sortedEvals.forEach((ev: any) => {
    const key = formatEvaluationDate(ev.fecha, 'es-ES', { month: 'long', year: 'numeric' })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(ev)
  })

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Historial de evaluaciones</h1>
      {Object.keys(grouped).length === 0 && <div>No hay evaluaciones registradas.</div>}

      {Object.entries(grouped).map(([month, list]) => (
        <section key={month} className="mb-6">
          <h2 className="text-lg font-semibold mb-3">{month}</h2>
          <div className="grid gap-3">
            {list.map((ev: any) => (
              <div key={ev.id} className="border rounded p-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold">{clientsMap[ev.cliente_id] ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{formatEvaluationDate(ev.fecha) === '—' ? '' : formatEvaluationDate(ev.fecha)}</div>
                </div>
                <div>
                  <Link href={`/evaluacion/${ev.id}`} className="text-sm font-medium text-primary">Ver detalle</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
