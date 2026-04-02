"use client"

import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { createClient } from '@/lib/supabase/client'
import { formatEvaluationDate } from '@/lib/evaluation-date'

export default function MoreEvaluationsModal({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (open: boolean) => void; onSelect?: (evaluation: any) => void }) {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    if (!open) return
    let mounted = true
    async function loadMonth() {
      setLoading(true)
      try {
        const supabase = createClient()
        const now = new Date()
        const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        const { data: evals, error } = await supabase
          .from('evaluaciones')
          .select('*')
          .gte('fecha', first)
          .lte('fecha', last)
          .order('fecha', { ascending: false })
          .order('id', { ascending: false })

        if (error) {
          setItems([])
          setLoading(false)
          return
        }

        if (!evals || evals.length === 0) {
          setItems([])
          setLoading(false)
          return
        }

        // fetch client names
        const clientIds = Array.from(new Set(evals.map((e: any) => e.cliente_id).filter(Boolean)))
        let map: Record<string, string> = {}
        if (clientIds.length > 0) {
          const { data: clients } = await supabase.from('clientes').select('id,nombre_completo').in('id', clientIds)
          clients?.forEach((c: any) => (map[c.id] = c.nombre_completo))
        }

        if (mounted) {
          // Ensure items are ordered by fecha desc
          const sorted = [...evals].sort((a: any, b: any) => {
            const da = a?.fecha ? new Date(a.fecha).getTime() : 0
            const db = b?.fecha ? new Date(b.fecha).getTime() : 0
            if (db - da !== 0) return db - da
            return (b.id ?? 0) - (a.id ?? 0)
          })
          setItems(sorted.map((ev: any) => ({ ...ev, clientName: map[ev.cliente_id] ?? '—' })))
        }
      } catch (err) {
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    loadMonth()
    return () => { mounted = false }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Evaluaciones del mes</DialogTitle>
        <div className="space-y-3">
          {loading && <div>Cargando...</div>}
          {!loading && items.length === 0 && <div className="text-sm text-muted-foreground">No hay evaluaciones este mes.</div>}
          <div className="grid gap-2">
            {items.map(it => (
              <div key={it.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <div className="font-medium">{it.clientName}</div>
                  <div className="text-xs text-muted-foreground">{formatEvaluationDate(it.fecha) === '—' ? '' : formatEvaluationDate(it.fecha)}</div>
                </div>
                <div>
                  <Button variant="ghost" onClick={() => { if (onSelect) onSelect(it); onOpenChange(false) }}>Ver detalle</Button>
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
