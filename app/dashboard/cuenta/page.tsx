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

  const nowIso = new Date().toISOString()

  let { data: profile } = await supabase
    .from('perfiles')
    .select('nombre_completo, correo, celular, plan_tipo, plan_inicio, plan_fin, estado')
    .eq('id', user.id)
    .single()

  if (profile && profile.estado && profile.plan_fin && profile.plan_fin < nowIso) {
    const { data: updated } = await supabase
      .from('perfiles')
      .update({ estado: false })
      .eq('id', user.id)
      .select('nombre_completo, correo, celular, plan_tipo, plan_inicio, plan_fin, estado')
      .single()
    profile = updated ?? profile
  }

  return (
    <AccountContent
      userId={user.id}
      emailFromAuth={user.email || ''}
      profile={profile || null}
    />
  )
}
