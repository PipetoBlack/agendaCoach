'use client'

import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'

const nameRegex = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]{1,20}$/
const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const phoneRegex = /^\+?[0-9]{0,20}$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/

function splitName(nombreCompleto?: string | null) {
  if (!nombreCompleto) return { first: '', last: '' }
  const parts = nombreCompleto.trim().split(/\s+/)
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1))
    .trim()
}

export type AccountContentProps = {
  userId: string
  emailFromAuth: string
  profile: {
    nombre_completo: string | null
    correo: string | null
    celular: string | null
    plan_tipo?: string | null
    plan_inicio?: string | null
    plan_fin?: string | null
    estado?: boolean | null
  } | null
}

export function AccountContent({ userId, emailFromAuth, profile }: AccountContentProps) {
  const supabase = useMemo(() => createClient(), [])
  const initialNames = splitName(profile?.nombre_completo)

  const [firstName, setFirstName] = useState(initialNames.first)
  const [lastName, setLastName] = useState(initialNames.last)
  const [email, setEmail] = useState(profile?.correo || emailFromAuth || '')
  const [phone, setPhone] = useState(profile?.celular || '')

  const [planType, setPlanType] = useState(profile?.plan_tipo || 'trial_14')
  const [planStart, setPlanStart] = useState(profile?.plan_inicio || null)
  const [planEnd, setPlanEnd] = useState(profile?.plan_fin || null)
  const [isActive, setIsActive] = useState(profile?.estado ?? true)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showRepeat, setShowRepeat] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSavingProfile, startSavingProfile] = useTransition()
  const [isSavingPassword, startSavingPassword] = useTransition()

  const setFieldError = (field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }))
  }

  const validateField = (field: string, value: string) => {
    const trimmed = value.trim()
    switch (field) {
      case 'firstName':
        if (!trimmed) return 'Requerido'
        if (!nameRegex.test(trimmed)) return 'No se admite este formato'
        return ''
      case 'lastName':
        if (!trimmed) return 'Requerido'
        if (!nameRegex.test(trimmed)) return 'No se admite este formato'
        return ''
      case 'email':
        if (!trimmed) return 'Requerido'
        if (!emailRegex.test(trimmed)) return 'Correo inválido'
        return ''
      case 'phone':
        if (trimmed && !phoneRegex.test(trimmed)) return 'No se admite este formato'
        return ''
      case 'currentPassword':
        if (!trimmed) return 'Requerida'
        return ''
      case 'newPassword':
        if (!trimmed) return 'Requerida'
        if (!passwordRegex.test(trimmed)) return 'Ejemplo: Abc123$%'
        return ''
      case 'repeatPassword':
        if (trimmed !== newPassword) return 'No coincide'
        return ''
      default:
        return ''
    }
  }

  const validateProfile = () => {
    let hasError = false
    const fErr = validateField('firstName', firstName)
    const lErr = validateField('lastName', lastName)
    const eErr = validateField('email', email)
    const pErr = validateField('phone', phone)

    setFieldError('firstName', fErr)
    setFieldError('lastName', lErr)
    setFieldError('email', eErr)
    setFieldError('phone', pErr)

    hasError = !!(fErr || lErr || eErr || pErr)

    return !hasError
  }

  const handleSaveProfile = () => {
    if (!validateProfile()) return
    startSavingProfile(async () => {
      try {
        const nombreCompleto = `${titleCase(firstName)} ${titleCase(lastName)}`.trim()
        // Preservar datos de plan al actualizar (evita que triggers/defaults modifiquen el plan)
        const currentPlan = {
          plan_tipo: profile?.plan_tipo ?? null,
          plan_inicio: profile?.plan_inicio ?? null,
          plan_fin: profile?.plan_fin ?? null,
          estado: profile?.estado ?? null,
        }
        const { error } = await supabase
          .from('perfiles')
          .update({
            nombre_completo: nombreCompleto,
            correo: email.trim(),
            celular: phone.trim() || null,
            ...currentPlan,
          })
          .eq('id', userId)

        if (error) throw new Error(error.message)

        // Opcional: mantener correo en auth.sync si cambió
        if (emailFromAuth && email.trim() !== emailFromAuth) {
          const { error: authError } = await supabase.auth.updateUser({ email: email.trim() })
          if (authError) throw new Error(authError.message)
        }

        toast.success('Datos guardados correctamente')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
      }
    })
  }

  const validatePasswords = () => {
    let hasError = false
    const cErr = validateField('currentPassword', currentPassword)
    const nErr = validateField('newPassword', newPassword)
    const rErr = validateField('repeatPassword', repeatPassword)

    setFieldError('currentPassword', cErr)
    setFieldError('newPassword', nErr)
    setFieldError('repeatPassword', rErr)

    hasError = !!(cErr || nErr || rErr)

    return !hasError
  }

  const handleChangePassword = () => {
    if (!validatePasswords()) return

    startSavingPassword(async () => {
      try {
        const emailToUse = email.trim() || emailFromAuth
        if (!emailToUse) throw new Error('Correo no disponible para validar contraseña')

        // Verificar contraseña actual
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password: currentPassword,
        })
        if (signInError) throw new Error('Contraseña actual incorrecta')

        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
        if (updateError) throw new Error(updateError.message)

        setCurrentPassword('')
        setNewPassword('')
        setRepeatPassword('')
        toast.success('Contraseña actualizada')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña')
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Mi cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Administra tu información personal, seguridad y suscripción.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Información personal</CardTitle>
            <CardDescription>Actualiza tus datos de contacto.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={firstName}
                  maxLength={20}
                  pattern="^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]{1,20}$"
                  title="Solo letras y espacios, máximo 20"
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    const err = validateField('firstName', e.target.value)
                    setFieldError('firstName', err)
                  }}
                  aria-invalid={!!errors.firstName}
                  className={cn(errors.firstName && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  name="apellido"
                  value={lastName}
                  maxLength={20}
                  pattern="^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]{1,20}$"
                  title="Solo letras y espacios, máximo 20"
                  onChange={(e) => {
                    setLastName(e.target.value)
                    const err = validateField('lastName', e.target.value)
                    setFieldError('lastName', err)
                  }}
                  aria-invalid={!!errors.lastName}
                  className={cn(errors.lastName && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="correo">Correo</Label>
                <Input
                  id="correo"
                  name="correo"
                  type="email"
                  value={email}
                  maxLength={100}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    const err = validateField('email', e.target.value)
                    setFieldError('email', err)
                  }}
                  aria-invalid={!!errors.email}
                  className={cn(errors.email && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="celular">Celular</Label>
                <Input
                  id="celular"
                  name="celular"
                  type="tel"
                  value={phone}
                  maxLength={20}
                  pattern="^\+?[0-9]{0,20}$"
                  title="Solo números y opcional +, máximo 20"
                  onChange={(e) => {
                    setPhone(e.target.value)
                    const err = validateField('phone', e.target.value)
                    setFieldError('phone', err)
                  }}
                  aria-invalid={!!errors.phone}
                  className={cn(errors.phone && 'border-destructive focus-visible:ring-destructive')}
                  placeholder="+56912345678"
                />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="button" onClick={handleSaveProfile} disabled={isSavingProfile}>
              {isSavingProfile ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cambiar contraseña</CardTitle>
            <CardDescription>Usa una contraseña segura y única.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contrasena-actual">Contraseña actual</Label>
              <div className="relative">
                <Input
                  id="contrasena-actual"
                  name="contrasena-actual"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  maxLength={20}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    const err = validateField('currentPassword', e.target.value)
                    setFieldError('currentPassword', err)
                  }}
                  aria-invalid={!!errors.currentPassword}
                  className={cn(errors.currentPassword && 'border-destructive focus-visible:ring-destructive', 'pr-10')}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-sm text-destructive">{errors.currentPassword}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nueva-contrasena">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="nueva-contrasena"
                  name="nueva-contrasena"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  maxLength={20}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    const err = validateField('newPassword', e.target.value)
                    setFieldError('newPassword', err)
                    // also refresh repeat match
                    const rErr = validateField('repeatPassword', repeatPassword)
                    setFieldError('repeatPassword', rErr)
                  }}
                  aria-invalid={!!errors.newPassword}
                  className={cn(errors.newPassword && 'border-destructive focus-visible:ring-destructive', 'pr-10')}
                  placeholder="Mínimo 8 caracteres"
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
              {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="repetir-contrasena">Repetir contraseña</Label>
              <div className="relative">
                <Input
                  id="repetir-contrasena"
                  name="repetir-contrasena"
                  type={showRepeat ? 'text' : 'password'}
                  value={repeatPassword}
                  maxLength={20}
                  onChange={(e) => {
                    setRepeatPassword(e.target.value)
                    const err = validateField('repeatPassword', e.target.value)
                    setFieldError('repeatPassword', err)
                  }}
                  aria-invalid={!!errors.repeatPassword}
                  className={cn(errors.repeatPassword && 'border-destructive focus-visible:ring-destructive', 'pr-10')}
                  placeholder="Mínimo 8 caracteres"
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
              {errors.repeatPassword && (
                <p className="text-sm text-destructive">{errors.repeatPassword}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="button" onClick={handleChangePassword} disabled={isSavingPassword}>
              {isSavingPassword ? 'Guardando...' : 'Cambiar contraseña'}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suscripción</CardTitle>
            <CardDescription>Resumen del plan actual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between text-foreground">
              <span>Plan</span>
              <span className="font-medium">
                {planType === 'trial_14'
                  ? 'Prueba de 14 días'
                  : planType === 'trial'
                    ? 'Prueba de 3 días'
                    : planType === 'plan_mensual'
                      ? 'Mensual'
                      : planType === 'plan_vencido'
                        ? 'Vencido'
                        : planType || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Fecha de inicio</span>
              <span>{planStart ? new Date(planStart).toLocaleDateString('es-CL') : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Fecha de término</span>
              <span>{planEnd ? new Date(planEnd).toLocaleDateString('es-CL') : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Estado</span>
              <span className={`font-medium ${isActive ? 'text-emerald-600' : 'text-destructive'}`}>
                {isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>Renovación manejada por el administrador.</span>
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                  Renovar plan
                </Button>
              </DialogTrigger>
              <DialogContent className="gap-4">
                <DialogHeader className="space-y-2">
                  <DialogTitle>Renovar plan mensual</DialogTitle>
                  <DialogDescription className="text-base text-foreground">
                    $4.990/mes
                  </DialogDescription>
                </DialogHeader>

                <div className="rounded-md border bg-emerald-50/70 p-4 text-sm">
                  <p className="text-foreground font-semibold">Beneficios de renovar</p>
                  <ul className="mt-2 space-y-1 text-emerald-900">
                    <li>• Agenda ilimitada y sin restricciones.</li>
                    <li>• Recordatorios y control de sesiones al día.</li>
                    <li>• Soporte prioritario y activación exprés.</li>
                  </ul>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="text-foreground font-medium">Cómo renovar</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Transfiere $4.990.</li>
                    <li>Envía el comprobante por WhatsApp.</li>
                    <li>Tu cuenta se activará en minutos.</li>
                  </ol>
                </div>

                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button asChild className="w-full sm:w-auto">
                    <a
                      href="https://wa.me/56987206839?text=Hola%2C%20adjunto%20comprobante%20para%20renovar%20mi%20plan%20mensual.%20Gracias."
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Enviar comprobante por WhatsApp
                    </a>
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
