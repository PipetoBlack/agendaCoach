export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl w-full mx-auto px-3 sm:px-0 animate-pulse">
      {/* Header card */}
      <div className="rounded-2xl bg-emerald-500/30 h-36" />

      <div className="grid gap-4">
        {/* Agendados para hoy */}
        <div className="rounded-lg border bg-card p-4 shadow-sm flex flex-col gap-3">
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="h-20 rounded-lg bg-muted" />
        </div>

        {/* Calendario semanal */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-col gap-4">
          <div className="h-5 w-36 rounded bg-muted mx-auto" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 p-3 h-32 bg-slate-50" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
