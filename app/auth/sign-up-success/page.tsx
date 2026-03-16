'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CalendarCheck, MailCheck } from 'lucide-react'
import Link from 'next/link'

export default function SignUpSuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh w-full items-center justify-center bg-muted" />}>
      <SignUpSuccessContent />
    </Suspense>
  )
}

function SignUpSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
  const email = searchParams.get('email') || ''
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleResend = async () => {
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      if (!email) throw new Error('No se detectó el correo. Regresa y registra de nuevo.')
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${siteUrl}/dashboard`,
        },
      })
      if (resendError) throw resendError
      setMessage('Enlace reenviado. Revisa tu correo.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar el correo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-2">
            <CalendarCheck className="h-8 w-8 text-primary" />
            <span className="font-heading text-2xl font-bold text-foreground">AgendaCoach</span>
          </div>
          <Card>
            <CardHeader className="items-center text-center">
              <MailCheck className="h-12 w-12 text-primary" />
              <CardTitle className="font-heading text-2xl">Revisa tu correo</CardTitle>
              <CardDescription>
                Te enviamos un enlace de confirmación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Tu cuenta ha sido creada. Revisa tu correo para confirmar antes de iniciar sesión.
              </p>
              {message && <p className="text-center text-sm text-emerald-600">{message}</p>}
              {error && <p className="text-center text-sm text-destructive">{error}</p>}
              <div className="flex flex-col gap-2">
                <Button onClick={handleResend} disabled={loading}>
                  {loading ? 'Reenviando...' : 'Reenviar enlace'}
                </Button>
                <Button variant="outline" onClick={() => router.push('/auth/login')}>
                  Ir a iniciar sesión
                </Button>
                <Link href="/auth/login" className="text-center text-sm text-primary underline underline-offset-4">
                  ¿Ya confirmaste? Inicia sesión
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
