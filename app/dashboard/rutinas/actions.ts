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

// ── Plantillas (rutinas sin cliente) ─────────────────────────────────────────

type EjercicioPlantilla = {
  ejercicioId: string | null
  nombreCustom: string | null
  series: number
  repeticiones: string
  peso: string
  descansoSegundos: number
  modalidad: string
  descansoSerie: number | null
}

type DiaPlantilla = {
  nombre: string
  tipo: string
  foco: string
  ejercicios: EjercicioPlantilla[]
}

export async function createPlantillaCompleta(data: {
  nombre: string
  nivel: string
  notas: string
  dias: DiaPlantilla[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: rutina, error: rutinaError } = await supabase
    .from('rutinas')
    .insert({
      usuario_id: user.id,
      cliente_id: null,
      nombre: data.nombre.trim(),
      nivel: data.nivel || null,
      notas: data.notas?.trim() || null,
      fecha_inicio: null,
      fecha_fin: null,
    })
    .select('id')
    .single()

  if (rutinaError) return { error: rutinaError.message }

  for (let i = 0; i < data.dias.length; i++) {
    const dia = data.dias[i]
    const { data: rutinaDia, error: diaError } = await supabase
      .from('rutina_dias')
      .insert({ rutina_id: rutina.id, nombre: dia.nombre, tipo: dia.tipo, foco: dia.foco, orden: i })
      .select('id')
      .single()

    if (diaError) return { error: diaError.message }

    if (dia.ejercicios.length > 0) {
      const { error: ejError } = await supabase
        .from('rutina_ejercicios')
        .insert(
          dia.ejercicios.map((ej, idx) => ({
            rutina_dia_id: rutinaDia.id,
            ejercicio_id: ej.ejercicioId || null,
            nombre_custom: ej.nombreCustom || null,
            series: ej.series,
            repeticiones: ej.repeticiones,
            peso: ej.peso || null,
            descanso_segundos: ej.descansoSegundos,
            modalidad: ej.modalidad ?? 'repeticion',
            descanso_serie: ej.descansoSerie ?? null,
            orden: idx,
          }))
        )
      if (ejError) return { error: ejError.message }
    }
  }

  revalidatePath('/dashboard/rutinas')
  return { id: rutina.id }
}

export async function updatePlantillaCompleta(plantillaId: string, data: {
  nombre: string
  nivel: string
  notas: string
  tipo: string
  diaId: string | null
  ejerciciosToRemove: string[]
  ejerciciosToAdd: Array<{
    ejercicioId: string | null
    nombreCustom: string | null
    series: number
    repeticiones: string
    peso: string
    descansoSegundos: number
    modalidad: string
    descansoSerie: number | null
  }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error: rutinaError } = await supabase
    .from('rutinas')
    .update({ nombre: data.nombre.trim(), nivel: data.nivel || null, notas: data.notas?.trim() || null })
    .eq('id', plantillaId)
    .eq('usuario_id', user.id)
    .is('cliente_id', null)
  if (rutinaError) return { error: rutinaError.message }

  if (data.tipo && data.diaId) {
    const { error: diaError } = await supabase
      .from('rutina_dias').update({ tipo: data.tipo }).eq('id', data.diaId)
    if (diaError) return { error: diaError.message }
  }

  if (data.ejerciciosToRemove.length > 0) {
    const { error } = await supabase
      .from('rutina_ejercicios').delete().in('id', data.ejerciciosToRemove)
    if (error) return { error: error.message }
  }

  if (data.ejerciciosToAdd.length > 0 && data.diaId) {
    const { data: ordenData } = await supabase
      .from('rutina_ejercicios').select('orden').eq('rutina_dia_id', data.diaId)
      .order('orden', { ascending: false }).limit(1)
    const baseOrden = ordenData?.[0]?.orden != null ? ordenData[0].orden + 1 : 0
    const { error } = await supabase.from('rutina_ejercicios').insert(
      data.ejerciciosToAdd.map((ej, idx) => ({
        rutina_dia_id: data.diaId!,
        ejercicio_id: ej.ejercicioId || null,
        nombre_custom: ej.nombreCustom || null,
        series: ej.series,
        repeticiones: ej.repeticiones,
        peso: ej.peso || null,
        descanso_segundos: ej.descansoSegundos,
        modalidad: ej.modalidad ?? 'repeticion',
        descanso_serie: ej.descansoSerie ?? null,
        orden: baseOrden + idx,
      }))
    )
    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard/rutinas')
  return { ok: true }
}

export async function updatePlantilla(plantillaId: string, data: {
  nombre: string
  nivel: string
  notas: string
  tipo: string
  diaId: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('rutinas')
    .update({ nombre: data.nombre.trim(), nivel: data.nivel || null, notas: data.notas?.trim() || null })
    .eq('id', plantillaId)
    .eq('usuario_id', user.id)
    .is('cliente_id', null)

  if (error) return { error: error.message }

  if (data.tipo && data.diaId) {
    await supabase.from('rutina_dias').update({ tipo: data.tipo }).eq('id', data.diaId)
  }

  revalidatePath('/dashboard/rutinas')
  return { ok: true }
}

export async function deletePlantilla(plantillaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('rutinas')
    .delete()
    .eq('id', plantillaId)
    .eq('usuario_id', user.id)
    .is('cliente_id', null)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/rutinas')
  return { ok: true }
}

// ── Asignar plantilla a cliente ──────────────────────────────────────────────

export async function asignarPlantillaACliente(data: {
  plantillaId: string
  clienteId: string
  fechaInicio: string
  fechaFin: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: plantillaRaw } = await supabase
    .from('rutinas')
    .select(`
      nombre, nivel, notas,
      rutina_dias(
        nombre, tipo, foco, orden,
        rutina_ejercicios(
          ejercicio_id, nombre_custom, series, repeticiones, peso, descanso_segundos, modalidad, descanso_serie, orden
        )
      )
    `)
    .eq('id', data.plantillaId)
    .eq('usuario_id', user.id)
    .is('cliente_id', null)
    .single()

  if (!plantillaRaw) return { error: 'Plantilla no encontrada' }

  type EjData = { ejercicio_id: string | null; nombre_custom: string | null; series: number; repeticiones: string; peso: string | null; descanso_segundos: number; modalidad: string; descanso_serie: number | null; orden: number }
  type DiaData = { nombre: string; tipo: string; foco: string; orden: number; rutina_ejercicios: EjData[] }
  type PlantillaData = { nombre: string; nivel: string | null; notas: string | null; rutina_dias: DiaData[] }
  const plantilla = plantillaRaw as unknown as PlantillaData

  const { data: nuevaRutina, error: rutinaError } = await supabase
    .from('rutinas')
    .insert({
      usuario_id: user.id,
      cliente_id: data.clienteId,
      nombre: plantilla.nombre,
      nivel: plantilla.nivel,
      notas: plantilla.notas,
      fecha_inicio: data.fechaInicio,
      fecha_fin: data.fechaFin,
    })
    .select('id')
    .single()

  if (rutinaError) return { error: rutinaError.message }

  for (const dia of plantilla.rutina_dias ?? []) {
    const { data: nuevoDia, error: diaError } = await supabase
      .from('rutina_dias')
      .insert({ rutina_id: nuevaRutina.id, nombre: dia.nombre, tipo: dia.tipo, foco: dia.foco, orden: dia.orden })
      .select('id')
      .single()

    if (diaError) return { error: diaError.message }

    const ejercicios = dia.rutina_ejercicios ?? []
    if (ejercicios.length > 0) {
      const { error: ejError } = await supabase
        .from('rutina_ejercicios')
        .insert(ejercicios.map(ej => ({
          rutina_dia_id: nuevoDia.id,
          ejercicio_id: ej.ejercicio_id || null,
          nombre_custom: ej.nombre_custom || null,
          series: ej.series,
          repeticiones: ej.repeticiones,
          peso: ej.peso || null,
          descanso_segundos: ej.descanso_segundos,
          modalidad: ej.modalidad ?? 'repeticion',
          descanso_serie: ej.descanso_serie ?? null,
          orden: ej.orden,
        })))
      if (ejError) return { error: ejError.message }
    }
  }

  revalidatePath(`/dashboard/rutinas/${data.clienteId}`)
  return { id: nuevaRutina.id }
}

// ── Biblioteca de ejercicios propios ─────────────────────────────────────────

export async function createEjercicioPropio(data: { nombre: string; grupo_muscular: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('ejercicios').insert({
    usuario_id: user.id,
    nombre: data.nombre,
    grupo_muscular: data.grupo_muscular,
    categoria: 'funcional',
    foco: 'general',
    es_global: false,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/rutinas')
  return { error: null }
}

export async function deleteEtiquetaCustom(grupoMuscular: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('ejercicios')
    .delete()
    .eq('usuario_id', user.id)
    .eq('grupo_muscular', grupoMuscular)
    .eq('es_global', false)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/rutinas')
  return { error: null }
}

export async function deleteEjercicioPropio(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('ejercicios')
    .delete()
    .eq('id', id)
    .eq('usuario_id', user.id)
    .eq('es_global', false)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/rutinas')
  return { error: null }
}

// ── Sesión personalizada para cliente ────────────────────────────────────────

export async function crearSesionPersonalizada(data: {
  clienteId: string
  fechaInicio: string
  fechaFin: string
  nombre: string
  nivel: string
  notas: string
  tipo: string
  ejercicios: EjercicioPlantilla[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: rutina, error: rutinaError } = await supabase
    .from('rutinas')
    .insert({
      usuario_id: user.id,
      cliente_id: data.clienteId,
      nombre: data.nombre.trim(),
      nivel: data.nivel || null,
      notas: data.notas?.trim() || null,
      fecha_inicio: data.fechaInicio,
      fecha_fin: data.fechaFin,
    })
    .select('id')
    .single()

  if (rutinaError) return { error: rutinaError.message }

  const { data: dia, error: diaError } = await supabase
    .from('rutina_dias')
    .insert({ rutina_id: rutina.id, nombre: data.nombre.trim(), tipo: data.tipo, foco: 'general', orden: 0 })
    .select('id')
    .single()

  if (diaError) return { error: diaError.message }

  if (data.ejercicios.length > 0) {
    const { error: ejError } = await supabase
      .from('rutina_ejercicios')
      .insert(data.ejercicios.map((ej, idx) => ({
        rutina_dia_id: dia.id,
        ejercicio_id: ej.ejercicioId || null,
        nombre_custom: ej.nombreCustom || null,
        series: ej.series,
        repeticiones: ej.repeticiones,
        peso: ej.peso || null,
        descanso_segundos: ej.descansoSegundos,
        modalidad: ej.modalidad ?? 'repeticion',
        descanso_serie: ej.descansoSerie ?? null,
        orden: idx,
      })))
    if (ejError) return { error: ejError.message }
  }

  revalidatePath(`/dashboard/rutinas/${data.clienteId}`)
  return { id: rutina.id }
}

// ── Ejercicios de rutina (CRUD) ───────────────────────────────────────────────

export async function deleteRutinaEjercicio(rutinaEjercicioId: string, clienteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('rutina_ejercicios')
    .delete()
    .eq('id', rutinaEjercicioId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/rutinas/${clienteId}`)
  return { ok: true }
}

export async function addEjercicioARutina(data: {
  rutinaDiaId: string
  clienteId: string
  ejercicioId: string | null
  nombreCustom: string | null
  series: number
  repeticiones: string
  peso: string
  descansoSegundos: number
  modalidad: string
  descansoSerie: number | null
  orden: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('rutina_ejercicios')
    .insert({
      rutina_dia_id: data.rutinaDiaId,
      ejercicio_id: data.ejercicioId,
      nombre_custom: data.nombreCustom,
      series: data.series,
      repeticiones: data.repeticiones,
      peso: data.peso || null,
      descanso_segundos: data.descansoSegundos,
      modalidad: data.modalidad,
      descanso_serie: data.descansoSerie,
      orden: data.orden,
    })

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/rutinas/${data.clienteId}`)
  return { ok: true }
}

export async function updateRutinaEjercicio(data: {
  rutinaEjercicioId: string
  clienteId: string
  series: number
  repeticiones: string
  peso: string
  descansoSegundos: number
  modalidad: string
  descansoSerie: number | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('rutina_ejercicios')
    .update({
      series: data.series,
      repeticiones: data.repeticiones,
      peso: data.peso || null,
      descanso_segundos: data.descansoSegundos,
      modalidad: data.modalidad,
      descanso_serie: data.descansoSerie,
    })
    .eq('id', data.rutinaEjercicioId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/rutinas/${data.clienteId}`)
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
