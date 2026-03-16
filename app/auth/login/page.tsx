'use client'

import React from "react"

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CalendarCheck, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (!emailRegex.test(email.trim())) {
        throw new Error('Ingresa un correo válido')
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
      router.push('/dashboard')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Ocurrió un error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (!emailRegex.test(email.trim())) {
        throw new Error('Ingresa un correo válido para recuperar la contraseña')
      }

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${siteUrl}/auth/reset`,
      })
      if (error) throw error
      setMessage('Te enviamos un correo para restablecer tu contraseña.')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'No se pudo enviar el correo de recuperación')
    } finally {
      setIsLoading(false)
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
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Bienvenido de nuevo</CardTitle>
              <CardDescription>
                Inicia sesión para gestionar tu práctica de coaching
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="coach@ejemplo.com"
                      required
                      maxLength={100}
                      pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        maxLength={20}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tu contraseña"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="block w-full text-center text-sm text-primary underline underline-offset-4"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  {message && <p className="text-sm text-emerald-600">{message}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  {"¿No tienes cuenta?"}{' '}
                  <Link
                    href="/auth/sign-up"
                    className="text-primary underline underline-offset-4"
                  >
                    Regístrate
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
