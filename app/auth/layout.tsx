import Link from 'next/link'
import { CalendarCheck, Mail } from 'lucide-react'

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

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh flex flex-col bg-muted">
      <header className="w-full px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <CalendarCheck className="h-6 w-6 text-emerald-600" />
            <span className="font-bold text-lg text-foreground">AgendaCoach</span>
          </Link>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        {children}
      </div>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-slate-200">
        <div className="flex items-center justify-center gap-5">
          <a
            href="mailto:agendacoachf@gmail.com?subject=Soporte%20y%20sugerencias"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Mail className="h-4 w-4" />
            Soporte o sugerencias
          </a>
          <span className="text-slate-300">|</span>
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
