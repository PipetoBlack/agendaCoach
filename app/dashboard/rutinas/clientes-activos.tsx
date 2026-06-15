'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, PackageCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ClienteActivo = {
  id: string
  nombre_completo: string
  sesionesFuturas: number
  proximaSesion: string | null
}

function ClienteCard({ cliente }: { cliente: ClienteActivo }) {
  const iniciales = cliente.nombre_completo
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const fechaLabel = cliente.proximaSesion
    ? new Date(cliente.proximaSesion + 'T12:00:00').toLocaleDateString('es-CL', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : null

  return (
    <Link
      href={`/dashboard/rutinas/${cliente.id}`}
      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-xs shrink-0">
          {iniciales}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground leading-tight">{cliente.nombre_completo}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <PackageCheck className="h-3 w-3" />
              {cliente.sesionesFuturas} sesión{cliente.sesionesFuturas !== 1 ? 'es' : ''} próxima{cliente.sesionesFuturas !== 1 ? 's' : ''}
            </span>
            {fechaLabel && (
              <span className="text-xs text-emerald-600 font-medium">· {fechaLabel}</span>
            )}
          </div>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
    </Link>
  )
}

export function ClientesActivos({ clientes }: { clientes: ClienteActivo[] }) {
  const [expandido, setExpandido] = useState(false)

  if (clientes.length === 0) return null

  const principal = clientes[0]
  const resto = clientes.slice(1)

  return (
    <div className="flex flex-col gap-2">
      <ClienteCard cliente={principal} />

      {resto.length > 0 && (
        <>
          {expandido && (
            <div className="flex flex-col gap-2">
              {resto.map((c) => (
                <ClienteCard key={c.id} cliente={c} />
              ))}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="self-start gap-1.5 text-muted-foreground hover:text-foreground -ml-1"
            onClick={() => setExpandido((v) => !v)}
          >
            {expandido ? (
              <><ChevronUp className="h-4 w-4" /> Ocultar lista</>
            ) : (
              <><ChevronDown className="h-4 w-4" /> Ver todos ({resto.length} más)</>
            )}
          </Button>
        </>
      )}
    </div>
  )
}
