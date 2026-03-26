'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSessionAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  const clientId = formData.get('client_id') as string
  const packageId = (formData.get('package_id') as string) || null
  const sessionDate = formData.get('session_date') as string
  const sessionTime = formData.get('session_time') as string

  const { error } = await supabase.from('sesiones_programadas').insert({
    usuario_id: user.id,
    cliente_id: clientId,
    paquete_id: packageId || null,
    fecha_sesion: sessionDate,
    hora_sesion: sessionTime,
    estado: 'programada',
  })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard')
}

export async function createRecurringSessionsAction({
  clientId,
  packageId,
  startDate,
  sessionTime,
  days,
  weeks,
}: {
  clientId: string
  packageId: string | null
  startDate: string
  sessionTime: string
  days: number[]
  weeks: number
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')
  if (!clientId) throw new Error('Cliente requerido')
  if (!packageId) throw new Error('Paquete requerido')
  if (!startDate || !sessionTime) throw new Error('Fecha y hora requeridas')
  if (!days || days.length === 0) throw new Error('Selecciona al menos un día')

  const sanitizedWeeks = Math.max(1, Number(weeks) || 1)

  const { data: pkg, error: pkgError } = await supabase
    .from('paquetes_sesiones')
    .select('sesiones_totales, sesiones_usadas, estado, fecha_expiracion, cliente_id')
    .eq('id', packageId)
    .eq('usuario_id', user.id)
    .single()

  if (pkgError) throw new Error(pkgError.message)
  if (!pkg) throw new Error('Paquete no encontrado')
  if (pkg.cliente_id !== clientId) throw new Error('El paquete no pertenece al cliente seleccionado')
  if (pkg.estado !== 'activo') throw new Error('El paquete no está activo')

  const remaining = Math.max((pkg.sesiones_totales ?? 0) - (pkg.sesiones_usadas ?? 0), 0)
  if (remaining <= 0) throw new Error('El paquete no tiene sesiones disponibles')

  const maxCount = remaining
  const selectedDays = [...days]
  const start = new Date(`${startDate}T00:00:00`)
  let limitDate = new Date(start)
  limitDate.setDate(limitDate.getDate() + sanitizedWeeks * 7)

  if (pkg.fecha_expiracion) {
    const expiry = new Date(pkg.fecha_expiracion)
    expiry.setDate(expiry.getDate() + 1) // incluir el día de expiración completo
    if (expiry < limitDate) {
      limitDate = expiry
    }
    if (start >= expiry) {
      throw new Error('La fecha de inicio es posterior a la expiración del paquete')
    }
  }

  const desiredTotal = Math.max(selectedDays.length * sanitizedWeeks, 0)
  if (desiredTotal > remaining) {
    throw new Error('La cantidad solicitada excede las sesiones disponibles del paquete')
  }

  const occurrences: Date[] = []
  for (const cursor = new Date(start); cursor < limitDate && occurrences.length < maxCount; cursor.setDate(cursor.getDate() + 1)) {
    if (selectedDays.includes(cursor.getDay())) {
      occurrences.push(new Date(cursor))
    }
  }

  if (occurrences.length === 0) throw new Error('No se generaron fechas con la configuración actual')

  const rows = occurrences.map((date) => ({
    usuario_id: user.id,
    cliente_id: clientId,
    paquete_id: packageId,
    fecha_sesion: date.toISOString().slice(0, 10),
    hora_sesion: sessionTime,
    estado: 'programada',
  }))

  const { error } = await supabase.from('sesiones_programadas').insert(rows)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard')
}

export async function burnSessionAction({ paqueteId, clienteId }: { paqueteId: string; clienteId: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  // Registrar sesión consumida
  const { error: insertError } = await supabase.from('sesiones_consumidas').insert({
    usuario_id: user.id,
    cliente_id: clienteId,
    paquete_id: paqueteId,
  })
  if (insertError) throw new Error(insertError.message)

  // Incrementar sesiones usadas del paquete
  const { data: pkg, error: pkgError } = await supabase
    .from('paquetes_sesiones')
    .select('sesiones_usadas, sesiones_totales')
    .eq('id', paqueteId)
    .eq('usuario_id', user.id)
    .single()

  if (pkgError) throw new Error(pkgError.message)

  const newUsed = (pkg?.sesiones_usadas ?? 0) + 1
  const newEstado = newUsed >= (pkg?.sesiones_totales ?? 0) ? 'completado' : 'activo'

  const { error: updateError } = await supabase
    .from('paquetes_sesiones')
    .update({ sesiones_usadas: newUsed, estado: newEstado })
    .eq('id', paqueteId)
    .eq('usuario_id', user.id)

  if (updateError) throw new Error(updateError.message)

  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard')
}

export async function restoreBurnedSessionAction(consumidaId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  const { data: consumo, error: consumoError } = await supabase
    .from('sesiones_consumidas')
    .select('id, paquete_id, cliente_id')
    .eq('id', consumidaId)
    .eq('usuario_id', user.id)
    .single()

  if (consumoError) throw new Error(consumoError.message)
  if (!consumo) throw new Error('Sesión no encontrada')
  if (!consumo.paquete_id) throw new Error('La sesión no tiene paquete asociado')

  const { data: pkg, error: pkgError } = await supabase
    .from('paquetes_sesiones')
    .select('id, sesiones_usadas, sesiones_totales, estado')
    .eq('id', consumo.paquete_id)
    .eq('usuario_id', user.id)
    .single()

  if (pkgError) throw new Error(pkgError.message)
  if (!pkg) throw new Error('Paquete no encontrado')

  const newUsed = Math.max((pkg.sesiones_usadas ?? 0) - 1, 0)
  const newEstado = newUsed >= (pkg.sesiones_totales ?? 0) ? 'completado' : 'activo'

  const { error: deleteError } = await supabase
    .from('sesiones_consumidas')
    .delete()
    .eq('id', consumidaId)
    .eq('usuario_id', user.id)

  if (deleteError) throw new Error(deleteError.message)

  const { error: updateError } = await supabase
    .from('paquetes_sesiones')
    .update({ sesiones_usadas: newUsed, estado: newEstado })
    .eq('id', consumo.paquete_id)
    .eq('usuario_id', user.id)

  if (updateError) throw new Error(updateError.message)

  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard')
}

export async function updateSessionStatusAction(
  sessionId: string,
  status: string,
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('sesiones_programadas')
    .update({ estado: status })
    .eq('id', sessionId)
    .eq('usuario_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard')
}

export async function createPackageAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')
  const startDate = formData.get('start_date') as string
  if (!startDate) throw new Error('Fecha de inicio requerida')
  const { error } = await supabase.from('paquetes_sesiones').insert({
    usuario_id: user.id,
    cliente_id: formData.get('client_id') as string,
    sesiones_totales: Number(formData.get('total_sessions')),
    sesiones_usadas: 0,
    fecha_expiracion: (formData.get('expiry_date') as string) || null,
    fecha_inicio: startDate,
    estado: 'activo',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard')
}

export async function deleteSessionAction(sessionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('sesiones_programadas')
    .delete()
    .eq('id', sessionId)
    .eq('usuario_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard')
}

export async function updatePackageExpiryAction({
  packageId,
  expiryDate,
}: {
  packageId: string
  expiryDate: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')
  if (!expiryDate) throw new Error('Fecha de expiración requerida')

  const { error } = await supabase
    .from('paquetes_sesiones')
    .update({ fecha_expiracion: expiryDate })
    .eq('id', packageId)
    .eq('usuario_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard')
}

export async function deletePackageAction(packageId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  // Eliminar sesiones asociadas al paquete para evitar huérfanos
  const { error: progError } = await supabase
    .from('sesiones_programadas')
    .delete()
    .eq('paquete_id', packageId)
    .eq('usuario_id', user.id)
  if (progError) throw new Error(progError.message)

  const { error: consError } = await supabase
    .from('sesiones_consumidas')
    .delete()
    .eq('paquete_id', packageId)
    .eq('usuario_id', user.id)
  if (consError) throw new Error(consError.message)

  const { error } = await supabase
    .from('paquetes_sesiones')
    .delete()
    .eq('id', packageId)
    .eq('usuario_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/clients')
  revalidatePath('/dashboard/sessions')
  revalidatePath('/dashboard')
}
