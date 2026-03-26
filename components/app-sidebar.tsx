'use client'

import { usePathname, useRouter } from 'next/navigation'
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
  CalendarCheck,
  LayoutDashboard,
  Users,
  CalendarDays,
  User2,
  Mail,
  Instagram,
  AlertCircle,
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

function getPlanLabel(planTipo?: string) {
  if (!planTipo) return 'Sin plan'
  switch (planTipo) {
    case 'trial_14':
      return 'Prueba de 14 días'
    case 'trial':
      return 'Prueba'
    case 'plan_mensual':
      return 'Plan mensual'
    case 'plan_vencido':
      return 'Plan vencido'
    default:
      return planTipo
  }
}

function getPlanDurationDays(planTipo?: string) {
  switch (planTipo) {
    case 'trial_14':
      return 14
    case 'trial':
      return 7
    case 'plan_mensual':
      return 30
    default:
      return null
  }
}

function computePlanStats(planTipo?: string, planInicio?: string, planFin?: string) {
  const label = getPlanLabel(planTipo)
  if (!planInicio || !planFin) return { label, daysLeft: null, pctUsed: null }

  const fin = new Date(planFin)
  const start = new Date(planInicio)
  const today = new Date()
  if (isNaN(fin.getTime()) || isNaN(start.getTime())) {
    return { label, daysLeft: null, pctUsed: null }
  }

  // Clamp to expected duration for known plans to avoid overstating remaining days when DB dates drift.
  const durationDays = getPlanDurationDays(planTipo)
  const expectedFin = durationDays ? new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000) : null
  const effectiveFin = expectedFin && fin.getTime() > expectedFin.getTime() ? expectedFin : fin

  const msTotal = effectiveFin.getTime() - start.getTime()
  if (msTotal <= 0) {
    return { label, daysLeft: 0, pctUsed: 100 }
  }

  const daysLeft = Math.max(Math.ceil((effectiveFin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 0)
  const pctUsed = Math.min(100, Math.max(0, ((today.getTime() - start.getTime()) / msTotal) * 100))

  return { label, daysLeft, pctUsed }
}

function planColor(pctUsed?: number | null) {
  if (pctUsed == null) return 'text-sidebar-foreground'
  if (pctUsed <= 70) return 'text-emerald-500'
  if (pctUsed <= 90) return 'text-amber-500'
  return 'text-red-500'
}

export function AppSidebar({
  userEmail,
  restricted,
  planTipo,
  planInicio,
  planFin,
}: {
  userEmail?: string
  restricted?: boolean
  planTipo?: string
  planInicio?: string
  planFin?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { setOpenMobile, isMobile } = useSidebar()

  const planStats = computePlanStats(planTipo, planInicio, planFin)
  const planPctClass = planColor(planStats.pctUsed)

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
        <div className="px-3 pb-4 text-sm text-sidebar-muted-foreground space-y-3">
          <button
            onClick={() => {
              router.push('/dashboard/cuenta')
              if (isMobile) setOpenMobile(false)
            }}
            className="w-full rounded-md border border-sidebar-border bg-sidebar-accent/10 px-3 py-2 text-left transition hover:border-sidebar-accent hover:bg-sidebar-accent/20"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-sidebar-foreground">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-sidebar-muted-foreground" />
                Plan actual
              </span>
              <span className={`text-xs font-semibold ${planPctClass}`}>
                {planStats.daysLeft != null ? `${planStats.daysLeft} días restantes` : '—'}
              </span>
            </div>
            <div className="mt-1 text-sm font-medium text-sidebar-foreground">
              {planStats.label}
            </div>
          </button>

          <div className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            <a
              className="underline hover:text-sidebar-foreground"
              href="https://www.instagram.com/agenda.coach"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <a
              className="underline hover:text-sidebar-foreground"
              href="mailto:agendacoachf@gmail.com?subject=Soporte%20y%20sugerencias"
            >
              Soporte y sugerencias
            </a>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
