"use client"

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh w-full items-center justify-center bg-muted" />}>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [newPassword, setNewPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showRepeat, setShowRepeat] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const code = searchParams.get('code')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setError('El enlace no es válido o expiró. Solicita uno nuevo.')
          setLoading(false)
          return
        }
      }

      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setError('No hay sesión de recuperación. Solicita un nuevo enlace.')
      }
      setLoading(false)
    }
    checkSession()
  }, [supabase, searchParams])

  if (loading) {
    return null
  }

  if (error && !message) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-muted p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Enlace expirado</CardTitle>
              <CardDescription>Recarga la pagina o bien, vuelve a solicitar el restablecimiento de contraseña.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button className="w-full" onClick={() => router.push('/auth/login')}>
                Volver al inicio de sesión
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const validate = () => {
    if (!newPassword || !repeatPassword) return 'Completa ambos campos'
    if (newPassword !== repeatPassword) return 'Las contraseñas no coinciden'
    if (!passwordRegex.test(newPassword)) return '8-20 caracteres, mayúscula, minúscula, número y símbolo'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      setMessage('Contraseña actualizada. Ahora puedes iniciar sesión.')
      setTimeout(() => router.push('/auth/login'), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="flex items-center gap-2">
            <LockKeyhole className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="font-heading text-xl">Restablecer contraseña</CardTitle>
              <CardDescription>Ingresa y confirma tu nueva contraseña.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    maxLength={20}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="repeat-password">Repetir contraseña</Label>
                <div className="relative">
                  <Input
                    id="repeat-password"
                    type={showRepeat ? 'text' : 'password'}
                    maxLength={20}
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showRepeat ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setShowRepeat((v) => !v)}
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                  >
                    {showRepeat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && <p className="text-sm text-emerald-600">{message}</p>}

              <Button type="submit" className="w-full" disabled={loading || submitting}>
                {submitting ? 'Actualizando...' : 'Actualizar contraseña'}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                <Link href="/auth/login" className="text-primary underline underline-offset-4">
                  Volver a iniciar sesión
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
