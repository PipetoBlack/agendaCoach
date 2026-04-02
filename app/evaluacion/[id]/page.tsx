import React from 'react'
import { formatEvaluationDate } from '@/lib/evaluation-date'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function EvaluationDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: evaluation } = await supabase.from('evaluaciones').select('*').eq('id', params.id).limit(1).single()
  if (!evaluation) return <div className="max-w-3xl mx-auto py-8">Evaluación no encontrada.</div>

  const { data: client } = await supabase.from('clientes').select('nombre_completo').eq('id', evaluation.cliente_id).single()

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">Detalle de evaluación</h1>

      <div className="border rounded p-4 bg-card">
        <div className="mb-2"><strong>Cliente:</strong> {client?.nombre_completo ?? '—'}</div>
        <div className="mb-2"><strong>Fecha:</strong> {formatEvaluationDate(evaluation.fecha)}</div>

        <div className="grid grid-cols-2 gap-3">
          <div><strong>IMC:</strong> {evaluation.imc ?? '—'}</div>
          <div><strong>Categoría IMC:</strong> {evaluation.categoria_imc ?? '—'}</div>
          <div><strong>% Grasa:</strong> {evaluation.porcentaje_grasa ?? '—'}</div>
          <div><strong>Masa muscular (kg):</strong> {evaluation.masa_muscular ?? '—'}</div>
          <div><strong>Masa libre de grasa (kg):</strong> {evaluation.masa_libre_grasa ?? evaluation.masa_grasa ?? '—'}</div>
          <div><strong>Agua corporal (L):</strong> {evaluation.agua_corporal ?? '—'}</div>
          <div><strong>Grasa visceral:</strong> {evaluation.grasa_visceral ?? '—'}</div>
          <div><strong>Cintura (cm):</strong> {evaluation.cintura ?? '—'}</div>
          <div><strong>Cadera (cm):</strong> {evaluation.cadera ?? '—'}</div>
          <div><strong>ICC:</strong> {evaluation.icc ?? '—'}</div>
          <div><strong>ICE:</strong> {evaluation.ice ?? '—'}</div>
          <div className="col-span-2"><strong>Objetivo:</strong> {evaluation.objetivo ?? '—'}</div>
          <div className="col-span-2"><strong>Patologías:</strong> {evaluation.patologias ?? '—'}</div>
          <div className="col-span-2"><strong>Meta:</strong> {evaluation.meta ?? '—'}</div>
        </div>

        {evaluation.pliegues && (
          <div className="mt-4">
            <strong>Pliegues (mm):</strong>
            <div>Bicipital: {evaluation.pliegues.bicipital ?? '—'}</div>
            <div>Tricipital: {evaluation.pliegues.tricipital ?? '—'}</div>
            <div>Subescapular: {evaluation.pliegues.subescapular ?? '—'}</div>
            <div>Suprailiaco: {evaluation.pliegues.suprailiaco ?? '—'}</div>
          </div>
        )}
      </div>
    </div>
  )
}
