'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createClientAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  const { error } = await supabase.from('clientes').insert({
     usuario_id: user.id,
     nombre_completo: formData.get('full_name') as string,
     rut: (formData.get('rut') as string) || null,
     correo: (formData.get('email') as string) || null,
     telefono: (formData.get('phone') as string) || null,
     notas: (formData.get('notes') as string) || null,
     estado: 'nuevo',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/clients')
}

export async function updateClientAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  const id = formData.get('id') as string
  const { error } = await supabase
    .from('clientes')
    .update({
      nombre_completo: formData.get('full_name') as string,
      rut: (formData.get('rut') as string) || null,
      correo: (formData.get('email') as string) || null,
      telefono: (formData.get('phone') as string) || null,
      notas: (formData.get('notes') as string) || null,
      estado: formData.get('status') as string,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', id)
     .eq('usuario_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/clients')
}

export async function deleteClientAction(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id)
     .eq('usuario_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/clients')
}
