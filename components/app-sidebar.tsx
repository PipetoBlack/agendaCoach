'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CalendarCheck,
  LayoutDashboard,
  Users,
  CalendarDays,
  LogOut,
  ChevronUp,
  User2,
} from 'lucide-react'
import Link from 'next/link'

const navItems = [
  {
    title: 'Inicio',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Gestion de clientes',
    url: '/dashboard/clients',
    icon: Users,
  },
  {
    title: 'Agendar sesiones',
    url: '/dashboard/sessions',
    icon: CalendarDays,
  },
]

const accountItem = {
  title: 'Mi cuenta',
  url: '/dashboard/cuenta',
  icon: User2,
}

export function AppSidebar({ userEmail, restricted }: { userEmail?: string; restricted?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { setOpenMobile, isMobile } = useSidebar()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <CalendarCheck className="h-7 w-7 text-sidebar-primary" />
          <span className="text-lg font-bold text-sidebar-foreground">AgendaCoach</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-sidebar-foreground">Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(restricted ? [accountItem] : [...navItems, accountItem]).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="h-12 text-base font-medium"
                    isActive={
                      item.url === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname.startsWith(item.url)
                    }
                  >
                    <Link
                      href={item.url}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false)
                      }}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>

              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-3 pb-4 text-xs text-sidebar-muted-foreground">
          Soporte: {' '}
          <a
            className="underline hover:text-sidebar-foreground"
            href="mailto:agendacoachf@gmail.com?subject=Soporte%20y%20sugerencias"
          >
            agendacoachf@gmail.com
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
