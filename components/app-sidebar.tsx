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
  Sparkles,
  CalendarCheck,
  LayoutDashboard,
  Users,
  CalendarDays,
  User2,
  Mail,
  Instagram,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { ACTIVATION_ROUTE, getPlanLabel, isPlanExpired } from '@/lib/plan'

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
    title: 'Evaluación',
    url: '/evaluacion',
    icon: AlertCircle,
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

const activationItem = {
  title: 'Activación',
  url: ACTIVATION_ROUTE,
  icon: Sparkles,
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
  const isExpired = planTipo === 'plan_vencido' || isPlanExpired(planFin)
  if (isExpired) {
    return { label: 'Plan vencido', daysLeft: null, pctUsed: 100, statusText: 'Vencido' }
  }

  const label = getPlanLabel(planTipo)
  if (!planInicio || !planFin) return { label, daysLeft: null, pctUsed: null, statusText: null }

  const fin = new Date(planFin)
  const start = new Date(planInicio)
  const today = new Date()
  if (isNaN(fin.getTime()) || isNaN(start.getTime())) {
    return { label, daysLeft: null, pctUsed: null, statusText: null }
  }

  // Clamp to expected duration for known plans to avoid overstating remaining days when DB dates drift.
  const durationDays = getPlanDurationDays(planTipo)
  const expectedFin = durationDays ? new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000) : null
  const effectiveFin = expectedFin && fin.getTime() > expectedFin.getTime() ? expectedFin : fin

  const msTotal = effectiveFin.getTime() - start.getTime()
  if (msTotal <= 0) {
    return { label: 'Plan vencido', daysLeft: null, pctUsed: 100, statusText: 'Vencido' }
  }

  const daysLeft = Math.max(Math.ceil((effectiveFin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 0)
  const pctUsed = Math.min(100, Math.max(0, ((today.getTime() - start.getTime()) / msTotal) * 100))

  return { label, daysLeft, pctUsed, statusText: null }
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
  const visibleNavItems = restricted
    ? [activationItem]
    : [...navItems, accountItem]
  const planRoute = restricted ? ACTIVATION_ROUTE : accountItem.url
  const homeRoute = '/dashboard'

  const handleNavigateHome = () => {
    router.push(homeRoute)
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar>
      <SidebarHeader className="gap-3 border-b border-sidebar-border/80 px-3 pb-3 pt-3">
        <button
          onClick={handleNavigateHome}
          className="flex w-full items-center justify-between rounded-xl border border-sidebar-border/80 bg-sidebar-accent/10 px-3 py-3 text-left transition hover:border-sidebar-accent hover:bg-sidebar-accent/20"
          aria-label="Ir al inicio"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-accent/40 text-sidebar-primary">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold leading-none text-sidebar-foreground">AgendaCoach</div>
              <div className="mt-1 text-xs text-sidebar-foreground/65">Ir al inicio</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-sidebar-foreground/45" />
        </button>
      </SidebarHeader>
      <SidebarContent className="px-2 py-2">
        <SidebarGroup className="px-1">
          <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/65">Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="h-11 rounded-xl px-3 text-[15px] font-medium text-sidebar-foreground/88 shadow-none hover:bg-sidebar-accent/70 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-[inset_0_0_0_1px_hsl(var(--sidebar-border))]"
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
      <SidebarFooter className="border-t border-sidebar-border/80 px-3 pb-4 pt-3">
        <div className="space-y-3 text-sm text-sidebar-muted-foreground">
          <button
            onClick={() => {
              router.push(planRoute)
              if (isMobile) setOpenMobile(false)
            }}
            className="w-full rounded-xl border border-sidebar-border/80 bg-sidebar-accent/10 px-3 py-3 text-left transition hover:border-sidebar-accent hover:bg-sidebar-accent/20"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-sidebar-foreground">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-sidebar-muted-foreground" />
                {restricted ? 'Activar cuenta' : 'Plan actual'}
              </span>
              <span className={`text-xs font-semibold ${planPctClass}`}>
                {planStats.statusText ?? (planStats.daysLeft != null ? `${planStats.daysLeft} días restantes` : '—')}
              </span>
            </div>
            <div className="mt-1 text-sm font-medium text-sidebar-foreground">
              {planStats.label}
            </div>
          </button>

          <a
            className="flex items-center gap-2 rounded-lg px-1 py-1 text-sidebar-foreground/82 transition hover:text-sidebar-foreground"
            href="https://www.instagram.com/agenda.coach"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Instagram className="h-4 w-4" />
            <span>Instagram</span>
          </a>
          <a
            className="flex items-center gap-2 rounded-lg px-1 py-1 text-sidebar-foreground/82 transition hover:text-sidebar-foreground"
            href="mailto:agendacoachf@gmail.com?subject=Soporte%20y%20sugerencias"
          >
            <Mail className="h-4 w-4" />
            <span>Soporte y sugerencias</span>
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
