import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Settings2 } from 'lucide-react'
import {
  getReciter,
  getRuleColours,
  RECITERS,
  setReciter,
  setRuleColours,
} from '@/lib/settings'
import { cn } from '@/lib/utils'

/**
 * Two reader choices in one small panel: which reciter the play buttons use, and
 * whether the rules are coloured.
 *
 * The colour switch is here rather than buried in a page because colouring the
 * Qur'an is a modern study aid that some readers prefer to do without. Turning
 * it off keeps the highlight, as a dotted underline, and drops only the colour.
 *
 * This is a **disclosure**, not a dialog: focus is not trapped and the page
 * behind it stays live, so it is deliberately not announced as one. Escape
 * closes it and returns focus to the button that opened it.
 */
export function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const [reciter, setReciterState] = useState(getReciter)
  const [colours, setColoursState] = useState(getRuleColours)
  const boxRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  const close = useCallback((returnFocus = false) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) close()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close(true)
    }
    // Tabbing past the last control should dismiss it, as a menu would.
    function onFocusOut(event: FocusEvent) {
      if (!boxRef.current?.contains(event.relatedTarget as Node)) close()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    boxRef.current?.addEventListener('focusout', onFocusOut)
    const box = boxRef.current
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      box?.removeEventListener('focusout', onFocusOut)
    }
  }, [open, close])

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
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="الإعدادات"
        title="الإعدادات"
        className="rounded-full p-2 text-ink-600 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-50"
      >
        <Settings2 size={18} />
      </button>

      {open && (
        /*
         * The trigger sits near the edge of the header, so a panel anchored to
         * it would hang off the side of a phone. Below `sm` it is pinned to the
         * viewport instead, just under the header; from `sm` up it goes back to
         * being a popover anchored to the button.
         */
        <div
          id={panelId}
          className="fixed inset-x-3 top-16 z-40 rounded-card border border-ink-200 bg-white p-4 shadow-lift sm:absolute sm:inset-x-auto sm:top-full sm:end-0 sm:mt-2 sm:w-80 dark:border-ink-700 dark:bg-ink-900"
        >
          {/*
            Real radio inputs rather than buttons with `aria-pressed`: the three
            reciters are mutually exclusive, and a fieldset of radios gets the
            grouping, the arrow-key behaviour and the announcement for free.
          */}
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-ink-900 dark:text-ink-50">
              صوت التلاوة
            </legend>
            <div className="space-y-1.5">
              {RECITERS.map((option) => {
                const active = option.id === reciter
                return (
                  <label
                    key={option.id}
                    className={cn(
                      'flex cursor-pointer gap-2.5 rounded-xl border p-2.5 transition',
                      active
                        ? 'border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-950'
                        : 'border-transparent hover:bg-ink-100 dark:hover:bg-ink-800',
                    )}
                  >
                    <input
                      type="radio"
                      name="reciter"
                      value={option.id}
                      checked={active}
                      onChange={() => chooseReciter(option.id)}
                      className="mt-1.5 size-4 shrink-0 accent-green-700 dark:accent-green-500"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-ink-900 dark:text-ink-50">
                        {option.name}
                      </span>
                      <span className="block text-sm text-ink-600 dark:text-ink-400">
                        {option.note}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <hr className="my-3 border-ink-200 dark:border-ink-800" />

          <button
            type="button"
            onClick={toggleColours}
            role="switch"
            aria-checked={colours}
            aria-describedby={`${panelId}-colours`}
            className="flex w-full items-center justify-between gap-3 rounded-xl p-2 text-start transition hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <span>
              <span className="block text-sm font-semibold text-ink-900 dark:text-ink-50">
                تلوين الأحكام
              </span>
              <span
                id={`${panelId}-colours`}
                className="block text-sm text-ink-600 dark:text-ink-400"
              >
                إن أطفأتَه بقي التحديد بخطٍّ منقَّط بلا لون.
              </span>
            </span>
            {/* The knob travels toward the inline end when on, which mirrors
                correctly in a right-to-left layout. */}
            <span
              aria-hidden="true"
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition',
                colours ? 'bg-green-700 dark:bg-green-600' : 'bg-ink-400 dark:bg-ink-600',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-5 rounded-full bg-white transition-all',
                  colours ? 'end-0.5' : 'start-0.5',
                )}
              />
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
