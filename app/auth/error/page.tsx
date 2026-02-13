import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarCheck, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

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
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <CardTitle className="font-heading text-2xl">Algo salió mal</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <p className="text-center text-sm text-muted-foreground">
                {params?.error
                  ? `Error: ${params.error}`
                  : 'Ocurrió un error desconocido.'}
              </p>
              <Button asChild>
                <Link href="/auth/login">Volver al inicio de sesión</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
