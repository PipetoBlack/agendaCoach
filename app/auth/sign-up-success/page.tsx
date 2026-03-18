'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignUpSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted">
      <div className="text-sm text-muted-foreground">Cuenta creada, entrando…</div>
    </div>
  )
}
