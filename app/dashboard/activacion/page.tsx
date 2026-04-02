import { redirect } from 'next/navigation'
import {
  CheckCircle2,
  MessageCircle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MONTHLY_PLAN_DETAILS, getPlanLabel, isPlanExpired, isPlanRestricted } from '@/lib/plan'
import { createClient } from '@/lib/supabase/server'

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
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-background to-cyan-50 shadow-sm">
        <div className="grid lg:grid-cols-[0.95fr,1.05fr]">
          <div className="border-b border-emerald-100/80 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <CardHeader className="space-y-4 p-0">
              <Badge variant="outline" className="w-fit border-emerald-200 bg-white/70 text-emerald-800">
                Tu cuenta puede reactivarse hoy
              </Badge>
              <div className="space-y-2">
                <CardTitle className="text-3xl leading-tight sm:text-4xl">Volvamos a poner tu agenda en marcha</CardTitle>
                <CardDescription className="max-w-xl text-base leading-7">
                  {firstName}, tu plan venció, pero tu cuenta está a un paso de volver a estar activa.
                  Renueva tu suscripción y sigue gestionando tus clientes, sesiones y seguimiento diario
                  desde un solo lugar.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="mt-8 space-y-4 p-0 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-4">
                <span className="text-muted-foreground">Plan anterior</span>
                <span className="font-medium text-foreground">{currentPlanLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-4">
                <span className="text-muted-foreground">Valor mensual</span>
                <span className="font-medium text-foreground">{MONTHLY_PLAN_DETAILS.priceLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-4">
                <span className="text-muted-foreground">Venció el</span>
                <span className="font-medium text-foreground">{planEndLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Estado de la cuenta</span>
                <span className="font-medium text-destructive">Inactiva</span>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white/75 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Te acompañamos en la renovación</p>
                <p className="mt-1">
                  Escríbenos por WhatsApp y te ayudamos a dejar tu cuenta activa lo antes posible,
                  de forma simple y directa.
                </p>
              </div>
            </CardContent>
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Todo lo que recuperas al renovar</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Tu suscripción vuelve a abrir el acceso completo para que sigas trabajando con continuidad y sin bloqueos.
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
              <p className="font-semibold text-foreground">¿Listo para volver?</p>
              <p className="mt-2 leading-6">
                Si ya tienes tu comprobante o quieres resolver una duda antes de renovar, envíanos un mensaje.
                Te respondemos por WhatsApp para ayudarte rápido.
              </p>
            </div>

            <Button asChild className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
              <a href={MONTHLY_PLAN_DETAILS.whatsappHref} target="_blank" rel="noopener noreferrer">
                Quiero reactivar mi cuenta
                <MessageCircle className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}