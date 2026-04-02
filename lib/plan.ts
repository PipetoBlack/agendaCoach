export const ACTIVATION_ROUTE = '/dashboard/activacion'

export const MONTHLY_PLAN_DETAILS = {
  name: 'Plan mensual',
  priceLabel: '$4.990/mes',
  supportLabel: 'Activación en minutos',
  description: 'Recupera el acceso completo a clientes, sesiones y seguimiento diario.',
  benefits: [
    'Agenda ilimitada y sin restricciones.',
    'Control de clientes, sesiones y paquetes en un solo lugar.',
    'Soporte prioritario y activación exprés por WhatsApp.',
  ],
  renewalSteps: [
    'Transfiere $4.990.',
    'Envía el comprobante por WhatsApp.',
    'Tu cuenta se activará en minutos.',
  ],
  whatsappHref:
    'https://wa.me/56987206839?text=Hola%2C%20quiero%20activar%20o%20renovar%20mi%20plan%20mensual%20de%20AgendaCoach.%20Gracias.',
} as const

export type PlanProfile = {
  estado?: boolean | null
  plan_tipo?: string | null
  plan_inicio?: string | null
  plan_fin?: string | null
}

export function getPlanLabel(planTipo?: string | null) {
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

export function isPlanExpired(planFin?: string | null, nowIso = new Date().toISOString()) {
  return Boolean(planFin && planFin < nowIso)
}

export function isPlanRestricted(profile: PlanProfile | null | undefined, nowIso = new Date().toISOString()) {
  return !profile?.estado
    || profile?.plan_tipo === 'plan_vencido'
    || isPlanExpired(profile?.plan_fin, nowIso)
}