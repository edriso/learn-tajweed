import { Check, X } from 'lucide-react'

export interface MistakeSpec {
  /** What people commonly do. */
  wrong: string
  /** What the rule actually asks for. */
  right: string
  /** Why, in one sentence. */
  why?: string
}

/**
 * A common recitation mistake, side by side with the correction.
 * The ✗/✓ icons carry the meaning together with the words «الخطأ» and
 * «الصواب», so the card never relies on red and green alone.
 */
export function MistakeCard({ spec }: { spec: MistakeSpec }) {
  return (
    <div className="my-7 overflow-hidden rounded-card border border-ink-200 bg-white shadow-soft dark:border-ink-800 dark:bg-ink-900">
      <div className="grid sm:grid-cols-2">
        <div className="border-b border-ink-200 p-4 sm:border-b-0 sm:border-l dark:border-ink-800">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-rule-idgham dark:text-rule-idgham-dark">
            <X size={16} strokeWidth={3} aria-hidden="true" />
            الخطأ
          </p>
          <p className="text-ink-700 dark:text-ink-300">{spec.wrong}</p>
        </div>
        <div className="p-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-green-700 dark:text-green-400">
            <Check size={16} strokeWidth={3} aria-hidden="true" />
            الصواب
          </p>
          <p className="text-ink-700 dark:text-ink-300">{spec.right}</p>
        </div>
      </div>
      {spec.why && (
        <p className="border-t border-ink-200 bg-ink-100/60 px-4 py-3 text-sm text-ink-600 dark:border-ink-800 dark:bg-ink-800/40 dark:text-ink-400">
          <span className="font-semibold text-ink-800 dark:text-ink-200">لماذا؟ </span>
          {spec.why}
        </p>
      )}
    </div>
  )
}
