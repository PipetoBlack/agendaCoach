"use client"

import React from 'react'

import DeleteEvaluationButton from '@/components/delete-evaluation-button'
import EvaluationDetailModal from '@/components/evaluation-detail-modal'
import EvaluationFormDialog from '@/components/evaluation-form-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { formatEvaluationDate } from '@/lib/evaluation-date'
import { Eye, History, Pencil } from 'lucide-react'
import { toast } from 'sonner'

type EvaluationRecord = {
  id: string | number
  cliente_id?: string | null
  fecha?: string | null
  creado_en?: string | null
  imc?: number | null
  categoria_imc?: string | null
  objetivo?: string | null
  [key: string]: any
}

const PAGE_SIZE = 5

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

export default function ClientEvaluationHistoryDialog({
  clientId,
  clientName,
  clientGender,
  clientBirthdate,
  onEvaluationsChanged,
}: {
  clientId?: string
  clientName?: string
  clientGender?: string
  clientBirthdate?: string
  onEvaluationsChanged?: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [evaluations, setEvaluations] = React.useState<EvaluationRecord[]>([])
  const [totalCount, setTotalCount] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [selectedEvaluation, setSelectedEvaluation] = React.useState<EvaluationRecord | null>(null)
  const [editingEvaluation, setEditingEvaluation] = React.useState<EvaluationRecord | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  React.useEffect(() => {
    if (!open || !clientId) return

    let active = true

    async function loadEvaluations() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const from = (page - 1) * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        const { data, error: queryError, count } = await supabase
          .from('evaluaciones')
          .select('*', { count: 'exact' })
          .eq('cliente_id', clientId)
          .order('fecha', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to)

        if (queryError) throw queryError

        if (!active) return

        setEvaluations((data ?? []) as EvaluationRecord[])
        setTotalCount(count ?? 0)
      } catch (err) {
        if (!active) return
        setEvaluations([])
        setTotalCount(0)
        setError(err instanceof Error ? err.message : 'No se pudo cargar el historial de evaluaciones.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadEvaluations()

    return () => {
      active = false
    }
  }, [clientId, open, page, reloadKey])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  async function handleDeleteEvaluation(evaluation: EvaluationRecord) {
    const supabase = createClient()
    const { error: deleteError } = await supabase.from('evaluaciones').delete().eq('id', evaluation.id)

    if (deleteError) {
      throw deleteError
    }

    toast.success('Evaluación eliminada')

    if (selectedEvaluation?.id === evaluation.id) {
      setSelectedEvaluation(null)
    }

    const remainingCount = Math.max(totalCount - 1, 0)
    const nextTotalPages = Math.max(1, Math.ceil(remainingCount / PAGE_SIZE))
    setPage((currentPage) => Math.min(currentPage, nextTotalPages))
    setReloadKey((currentKey) => currentKey + 1)
    onEvaluationsChanged?.()
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (nextOpen) {
            setPage(1)
          } else {
            setSelectedEvaluation(null)
            setEditingEvaluation(null)
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 px-3 leading-none">
            <History className="mr-1.5 h-4 w-4" /> Historial
          </Button>
        </DialogTrigger>

        <DialogContent className="w-[95vw] max-w-3xl sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Historial de evaluaciones</DialogTitle>
            <DialogDescription>
              {clientName ?? 'Este cliente'} registra {totalCount} evaluacion{totalCount === 1 ? '' : 'es'} en total.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-xl border bg-muted/30" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : evaluations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                Este cliente todavía no tiene evaluaciones registradas.
              </div>
            ) : (
              <div className="grid max-h-[52vh] gap-2 overflow-y-auto pr-1">
                {evaluations.map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className="rounded-xl border border-border/60 bg-background/80 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{clientName ?? 'Cliente'}</div>
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="text-muted-foreground">
                            Evaluada: {formatEvaluationDate(evaluation.fecha ?? null)}
                          </div>
                          <div className="font-medium text-primary">
                            Registrada: {formatRegistrationDate(evaluation.creado_en ?? null)}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedEvaluation(evaluation)}
                          aria-label="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver detalle</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingEvaluation(evaluation)}
                          aria-label="Editar evaluación"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar evaluación</span>
                        </Button>
                        <DeleteEvaluationButton
                          evaluation={evaluation}
                          clientName={clientName}
                          onConfirm={handleDeleteEvaluation}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && totalCount > PAGE_SIZE ? (
              <div className="flex items-center justify-between gap-3 pt-1 text-sm">
                <div className="text-muted-foreground">
                  Página {page} de {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <EvaluationFormDialog
        open={!!editingEvaluation}
        onClose={() => setEditingEvaluation(null)}
        onSaved={() => {
          setReloadKey((currentKey) => currentKey + 1)
          onEvaluationsChanged?.()
        }}
        evaluation={editingEvaluation}
      />

      <EvaluationDetailModal
        open={!!selectedEvaluation}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedEvaluation(null)
        }}
        evaluation={selectedEvaluation}
        clientName={clientName}
        clientGender={clientGender}
        clientBirthdate={clientBirthdate}
      />
    </>
  )
}