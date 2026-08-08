import { toArabicDigits } from '@/lib/utils'

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
        <span className="text-ink-600 tabular-nums dark:text-ink-400">
          {toArabicDigits(completed)} من {toArabicDigits(total)} درسًا
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
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
