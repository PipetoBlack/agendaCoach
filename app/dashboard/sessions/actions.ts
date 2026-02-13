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

  // If linked to a package, increment used_sessions
  if (packageId) {
    const { data: pkg } = await supabase
      .from('paquetes_sesiones')
      .select('sesiones_usadas, sesiones_totales')
      .eq('id', packageId)
      .single()

    if (pkg) {
      const newUsed = pkg.sesiones_usadas + 1
      await supabase
        .from('paquetes_sesiones')
        .update({
          sesiones_usadas: newUsed,
          estado: newUsed >= pkg.sesiones_totales ? 'completado' : 'activo',
        })
        .eq('id', packageId)
    }
  }

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

  const { error } = await supabase.from('paquetes_sesiones').insert({
    usuario_id: user.id,
    cliente_id: formData.get('client_id') as string,
    sesiones_totales: Number(formData.get('total_sessions')),
    sesiones_usadas: 0,
    fecha_expiracion: (formData.get('expiry_date') as string) || null,
    estado: 'activo',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/sessions')
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
