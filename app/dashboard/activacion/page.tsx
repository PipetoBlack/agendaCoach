import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MONTHLY_PLAN_DETAILS, getPlanLabel, isPlanExpired, isPlanRestricted } from '@/lib/plan'
import { createClient } from '@/lib/supabase/server'

const planHighlights = [
  {
    icon: ShieldCheck,
    title: 'Acceso completo',
    description: 'Recupera el panel, tus clientes, sesiones y el control diario de tu agenda.',
  },
  {
    icon: Clock3,
    title: 'Renovación rápida',
    description: 'La activación se gestiona por WhatsApp para dejar tu cuenta lista en minutos.',
  },
  {
    icon: Sparkles,
    title: 'Operación continua',
    description: 'Mantén tu flujo de trabajo activo sin perder seguimiento ni visibilidad de tu negocio.',
  },
] as const

export default async function ActivationPage() {
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

  if (!isPlanRestricted(profile, nowIso)) {
    redirect('/dashboard')
  }

  const firstName = profile?.nombre_completo?.trim().split(/\s+/)[0] ?? 'Coach'
  const currentPlanLabel = getPlanLabel(profile?.plan_tipo)
  const planEndLabel = profile?.plan_fin
    ? new Date(profile.plan_fin).toLocaleDateString('es-CL')
    : '—'

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-background to-cyan-50 px-6 py-8 shadow-sm sm:px-8">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.2),_transparent_60%)] lg:block" />

        <div className="relative grid gap-6 lg:grid-cols-[1.25fr,0.9fr] lg:items-start">
          <div className="space-y-5">
            <Badge
              variant="secondary"
              className="w-fit border border-emerald-200 bg-emerald-100 text-emerald-900"
            >
              Cuenta pausada por plan vencido
            </Badge>

            <div className="space-y-3">
              <p className="text-sm font-medium text-emerald-700">{firstName}, tu acceso quedó pausado</p>
              <div className="space-y-2">
                <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                  Activa tu cuenta
                </h1>
                <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                  Para volver a gestionar clientes, sesiones y tu agenda diaria, renueva tu suscripción.
                  El proceso es directo: revisa el plan, contacta por WhatsApp y tu cuenta se reactiva en minutos.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700">
                <a href={MONTHLY_PLAN_DETAILS.whatsappHref} target="_blank" rel="noopener noreferrer">
                  Contactar por WhatsApp
                  <MessageCircle className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard/cuenta">
                  Ver mi cuenta
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="border-emerald-200/70 bg-white/80">
                <CardHeader className="pb-3">
                  <CardDescription>Plan</CardDescription>
                  <CardTitle className="text-xl">{MONTHLY_PLAN_DETAILS.name}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-emerald-200/70 bg-white/80">
                <CardHeader className="pb-3">
                  <CardDescription>Valor</CardDescription>
                  <CardTitle className="text-xl">{MONTHLY_PLAN_DETAILS.priceLabel}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-emerald-200/70 bg-white/80">
                <CardHeader className="pb-3">
                  <CardDescription>Activación</CardDescription>
                  <CardTitle className="text-xl">{MONTHLY_PLAN_DETAILS.supportLabel}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          <Card className="border-emerald-200/70 bg-background/90 backdrop-blur-sm">
            <CardHeader className="space-y-3">
              <Badge variant="outline" className="w-fit border-emerald-200 text-emerald-800">
                Renovación asistida
              </Badge>
              <div className="space-y-1">
                <CardTitle className="text-2xl">Estado actual de tu cuenta</CardTitle>
                <CardDescription>
                  Esta vista reemplaza el envío automático a “Mi cuenta” cuando tu plan ya no permite operar.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-3">
                  <span className="text-muted-foreground">Último plan</span>
                  <span className="font-medium text-foreground">{currentPlanLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-3">
                  <span className="text-muted-foreground">Fecha de término</span>
                  <span className="font-medium text-foreground">{planEndLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Estado</span>
                  <span className="font-medium text-destructive">Inactiva</span>
                </div>
              </div>

              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="text-sm font-semibold text-foreground">Cómo reactivar</p>
                <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
                  {MONTHLY_PLAN_DETAILS.renewalSteps.map((step, index) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <Button asChild className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                <a href={MONTHLY_PLAN_DETAILS.whatsappHref} target="_blank" rel="noopener noreferrer">
                  Enviar mensaje para renovar
                  <MessageCircle className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {planHighlights.map((item) => (
          <Card key={item.title} className="border-border/70 bg-card/80">
            <CardHeader className="space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-2xl">Lo que incluye tu renovación</CardTitle>
          <CardDescription>{MONTHLY_PLAN_DETAILS.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {MONTHLY_PLAN_DETAILS.benefits.map((benefit) => (
            <div
              key={benefit}
              className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm text-foreground"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{benefit}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}