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
      const da = a?.fecha ? new Date(a.fecha).getTime() : 0
      const db = b?.fecha ? new Date(b.fecha).getTime() : 0
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

      const { data: evals, error } = await supabase
        .from('evaluaciones')
        .select('*')
        .order('fecha', { ascending: false })
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

      // Ensure evaluations are ordered by fecha desc (más recientes primero)
      const sorted = [...evals].sort((a: any, b: any) => {
        const da = a?.fecha ? new Date(a.fecha).getTime() : 0
        const db = b?.fecha ? new Date(b.fecha).getTime() : 0
        if (db - da !== 0) return db - da
        // tie-break by id (newer id first)
        return (b.id ?? 0) - (a.id ?? 0)
      })

      setEvaluations(sorted)

      const clientIds = Array.from(new Set(evals.map((e: any) => e.cliente_id).filter(Boolean)))
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('clientes')
          .select('id,nombre_completo,genero,fecha_nacimiento')
          .in('id', clientIds)

        const map: Record<string, { name: string; genero?: string; fecha_nacimiento?: string }> = {}
        clients?.forEach((c: any) => (map[c.id] = { name: c.nombre_completo, genero: c.genero, fecha_nacimiento: c.fecha_nacimiento }))
        setClientsMap(map)
      }
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
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">Registra IMC, masa muscular, grasa visceral, agua corporal y perímetros. Guarda y consulta el progreso con una vista simple.</p>
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
          <span className="text-xs text-muted-foreground">Ordenadas por más recientes</span>
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
