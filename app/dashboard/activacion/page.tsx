import { redirect } from 'next/navigation'
import {
  CheckCircle2,
  MessageCircle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MONTHLY_PLAN_DETAILS, isPlanExpired, isPlanRestricted } from '@/lib/plan'
import { createClient } from '@/lib/supabase/server'

const activationBenefits = [
  'Acceso completo a clientes, sesiones y evaluaciones.',
  'Agenda ilimitada y seguimiento diario.',
  'Activación rápida y soporte por WhatsApp.',
]

const activationSteps = [
  'Transfiere $4.990.',
  'Envía el comprobante por WhatsApp.',
  'Tu cuenta se activa en minutos.',
]

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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-background to-cyan-50 shadow-sm">
        <div className="grid lg:grid-cols-[1.02fr,0.98fr]">
          <div className="border-b border-emerald-100/80 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="space-y-5">
              <Badge variant="outline" className="w-fit border-emerald-200 bg-white/80 text-emerald-800">
                Reactivación disponible hoy
              </Badge>

              <div className="space-y-3">
                <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                  Reactiva tu cuenta
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground">
                  {firstName}, tu suscripción venció y tu cuenta está pausada.
                  Para volver a usar AgendaCoach solo necesitas renovar tu mensualidad.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-500 via-emerald-500 to-emerald-600 p-6 text-white shadow-lg shadow-emerald-300/40">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-50/90">
                  Valor actual
                </div>
                <div className="mt-3 text-4xl font-semibold leading-none sm:text-5xl">
                  {MONTHLY_PLAN_DETAILS.priceLabel}
                </div>
                <p className="mt-3 max-w-md text-sm leading-6 text-emerald-50/95">
                  Renueva tu mensualidad y vuelve a usar AgendaCoach con acceso completo a tu trabajo diario.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Al renovar recuperas</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Vuelves a entrar a tu espacio de trabajo sin bloqueos y con continuidad para seguir atendiendo a tus clientes.
              </p>
              <div className="mt-4 space-y-3">
                {activationBenefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white/70 p-5 text-sm text-muted-foreground shadow-sm ring-1 ring-emerald-100">
              <p className="font-semibold text-foreground">Cómo renovar</p>
              <div className="mt-4 space-y-3">
                {activationSteps.map((step, index) => (
                  <div key={step} className="flex items-start gap-3 text-sm text-foreground">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                      {index + 1}
                    </div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button asChild className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700">
              <a href={MONTHLY_PLAN_DETAILS.whatsappHref} target="_blank" rel="noopener noreferrer">
                Renovar mi suscripción
                <MessageCircle className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}