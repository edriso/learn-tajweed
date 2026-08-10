import { toArabicDigits } from '@/lib/utils'

/**
 * How far through the curriculum the reader is.
 *
 * Two callers: the home page, above the units, and the foot of a lesson once it
 * has been ticked. It reports and nothing else — no streak, no score, no badge,
 * and that restraint is a decision with evidence behind it rather than an
 * unfinished feature. Before adding any of those three, read rule 7, «No reward
 * mechanics», in CLAUDE.md.
 *
 * The line it holds: a bar answering «how much is left» is information the
 * reader asked for by ticking a box. A reward for ticking is something else.
 */
export function ProgressBar({
  completed,
  total,
  percent,
}: {
  completed: number
  total: number
  percent: number
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-ink-700 dark:text-ink-300">تقدُّمك</span>
        <span className="inline-block min-w-[8ch] text-end text-ink-600 dark:text-ink-400">
          {toArabicDigits(completed)} من {toArabicDigits(total)} درسًا
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuetext={`${toArabicDigits(completed)} من ${toArabicDigits(total)}`}
        aria-label="نسبة ما أتممتَه من الدروس"
        className="h-2.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800"
      >
        <div
          className="h-full rounded-full bg-green-600 transition-[width] duration-500 dark:bg-green-500"
          style={{ inlineSize: `${percent}%` }}
        />
      </div>
    </div>
  )
}
