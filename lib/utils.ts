import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toTitleCase(input?: string | null) {
  if (!input) return ''
  const s = String(input)
  return s
    .normalize('NFC')
    .toLocaleLowerCase('es')
    .replace(/\p{L}+/gu, (word) => word[0].toLocaleUpperCase('es') + word.slice(1))
}
