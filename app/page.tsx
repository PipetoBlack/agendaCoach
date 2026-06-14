import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarCheck, Users, Package, BarChart3, Mail, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Users,
    title: 'Clientes centralizados',
    description: 'Toda la info de tus clientes en un solo lugar: datos, historial y seguimiento.',
  },
  {
    icon: CalendarCheck,
    title: 'Agenda sin caos',
    description: 'Programa y gestiona sesiones fácilmente. Sin WhatsApp desorganizado ni hojas de cálculo.',
  },
  {
    icon: Package,
    title: 'Control de paquetes',
    description: 'Lleva el registro de sesiones contratadas, usadas y por vencer de cada cliente.',
  },
  {
    icon: BarChart3,
    title: 'Seguimiento real',
    description: 'Visualiza el progreso de tus clientes y mantén el control de tu práctica diaria.',
  },
]

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-svh flex flex-col bg-gradient-to-b from-emerald-50 via-white to-white">
      {/* Header */}
      <header className="w-full px-6 py-4 border-b border-emerald-100/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <CalendarCheck className="h-6 w-6 text-emerald-600" />
            <span className="font-bold text-lg text-foreground">AgendaCoach</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200">
            <CalendarCheck className="h-10 w-10 text-white" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
              Tu práctica de coaching,<br />
              <span className="text-emerald-600">sin el desorden</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Olvídate del Excel, el WhatsApp caótico y las hojas de papel.
              AgendaCoach es la herramienta pensada para personal trainers que
              quieren gestionar clientes, sesiones y paquetes en un solo lugar.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8" asChild>
              <Link href="/auth/sign-up">Comenzar ahora</Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8" asChild>
              <Link href="/auth/login">Ya tengo cuenta</Link>
            </Button>
          </div>
        </div>

        {/* Demo CTA */}
        <div className="max-w-2xl mx-auto mt-10 w-full">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-8 flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
              <Calendar className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">¿Necesitas ayuda para empezar?</h2>
              <p className="text-sm text-muted-foreground">
                Agenda una demo y te mostramos cómo AgendaCoach puede simplificar tu día a día como entrenador.
              </p>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white mt-1"
              asChild
            >
              <a
                href="mailto:agendacoachf@gmail.com?subject=Quiero%20agendar%20una%20demo&body=Hola%2C%20me%20gustar%C3%ADa%20agendar%20una%20demo%20de%20AgendaCoach.%20Mi%20nombre%20es%3A%20"
              >
                Agendar una demo
              </a>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto mt-16 w-full">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-8">
            Todo lo que necesitas
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                  <Icon className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-slate-100 mt-12">
        <div className="flex items-center justify-center gap-5">
          <a
            href="mailto:agendacoachf@gmail.com?subject=Soporte%20y%20sugerencias"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Mail className="h-4 w-4" />
            Soporte o sugerencias
          </a>
          <span className="text-slate-200">|</span>
          <a
            href="https://www.instagram.com/agenda.coach/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <InstagramIcon className="h-4 w-4" />
            Instagram
          </a>
        </div>
      </footer>
    </div>
  )
}
