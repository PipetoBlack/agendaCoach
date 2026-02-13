import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import { Toaster } from 'sonner'

import './globals.css'

const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const _dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

export const metadata: Metadata = {
  title: 'AgendaCoach - Gestiona tu práctica de coaching',
  description: 'Agenda de sesiones y gestión de clientes para coaches, terapeutas y consultores.',
}

export const viewport: Viewport = {
  themeColor: '#1a7a63',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
