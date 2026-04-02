"use client"
import { useState, useEffect, useMemo } from 'react'
import EvaluationFormDialog from '@/components/evaluation-form-dialog'
import { Button } from '@/components/ui/button'
import EvaluationPreviewCard from '@/components/evaluation-preview-card'
import EvaluationDetailModal from '@/components/evaluation-detail-modal'
import MoreEvaluationsModal from '@/components/more-evaluations-modal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { History, Plus } from 'lucide-react'

function getEvaluationRegistrationTime(evaluation: any) {
  const registeredAt = evaluation?.creado_en ? new Date(evaluation.creado_en).getTime() : 0
  if (Number.isFinite(registeredAt) && registeredAt > 0) return registeredAt
  return 0
}

export default function EvaluacionPage() {
  const [open, setOpen] = useState(false)
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [clientsMap, setClientsMap] = useState<Record<string, { name: string; genero?: string; fecha_nacimiento?: string }>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvaluation, setSelectedEvaluation] = useState<any | null>(null)
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null)
  const [selectedClientGender, setSelectedClientGender] = useState<string | undefined>(undefined)
  const [selectedClientBirthdate, setSelectedClientBirthdate] = useState<string | undefined>(undefined)
  const [editingEvaluation, setEditingEvaluation] = useState<any | null>(null)
  const [showMore, setShowMore] = useState(false)

  const sortedEvaluations = useMemo(() => {
    return evaluations.slice().sort((a: any, b: any) => {
      const da = getEvaluationRegistrationTime(a)
      const db = getEvaluationRegistrationTime(b)
      if (db - da !== 0) return db - da
      return (b.id ?? 0) - (a.id ?? 0)
    })
  }, [evaluations])

  async function loadLatest() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Usuario no autenticado')
        setLoading(false)
        return
      }

      const { data: clients, error: clientsError } = await supabase
        .from('clientes')
        .select('id,nombre_completo,genero,fecha_nacimiento')
        .eq('usuario_id', user.id)
        .order('nombre_completo')

      if (clientsError) {
        setError(clientsError.message)
        setLoading(false)
        return
      }

      const clientIds = Array.from(new Set((clients ?? []).map((client: any) => client.id).filter(Boolean)))

      const map: Record<string, { name: string; genero?: string; fecha_nacimiento?: string }> = {}
      clients?.forEach((client: any) => {
        map[client.id] = {
          name: client.nombre_completo,
          genero: client.genero,
          fecha_nacimiento: client.fecha_nacimiento,
        }
      })
      setClientsMap(map)

      if (clientIds.length === 0) {
        setEvaluations([])
        setLoading(false)
        return
      }

      const { data: evals, error } = await supabase
        .from('evaluaciones')
        .select('*')
        .in('cliente_id', clientIds)
        .order('creado_en', { ascending: false })
        .order('id', { ascending: false })
        .limit(3)

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (!evals || evals.length === 0) {
        setEvaluations([])
        setLoading(false)
        return
      }

      // Ensure evaluations are ordered by registration date desc (últimos ingresos primero)
      const sorted = [...evals].sort((a: any, b: any) => {
        const da = getEvaluationRegistrationTime(a)
        const db = getEvaluationRegistrationTime(b)
        if (db - da !== 0) return db - da
        return (b.id ?? 0) - (a.id ?? 0)
      })

      setEvaluations(sorted)
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(evaluation: any) {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('evaluaciones').delete().eq('id', evaluation.id)
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }
      toast.success('Evaluación eliminada')
      if (selectedEvaluation?.id === evaluation.id) setSelectedEvaluation(null)
      await loadLatest()
    } catch (err: any) {
      toast.error(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    // call loadLatest on mount
    loadLatest()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl border bg-gradient-to-r from-emerald-50 to-white p-5 shadow-sm">
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Evaluación de composición corporal</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">Mantén el seguimiento del progreso físico de tus alumnos: guarda y consulta métricas en esta sección o en Gestión de Clientes.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear evaluación
            </Button>
            <Button variant="outline" onClick={() => setShowMore(true)} className="gap-2">
              <History className="h-4 w-4" />
              Historial
            </Button>
          </div>
        </div>
      </div>

      <EvaluationFormDialog open={open} onClose={() => { setOpen(false); setEditingEvaluation(null) }} evaluation={editingEvaluation} onSaved={() => { loadLatest(); setEditingEvaluation(null) }} />

      {/* Detail modal */}
      <EvaluationDetailModal open={!!selectedEvaluation} onOpenChange={(v) => { if (!v) setSelectedEvaluation(null); else {/*noop*/} }} evaluation={selectedEvaluation} clientName={selectedClientName} clientGender={selectedClientGender} clientBirthdate={selectedClientBirthdate} />

      {/* More modal */}
      <MoreEvaluationsModal open={showMore} onOpenChange={(v) => setShowMore(v)} onSelect={(ev) => { setSelectedEvaluation(ev); setSelectedClientName(clientsMap[ev.cliente_id]?.name ?? '—'); setSelectedClientGender(clientsMap[ev.cliente_id]?.genero ?? undefined); setSelectedClientBirthdate(clientsMap[ev.cliente_id]?.fecha_nacimiento ?? undefined); setShowMore(false) }} />

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Últimas evaluaciones</h2>
          <span className="text-xs text-muted-foreground">Muestra las 3 evaluaciones registradas más recientemente</span>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">{error}</div>}

        {loading && (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-24 rounded-xl border bg-muted/30 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && evaluations.length === 0 && !error && (
          <div className="text-sm text-muted-foreground border rounded-xl p-4 bg-muted/20">Aún no hay evaluaciones cargadas.</div>
        )}

        {!loading && evaluations.length > 0 && (
          <div className="grid grid-cols-1 gap-3">
            {sortedEvaluations.map((ev: any) => (
              <EvaluationPreviewCard
                key={ev.id}
                evaluation={ev}
                clientName={clientsMap[ev.cliente_id]?.name ?? '—'}
                onView={(e) => { setSelectedEvaluation(e); setSelectedClientName(clientsMap[e.cliente_id]?.name ?? '—'); setSelectedClientGender(clientsMap[e.cliente_id]?.genero ?? undefined); setSelectedClientBirthdate(clientsMap[e.cliente_id]?.fecha_nacimiento ?? undefined) }}
                onEdit={(e) => { setEditingEvaluation(e); setOpen(true) }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
