import { redirect } from 'next/navigation'
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  Sparkles,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ACTIVATION_ROUTE,
  MONTHLY_PLAN_DETAILS,
  getPlanLabel,
  isPlanExpired,
  isPlanRestricted,
} from '@/lib/plan'
import { createClient } from '@/lib/supabase/server'

function formatDate(value?: string | null) {
  if (!value) return '—'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'

  return parsed.toLocaleDateString('es-CL')
}

function getDaysRemaining(planFin?: string | null) {
  if (!planFin) return null

  const end = new Date(planFin)
  if (Number.isNaN(end.getTime())) return null

  return Math.max(Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0)
}

export default async function SubscriptionPage() {
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
    .select('nombre_completo, correo, plan_tipo, plan_inicio, plan_fin, estado')
    .eq('id', user.id)
    .single()

  if (profile?.estado && isPlanExpired(profile.plan_fin, nowIso)) {
    const { data: updated } = await supabase
      .from('perfiles')
      .update({ estado: false })
      .eq('id', user.id)
      .select('nombre_completo, correo, plan_tipo, plan_inicio, plan_fin, estado')
      .single()

    profile = updated ?? profile
  }

  if (isPlanRestricted(profile, nowIso)) {
    redirect(ACTIVATION_ROUTE)
  }

  const firstName = profile?.nombre_completo?.trim().split(/\s+/)[0] ?? 'Coach'
  const currentPlanLabel = getPlanLabel(profile?.plan_tipo)
  const planStartLabel = formatDate(profile?.plan_inicio)
  const planEndLabel = formatDate(profile?.plan_fin)
  const daysRemaining = getDaysRemaining(profile?.plan_fin)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-background to-cyan-50 shadow-sm">
        <div className="grid lg:grid-cols-[0.95fr,1.05fr]">
          <div className="border-b border-emerald-100/80 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <CardHeader className="space-y-4 p-0">
              <Badge variant="outline" className="w-fit border-emerald-200 bg-white/75 text-emerald-800">
                Suscripción activa
              </Badge>
              <div className="space-y-2">
                <CardTitle className="text-3xl leading-tight sm:text-4xl">Tu suscripción está lista para seguir creciendo</CardTitle>
                <CardDescription className="max-w-xl text-base leading-7">
                  {firstName}, aquí tienes un resumen claro de tu plan actual y la opción de renovarlo cuando quieras,
                  sin esperar a que venza para seguir con continuidad.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="mt-8 space-y-4 p-0 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-4">
                <span className="text-muted-foreground">Plan actual</span>
                <span className="font-medium text-foreground">{currentPlanLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-4">
                <span className="text-muted-foreground">Activado el</span>
                <span className="font-medium text-foreground">{planStartLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-4">
                <span className="text-muted-foreground">Vence el</span>
                <span className="font-medium text-foreground">{planEndLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Estado de la cuenta</span>
                <span className="font-medium text-emerald-700">
                  {daysRemaining != null ? `${daysRemaining} días restantes` : 'Activa'}
                </span>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white/75 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Tu acceso sigue completo</p>
                <p className="mt-1">
                  Clientes, sesiones, evaluaciones y seguimiento están disponibles mientras tu plan permanezca activo.
                </p>
              </div>
            </CardContent>
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
                Lo que incluye tu plan
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Mantienes acceso al flujo completo de AgendaCoach y puedes renovar antes del vencimiento si prefieres anticiparte.
              </p>
              <div className="mt-4 space-y-3">
                {MONTHLY_PLAN_DETAILS.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white/70 p-5 text-sm text-muted-foreground shadow-sm ring-1 ring-emerald-100">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <CreditCard className="h-4 w-4 text-emerald-700" />
                Renovación anticipada
              </div>
              <p className="mt-2 leading-6">
                Si quieres dejar tu próxima renovación lista o resolver una duda sobre tu plan, puedes escribirnos por WhatsApp.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-emerald-800">Valor mensual</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{MONTHLY_PLAN_DETAILS.priceLabel}</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-emerald-800">Soporte</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{MONTHLY_PLAN_DETAILS.supportLabel}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarClock className="h-4 w-4 text-emerald-700" />
                Cómo renovar
              </div>
              <div className="mt-4 space-y-3">
                {MONTHLY_PLAN_DETAILS.renewalSteps.map((step, index) => (
                  <div key={step} className="flex items-start gap-3 text-sm text-foreground">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                      {index + 1}
                    </div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button asChild className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
              <a href={MONTHLY_PLAN_DETAILS.whatsappHref} target="_blank" rel="noopener noreferrer">
                Ver renovación de suscripción
                <Sparkles className="h-4 w-4" />
                <MessageCircle className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}