const DATE_PARTS_RE = /^(\d{4})-(\d{2})-(\d{2})/

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function parseEvaluationDateParts(value?: string | null) {
  if (!value) return null

  const raw = String(value)
  const match = raw.match(DATE_PARTS_RE)

  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const probe = new Date(Date.UTC(year, month - 1, day, 12))

    if (
      probe.getUTCFullYear() !== year ||
      probe.getUTCMonth() !== month - 1 ||
      probe.getUTCDate() !== day
    ) {
      return null
    }

    return { year, month, day }
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null

  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
  }
}

function buildUtcDate(value?: string | null) {
  const parts = parseEvaluationDateParts(value)
  if (!parts) return null

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12))
}

export function getTodayEvaluationDateInputValue() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function getEvaluationDateInputValue(value?: string | null) {
  const parts = parseEvaluationDateParts(value)
  if (!parts) return ''

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

export function isValidEvaluationDateInput(value?: string | null) {
  return parseEvaluationDateParts(value) !== null
}

export function serializeEvaluationDate(value?: string | null) {
  const parts = parseEvaluationDateParts(value)
  if (!parts) return null

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T12:00:00.000Z`
}

export function formatEvaluationDate(
  value?: string | null,
  locale = 'es-ES',
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  },
) {
  const date = buildUtcDate(value)
  if (!date) return '—'

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: 'UTC',
  }).format(date)
}