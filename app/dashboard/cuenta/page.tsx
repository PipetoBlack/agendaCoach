import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountContent } from './account-content'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('perfiles')
    .select('nombre_completo, correo, celular')
    .eq('id', user.id)
    .single()

  return (
    <AccountContent
      userId={user.id}
      emailFromAuth={user.email || ''}
      profile={profile || null}
    />
  )
}
