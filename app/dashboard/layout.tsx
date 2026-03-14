import React from "react"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { CalendarCheck } from 'lucide-react'
import { UserMenu } from '@/components/user-menu'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('perfiles')
    .select('nombre_completo')
    .eq('id', user.id)
    .single()

  return (
    <SidebarProvider>
      <AppSidebar userEmail={user.email} />
      <main className="flex-1 overflow-auto">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-foreground">
              <CalendarCheck className="h-5 w-5 text-primary" />
              <span>AgendaCoach</span>
            </Link>
          </div>
          <UserMenu email={user.email || undefined} displayName={profile?.nombre_completo || undefined} />
        </header>
        <div className="p-6">{children}</div>
      </main>
    </SidebarProvider>
  )
}
