import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CalendarCheck, MailCheck } from 'lucide-react'

export default function SignUpSuccessPage() {
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
                {"Te enviamos un enlace de confirmación"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm text-muted-foreground">
                {"Tu cuenta ha sido creada. Revisa tu correo para confirmar antes de iniciar sesión."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
