import React from "react"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'

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

  return (
    <SidebarProvider>
      <AppSidebar userEmail={user.email} />
      <main className="flex-1 overflow-auto">
        <header className="flex h-14 items-center gap-2 border-b border-border bg-card px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
        </header>
        <div className="p-6">{children}</div>
      </main>
    </SidebarProvider>
  )
}
