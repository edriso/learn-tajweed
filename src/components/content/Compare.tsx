import { getRule, RULE_PILL_CLASS } from '@/lib/rules'
import { cn } from '@/lib/utils'

export interface CompareColumn {
  title: string
  /** A rule id, used to tint the heading so the columns match the lessons. */
  rule?: string
  points: string[]
}

export interface CompareSpec {
  columns: CompareColumn[]
}

/**
 * Two or three rules side by side. Used wherever readers habitually mix things
 * up, so the difference is visible in one glance instead of buried in prose.
 */
export function Compare({ spec }: { spec: CompareSpec }) {
  const rule = (id?: string) => (id ? getRule(id) : undefined)

  return (
    <div
      className={cn(
        'my-7 grid grid-cols-1 gap-4',
        spec.columns.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
      )}
    >
      {spec.columns.map((column) => {
        const matched = rule(column.rule)
        return (
          <div
            key={column.title}
            className="rounded-card border border-ink-200 bg-white p-4 shadow-soft dark:border-ink-800 dark:bg-ink-900"
          >
            <h3
              className={cn(
                'inline-flex rounded-full px-3 py-1 text-base font-bold',
                matched
                  ? RULE_PILL_CLASS[matched.color]
                  : 'bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-200',
              )}
            >
              {column.title}
            </h3>
            <ul className="mt-3 list-none space-y-2 ps-0 text-ink-700 dark:text-ink-300">
              {column.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span
                    className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink-400"
                    aria-hidden="true"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
