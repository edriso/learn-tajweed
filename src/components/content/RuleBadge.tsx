import { Link } from 'react-router'
import { getRule, RULE_PILL_CLASS } from '@/lib/rules'
import { cn } from '@/lib/utils'

/**
 * The name of a rule as a coloured pill, linking to the lesson that teaches it.
 * The colour never carries meaning on its own: the name is always written next
 * to it, so the page still works in black and white and for colour-blind
 * readers.
 */
export function RuleBadge({ id, className }: { id: string; className?: string }) {
  const rule = getRule(id)
  if (!rule) return null

  return (
    <Link
      to={`/lessons/${rule.lesson}`}
      title={rule.short}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold no-underline transition hover:brightness-95 dark:hover:brightness-110',
        RULE_PILL_CLASS[rule.color],
        className,
      )}
    >
      {rule.name}
    </Link>
  )
}
