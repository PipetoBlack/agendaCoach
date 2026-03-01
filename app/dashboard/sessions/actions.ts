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

  const fechaInicio = new Date().toISOString()
  const { error } = await supabase.from('paquetes_sesiones').insert({
    usuario_id: user.id,
    cliente_id: formData.get('client_id') as string,
    sesiones_totales: Number(formData.get('total_sessions')),
    sesiones_usadas: 0,
    fecha_expiracion: (formData.get('expiry_date') as string) || null,
    fecha_inicio: fechaInicio,
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
