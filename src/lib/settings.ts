/**
 * Reader settings: which reciter the play buttons use, and whether the rules are
 * coloured. Both live in localStorage and nowhere else.
 *
 * These are read in two different ways on purpose:
 * - the colour setting toggles a class on <html>, so it applies instantly and
 *   globally without any component needing to subscribe;
 * - the reciter is read straight from storage at the moment a play button is
 *   pressed, so an audio button never has to re-render to stay in step with the
 *   settings menu.
 */

export interface Reciter {
  /** The directory name on everyayah.com. */
  id: string
  name: string
  /** One line explaining who this recording is for. */
  note: string
}

export const RECITERS: readonly Reciter[] = [
  {
    id: 'Husary_128kbps',
    name: 'محمود خليل الحُصَري · مرتَّل',
    note: 'التلاوة المرجعيّة في التعليم. متأنّيةٌ وأحكامها واضحة.',
  },
  {
    id: 'Husary_Muallim_128kbps',
    name: 'محمود خليل الحُصَري · المعلِّم',
    note: 'مسجَّلةٌ للتعليم، وفيها وقفاتٌ لتُعيد خلف الشيخ.',
  },
  {
    id: 'Minshawy_Murattal_128kbps',
    name: 'محمّد صدّيق المنشاوي · مرتَّل',
    note: 'تلاوةٌ هادئةٌ واضحة، وهي مألوفةٌ لكثيرين.',
  },
]

export const DEFAULT_RECITER = RECITERS[0].id

const RECITER_KEY = 'tajweed-reciter'
const COLOURS_KEY = 'tajweed-rule-colours'

/** The class that turns rule colours off, applied to <html>. */
export const PLAIN_RULES_CLASS = 'plain-rules'

export function getReciter(): string {
  try {
    const saved = localStorage.getItem(RECITER_KEY)
    if (saved && RECITERS.some((reciter) => reciter.id === saved)) return saved
  } catch {
    // private browsing
  }
  return DEFAULT_RECITER
}

export function setReciter(id: string) {
  try {
    localStorage.setItem(RECITER_KEY, id)
  } catch {
    // ignore write failures
  }
}

export function getRuleColours(): boolean {
  try {
    return localStorage.getItem(COLOURS_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setRuleColours(on: boolean) {
  try {
    localStorage.setItem(COLOURS_KEY, on ? 'on' : 'off')
  } catch {
    // ignore write failures
  }
  document.documentElement.classList.toggle(PLAIN_RULES_CLASS, !on)
}
