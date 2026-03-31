"use client"
import { useState, useEffect } from 'react'
import EvaluationFormDialog from '@/components/evaluation-form-dialog'
import { Button } from '@/components/ui/button'
import EvaluationPreviewCard from '@/components/evaluation-preview-card'
import EvaluationDetailModal from '@/components/evaluation-detail-modal'
import MoreEvaluationsModal from '@/components/more-evaluations-modal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function EvaluacionPage() {
  const [open, setOpen] = useState(false)
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [clientsMap, setClientsMap] = useState<Record<string, { name: string; genero?: string; fecha_nacimiento?: string }>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvaluation, setSelectedEvaluation] = useState<any | null>(null)
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null)
  const [selectedClientGender, setSelectedClientGender] = useState<string | undefined>(undefined)
  const [editingEvaluation, setEditingEvaluation] = useState<any | null>(null)
  const [showMore, setShowMore] = useState(false)

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

      setEvaluations(evals)

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
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Evaluación de composición corporal</h1>
        <p className="text-sm text-muted-foreground mt-1">Registra fácilmente los datos clave de tus alumnos: IMC, masa muscular, grasa visceral, agua corporal y perímetros. Al finalizar, guarda la evaluación para llevar un seguimiento completo de su progreso.</p>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <Button onClick={() => setOpen(true)}>Crear evaluación</Button>
      </div>

      <EvaluationFormDialog open={open} onClose={() => { setOpen(false); setEditingEvaluation(null) }} evaluation={editingEvaluation} onSaved={() => { loadLatest(); setEditingEvaluation(null) }} />

      {/* Detail modal */}
      <EvaluationDetailModal open={!!selectedEvaluation} onOpenChange={(v) => { if (!v) setSelectedEvaluation(null); else {/*noop*/} }} evaluation={selectedEvaluation} clientName={selectedClientName} clientGender={selectedClientGender} />

      {/* More modal */}
      <MoreEvaluationsModal open={showMore} onOpenChange={(v) => setShowMore(v)} onSelect={(ev) => { setSelectedEvaluation(ev); setSelectedClientName(clientsMap[ev.cliente_id]?.name ?? '—'); setShowMore(false) }} />

      <h2 className="text-lg font-semibold mb-3">Últimas 3 evaluaciones ingresadas</h2>
      {loading && <div>Cargando...</div>}
      {!loading && evaluations.length === 0 && <div className="text-sm text-muted-foreground">No hay evaluaciones registradas aún.</div>}

      <div className="grid grid-cols-1 gap-3">
        {evaluations.map((ev: any) => (
          <EvaluationPreviewCard
            key={ev.id}
            evaluation={ev}
            clientName={clientsMap[ev.cliente_id]?.name ?? '—'}
            onView={(e) => { setSelectedEvaluation(e); setSelectedClientName(clientsMap[e.cliente_id]?.name ?? '—'); setSelectedClientGender(clientsMap[e.cliente_id]?.genero ?? undefined) }}
            onEdit={(e) => { setEditingEvaluation(e); setOpen(true) }}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <div className="mt-6">
        <Button onClick={() => setShowMore(true)}>Ver más</Button>
      </div>
    </div>
  )
}
