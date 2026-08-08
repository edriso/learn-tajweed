import { getRule, RULE_TEXT_CLASS } from '@/lib/rules'
import { cn, countLabel } from '@/lib/utils'

export interface LetterSetSpec {
  title: string
  /** The letters, as single Arabic characters. */
  items: string[]
  /** The classical mnemonic sentence that holds the letters, if there is one. */
  mnemonic?: string
  /** Colours the letters to match the rule they belong to. */
  rule?: string
  note?: string
}

/**
 * The letters of a rule, shown as large chips with the count and the classical
 * mnemonic. Scholars grouped these letters into sentences precisely so students
 * could hold them in memory, so the mnemonic is shown right next to them.
 */
export function LetterSet({ spec }: { spec: LetterSetSpec }) {
  const rule = spec.rule ? getRule(spec.rule) : undefined

  return (
    <div className="my-7 rounded-card border border-ink-200 bg-white p-5 shadow-soft dark:border-ink-800 dark:bg-ink-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold text-ink-900 dark:text-ink-50">{spec.title}</h3>
        <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-sm font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-400">
          {countLabel(spec.items.length, ['حرفٌ واحد', 'حرفان', 'أحرف', 'حرفًا'])}
        </span>
      </div>

      <ul className="mt-4 flex list-none flex-wrap gap-2 ps-0">
        {spec.items.map((letter, index) => (
          <li
            key={`${letter}-${index}`}
            className={cn(
              'letter-chip flex size-14 items-center justify-center rounded-xl border border-ink-200 bg-ink-50 text-ink-900 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-50',
              rule && RULE_TEXT_CLASS[rule.color],
            )}
          >
            {letter}
          </li>
        ))}
      </ul>

      {spec.mnemonic && (
        <p className="mt-4 rounded-xl bg-gold-100/50 px-4 py-3 text-center dark:bg-gold-900/20">
          <span className="block text-sm font-semibold text-gold-800 dark:text-gold-300">
            تُجمَع في قولهم
          </span>
          <span className="quran quran-md mt-1 block">
            {spec.mnemonic}
          </span>
        </p>
      )}

      {spec.note && (
        <p className="mt-3 text-sm text-ink-600 dark:text-ink-400">{spec.note}</p>
      )}
    </div>
  )
}
