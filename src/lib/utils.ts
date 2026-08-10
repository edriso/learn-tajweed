import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Join class names and let later Tailwind utilities win over earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

/**
 * Western digits to Arabic-Indic digits (12 -> ١٢).
 * Used for ayah numbers and counts, so the page reads like a printed Arabic
 * book. Interface numbers that sit next to Latin text stay as they are.
 */
export function toArabicDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)])
}

/** «٣ دروس» / «درسان» / «درس» — Arabic counts need the dual and the plural. */
export function countLabel(n: number, [one, two, few, many]: [string, string, string, string]) {
  if (n === 1) return one
  if (n === 2) return two
  if (n >= 3 && n <= 10) return `${toArabicDigits(n)} ${few}`
  return `${toArabicDigits(n)} ${many}`
}

/**
 * Counting lessons after a verb — «أتممتَ ٣٤ درسًا» — so the noun takes the
 * accusative. Shared rather than retyped: two places say this sentence, and the
 * settings panel says a third one in the nominative («المحفوظ: ٣٤ درسًا»), which
 * is why that one keeps its own words instead of bending these.
 */
export const LESSONS_COUNTED: [string, string, string, string] = [
  'درسًا واحدًا',
  'درسين',
  'دروس',
  'درسًا',
]
