import { useEffect, useRef, useState } from 'react'
import { Check, Settings2 } from 'lucide-react'
import {
  getReciter,
  getRuleColours,
  RECITERS,
  setReciter,
  setRuleColours,
} from '@/lib/settings'
import { cn } from '@/lib/utils'

/**
 * Two reader choices in one small popover: the reciter the play buttons use, and
 * whether the rules are coloured.
 *
 * The colour switch is here rather than buried in a page because colouring the
 * Qur'an is a modern study aid that some readers prefer to do without. Turning
 * it off keeps the highlight (as a dotted underline) and drops the colour.
 */
export function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const [reciter, setReciterState] = useState(getReciter)
  const [colours, setColoursState] = useState(getRuleColours)
  const boxRef = useRef<HTMLDivElement>(null)

  // Close on a click outside or on Escape, the way a menu is expected to behave.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function chooseReciter(id: string) {
    setReciter(id)
    setReciterState(id)
  }

  function toggleColours() {
    const next = !colours
    setRuleColours(next)
    setColoursState(next)
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="الإعدادات"
        title="الإعدادات"
        className="rounded-full p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-50"
      >
        <Settings2 size={18} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="الإعدادات"
          className="absolute top-full left-0 z-40 mt-2 w-80 rounded-card border border-ink-200 bg-white p-4 shadow-lift dark:border-ink-700 dark:bg-ink-900"
        >
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-ink-900 dark:text-ink-50">
              صوت التلاوة
            </legend>
            <ul className="space-y-1.5">
              {RECITERS.map((option) => {
                const active = option.id === reciter
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => chooseReciter(option.id)}
                      aria-pressed={active}
                      className={cn(
                        'flex w-full gap-2 rounded-xl border p-2.5 text-right transition',
                        active
                          ? 'border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950'
                          : 'border-transparent hover:bg-ink-100 dark:hover:bg-ink-800',
                      )}
                    >
                      <Check
                        size={16}
                        strokeWidth={3}
                        aria-hidden="true"
                        className={cn(
                          'mt-1 shrink-0 text-green-700 dark:text-green-400',
                          !active && 'invisible',
                        )}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-ink-900 dark:text-ink-50">
                          {option.name}
                        </span>
                        <span className="block text-xs text-ink-600 dark:text-ink-400">
                          {option.note}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </fieldset>

          <hr className="my-3 border-ink-200 dark:border-ink-800" />

          <button
            type="button"
            onClick={toggleColours}
            role="switch"
            aria-checked={colours}
            className="flex w-full items-center justify-between gap-3 rounded-xl p-2 text-right transition hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <span>
              <span className="block text-sm font-semibold text-ink-900 dark:text-ink-50">
                تلوين الأحكام
              </span>
              <span className="block text-xs text-ink-600 dark:text-ink-400">
                إن أطفأتَه بقي التحديد بخطٍّ منقَّط بلا لون.
              </span>
            </span>
            <span
              aria-hidden="true"
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition',
                colours ? 'bg-green-600' : 'bg-ink-300 dark:bg-ink-700',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-5 rounded-full bg-white transition-all',
                  colours ? 'right-0.5' : 'right-5.5',
                )}
              />
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
