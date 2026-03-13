'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createClientAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  const firstName = ((formData.get('first_name') as string) || '').trim()
  const lastName = ((formData.get('last_name') as string) || '').trim()
  const phone = ((formData.get('phone') as string) || '').trim()
  const rutRaw = ((formData.get('rut') as string) || '').trim()
  const email = ((formData.get('email') as string) || '').trim() || null
  const notes = ((formData.get('notes') as string) || '').trim() || null
  const birthDate = (formData.get('birth_date') as string) || null
  const genero = (formData.get('gender') as string) || null

  if (!firstName || !lastName || !phone) {
    throw new Error('Nombre, apellido y teléfono son obligatorios')
  }

  const nameRegex = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]{1,20}$/
  if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
    throw new Error('Nombre y apellido: solo letras/espacios, máximo 20 caracteres')
  }

  if (rutRaw && !/^\d{1,9}$/.test(rutRaw)) {
    throw new Error('RUT: solo números, hasta 9 dígitos, sin puntos ni guion')
  }

  if (!/^\+?[0-9]+$/.test(phone)) {
    throw new Error('Teléfono: solo números y opcional prefijo +')
  }

  if (notes && notes.length > 100) {
    throw new Error('Notas: máximo 100 caracteres')
  }

  if (email && email.length > 0 && !email.includes('@')) {
    throw new Error('Correo inválido')
  }

  const toTitle = (s: string) => s.toLowerCase().replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1))
  const nombreCompleto = `${toTitle(firstName)} ${toTitle(lastName)}`.trim()

  const { error } = await supabase.from('clientes').insert({
    usuario_id: user.id,
    nombre_completo: nombreCompleto,
    rut: rutRaw || null,
    correo: email,
    telefono: phone,
    notas: notes,
    fecha_nacimiento: birthDate,
    genero,
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
  const birthDate = (formData.get('birth_date') as string) || null
  const genero = (formData.get('gender') as string) || null
  const firstName = ((formData.get('first_name') as string) || '').trim()
  const lastName = ((formData.get('last_name') as string) || '').trim()
  const phone = ((formData.get('phone') as string) || '').trim()
  const rutRaw = ((formData.get('rut') as string) || '').trim()
  const email = ((formData.get('email') as string) || '').trim() || null
  const notes = ((formData.get('notes') as string) || '').trim() || null

  if (!firstName || !lastName || !phone) {
    throw new Error('Nombre, apellido y teléfono son obligatorios')
  }

  const nameRegex = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]{1,20}$/
  if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
    throw new Error('Nombre y apellido: solo letras/espacios, máximo 20 caracteres')
  }

  if (rutRaw && !/^\d{1,9}$/.test(rutRaw)) {
    throw new Error('RUT: solo números, hasta 9 dígitos, sin puntos ni guion')
  }

  if (!/^\+?[0-9]+$/.test(phone)) {
    throw new Error('Teléfono: solo números y opcional prefijo +')
  }

  if (notes && notes.length > 100) {
    throw new Error('Notas: máximo 100 caracteres')
  }

  if (email && email.length > 0 && !email.includes('@')) {
    throw new Error('Correo inválido')
  }

  const toTitle = (s: string) => s.toLowerCase().replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1))
  const nombreCompleto = `${toTitle(firstName)} ${toTitle(lastName)}`.trim()
  const { error } = await supabase
    .from('clientes')
    .update({
      nombre_completo: nombreCompleto,
      rut: rutRaw || null,
      correo: email,
      telefono: phone,
      notas: notes,
      fecha_nacimiento: birthDate,
      genero,
      estado: ((formData.get('status') as string) || 'activo'),
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
