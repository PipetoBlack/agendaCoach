'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Rutinas ──────────────────────────────────────────────────────────────────

export async function createRutina(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const clienteId = formData.get('clienteId') as string
  const nombre = (formData.get('nombre') as string)?.trim()
  const fechaInicio = formData.get('fechaInicio') as string
  const fechaFin = formData.get('fechaFin') as string

  if (!clienteId || !nombre || !fechaInicio || !fechaFin) return { error: 'Faltan campos' }

  const { data, error } = await supabase
    .from('rutinas')
    .insert({ usuario_id: user.id, cliente_id: clienteId, nombre, fecha_inicio: fechaInicio, fecha_fin: fechaFin })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/rutinas/${clienteId}`)
  return { id: data.id }
}

export async function deleteRutina(rutinaId: string, clienteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('rutinas')
    .delete()
    .eq('id', rutinaId)
    .eq('usuario_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/rutinas/${clienteId}`)
  return { ok: true }
}

// ── Rutina Días ──────────────────────────────────────────────────────────────

export async function createRutinaDia(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const rutinaId = formData.get('rutinaId') as string
  const clienteId = formData.get('clienteId') as string
  const nombre = (formData.get('nombre') as string)?.trim()
  const tipo = formData.get('tipo') as string
  const foco = formData.get('foco') as string

  if (!rutinaId || !nombre || !tipo || !foco) return { error: 'Faltan campos' }

  // Verificar que la rutina pertenece al usuario
  const { data: rutina } = await supabase
    .from('rutinas')
    .select('id')
    .eq('id', rutinaId)
    .eq('usuario_id', user.id)
    .single()

  if (!rutina) return { error: 'Rutina no encontrada' }

  const { data: diasExistentes } = await supabase
    .from('rutina_dias')
    .select('orden')
    .eq('rutina_id', rutinaId)
    .order('orden', { ascending: false })
    .limit(1)

  const orden = diasExistentes?.[0]?.orden != null ? diasExistentes[0].orden + 1 : 0

  const { error } = await supabase
    .from('rutina_dias')
    .insert({ rutina_id: rutinaId, nombre, tipo, foco, orden })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/rutinas/${clienteId}/${rutinaId}`)
  return { ok: true }
}

export async function deleteRutinaDia(diaId: string, rutinaId: string, clienteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('rutina_dias')
    .delete()
    .eq('id', diaId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/rutinas/${clienteId}/${rutinaId}`)
  return { ok: true }
}

// ── Rutina Ejercicios ────────────────────────────────────────────────────────

export async function addEjercicioToDia(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const rutinaDiaId = formData.get('rutinaDiaId') as string
  const rutinaId = formData.get('rutinaId') as string
  const clienteId = formData.get('clienteId') as string
  const ejercicioId = (formData.get('ejercicioId') as string) || null
  const nombreCustom = (formData.get('nombreCustom') as string)?.trim() || null
  const series = parseInt(formData.get('series') as string) || 3
  const repeticiones = (formData.get('repeticiones') as string)?.trim() || '10'
  const peso = (formData.get('peso') as string)?.trim() || null
  const descansoSegundos = parseInt(formData.get('descansoSegundos') as string) || 60

  if (!rutinaDiaId) return { error: 'Faltan campos' }
  if (!ejercicioId && !nombreCustom) return { error: 'Selecciona un ejercicio o escribe uno personalizado' }

  const { data: ordenData } = await supabase
    .from('rutina_ejercicios')
    .select('orden')
    .eq('rutina_dia_id', rutinaDiaId)
    .order('orden', { ascending: false })
    .limit(1)

  const orden = ordenData?.[0]?.orden != null ? ordenData[0].orden + 1 : 0

  const { error } = await supabase
    .from('rutina_ejercicios')
    .insert({
      rutina_dia_id: rutinaDiaId,
      ejercicio_id: ejercicioId,
      nombre_custom: nombreCustom,
      series,
      repeticiones,
      peso,
      descanso_segundos: descansoSegundos,
      orden,
    })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/rutinas/${clienteId}/${rutinaId}`)
  return { ok: true }
}

export async function removeEjercicioDeDia(ejercicioRutinaId: string, rutinaId: string, clienteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('rutina_ejercicios')
    .delete()
    .eq('id', ejercicioRutinaId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/rutinas/${clienteId}/${rutinaId}`)
  return { ok: true }
}

// ── Ejercicios Custom ────────────────────────────────────────────────────────

export async function createEjercicioCustom(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const nombre = (formData.get('nombre') as string)?.trim()
  const categoria = formData.get('categoria') as string
  const grupo_muscular = formData.get('grupo_muscular') as string
  const foco = formData.get('foco') as string

  if (!nombre || !categoria || !grupo_muscular || !foco) return { error: 'Faltan campos' }

  const { data, error } = await supabase
    .from('ejercicios')
    .insert({ usuario_id: user.id, nombre, categoria, grupo_muscular, foco, es_global: false })
    .select('id, nombre')
    .single()

  if (error) return { error: error.message }

  return { id: data.id, nombre: data.nombre }
}
