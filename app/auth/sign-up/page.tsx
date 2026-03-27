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
import { CalendarCheck, Eye, EyeOff, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SignUpPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showRepeatPassword, setShowRepeatPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const nameRegex = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]{1,20}$/
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/

  const toTitle = (s: string) => s.toLowerCase().replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1)).trim()

  const validateField = (field: string, value: string, helpers?: { password?: string }) => {
    const trimmed = value.trim()
    switch (field) {
      case 'firstName':
      case 'lastName':
        if (!trimmed) return 'Requerido'
        if (!nameRegex.test(trimmed)) return 'Formato inválido'
        return ''
      case 'email':
        if (!trimmed) return 'Requerido'
        if (!emailRegex.test(trimmed)) return 'Correo inválido'
        return ''
      case 'password':
        if (!trimmed) return 'Requerida'
        if (!passwordRegex.test(trimmed)) return 'Ejemplo: Agenda@123'
        return ''
      case 'repeatPassword':
        if (!trimmed) return 'Requerida'
        if (helpers?.password && trimmed !== helpers.password) return 'No coincide'
        return ''
      case 'confirmEmail':
        if (!trimmed) return 'Requerido'
        if (!emailRegex.test(trimmed)) return 'Correo inválido'
        if (helpers?.email && trimmed !== helpers.email) return 'No coincide'
        return ''
      default:
        return ''
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    const fErr = validateField('firstName', firstName)
    const lErr = validateField('lastName', lastName)
    const eErr = validateField('email', email)
    const cEmailErr = validateField('confirmEmail', confirmEmail, { email })
    const pErr = validateField('password', password)
    const rErr = validateField('repeatPassword', repeatPassword, { password })

    setFieldErrors({
      firstName: fErr,
      lastName: lErr,
      email: eErr,
      confirmEmail: cEmailErr,
      password: pErr,
      repeatPassword: rErr,
    })

    if (fErr || lErr || eErr || cEmailErr || pErr || rErr) {
      setIsLoading(false)
      return
    }

    const fullName = `${toTitle(firstName)} ${toTitle(lastName)}`.trim()

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      if (signUpError) throw signUpError

      // Attempt sign-in immediately (requires email confirmations deshabilitadas en Supabase)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) throw signInError

      router.push('/dashboard')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Ocurrió un error')
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
              <CardTitle className="font-heading text-2xl">Crea tu cuenta</CardTitle>
              <CardDescription>Comienza a gestionar tu práctica de coaching</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Juan"
                      required
                      maxLength={20}
                      pattern="^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]{1,20}$"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value)
                        const err = validateField('firstName', e.target.value)
                        setFieldErrors((prev) => ({ ...prev, firstName: err }))
                      }}
                      aria-invalid={!!fieldErrors.firstName}
                      className={cn(fieldErrors.firstName && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {fieldErrors.firstName && <p className="text-sm text-destructive">{fieldErrors.firstName}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Pérez"
                      required
                      maxLength={20}
                      pattern="^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]{1,20}$"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value)
                        const err = validateField('lastName', e.target.value)
                        setFieldErrors((prev) => ({ ...prev, lastName: err }))
                      }}
                      aria-invalid={!!fieldErrors.lastName}
                      className={cn(fieldErrors.lastName && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {fieldErrors.lastName && <p className="text-sm text-destructive">{fieldErrors.lastName}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="coach@ejemplo.com"
                      required
                      pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                      maxLength={100}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        const err = validateField('email', e.target.value)
                        const confirmErr = validateField('confirmEmail', confirmEmail, { email: e.target.value })
                        setFieldErrors((prev) => ({ ...prev, email: err, confirmEmail: confirmErr }))
                      }}
                      aria-invalid={!!fieldErrors.email}
                      className={cn(fieldErrors.email && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-email">Confirma el correo electrónico</Label>
                    <Input
                      id="confirm-email"
                      type="email"
                      placeholder="coach@ejemplo.com"
                      required
                      pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                      maxLength={100}
                      value={confirmEmail}
                      onChange={(e) => {
                        setConfirmEmail(e.target.value)
                        const err = validateField('confirmEmail', e.target.value, { email })
                        setFieldErrors((prev) => ({ ...prev, confirmEmail: err }))
                      }}
                      aria-invalid={!!fieldErrors.confirmEmail}
                      className={cn(fieldErrors.confirmEmail && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {fieldErrors.confirmEmail && <p className="text-sm text-destructive">{fieldErrors.confirmEmail}</p>}
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
                        onChange={(e) => {
                          setPassword(e.target.value)
                          const err = validateField('password', e.target.value)
                          const rErr = validateField('repeatPassword', repeatPassword, { password: e.target.value })
                          setFieldErrors((prev) => ({ ...prev, password: err, repeatPassword: rErr }))
                        }}
                        placeholder="Mínimo 8 caracteres"
                        aria-invalid={!!fieldErrors.password}
                        className={cn(fieldErrors.password && 'border-destructive focus-visible:ring-destructive', 'pr-10')}
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
                    {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repeat-password">Confirma la contraseña</Label>
                    <div className="relative">
                      <Input
                        id="repeat-password"
                        type={showRepeatPassword ? 'text' : 'password'}
                        required
                        maxLength={20}
                        value={repeatPassword}
                        onChange={(e) => {
                          setRepeatPassword(e.target.value)
                          const err = validateField('repeatPassword', e.target.value, { password })
                          setFieldErrors((prev) => ({ ...prev, repeatPassword: err }))
                        }}
                        placeholder="Repite la contraseña"
                        aria-invalid={!!fieldErrors.repeatPassword}
                        className={cn(fieldErrors.repeatPassword && 'border-destructive focus-visible:ring-destructive', 'pr-10')}
                      />
                      <button
                        type="button"
                        aria-label={showRepeatPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        onClick={() => setShowRepeatPassword((v) => !v)}
                        className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                      >
                        {showRepeatPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldErrors.repeatPassword && <p className="text-sm text-destructive">{fieldErrors.repeatPassword}</p>}
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creando cuenta...' : 'Registrarme'}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  ¿Ya tienes cuenta?{' '}
                  <Link
                    href="/auth/login"
                    className="text-primary underline underline-offset-4"
                  >
                    Inicia sesión
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <a
            className="underline hover:text-foreground"
            href="mailto:agendacoachf@gmail.com?subject=Soporte%20y%20sugerencias"
          >
            Soporte o sugerencias
          </a>
        </div>
      </div>
    </div>
  )
}
