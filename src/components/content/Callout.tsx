import type { ReactNode } from 'react'
import { AlertTriangle, BookMarked, Lightbulb, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** The four kinds of boxed note a lesson can use. */
export type CalloutKind = 'rule' | 'tip' | 'note' | 'warning'

const STYLES: Record<CalloutKind, { title: string; icon: LucideIcon; box: string; head: string }> = {
  rule: {
    title: 'القاعدة',
    icon: BookMarked,
    box: 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/50',
    head: 'text-green-800 dark:text-green-300',
  },
  tip: {
    title: 'حيلةٌ للحفظ',
    icon: Lightbulb,
    box: 'border-gold-300 bg-gold-100/50 dark:border-gold-800 dark:bg-gold-900/20',
    head: 'text-gold-800 dark:text-gold-300',
  },
  note: {
    title: 'انتبِه',
    icon: Info,
    box: 'border-ink-300 bg-ink-100/70 dark:border-ink-700 dark:bg-ink-800/50',
    head: 'text-ink-800 dark:text-ink-200',
  },
  warning: {
    title: 'تنبيهٌ مهمّ',
    icon: AlertTriangle,
    box: 'border-rule-idgham/40 bg-rule-idgham/5 dark:border-rule-idgham-dark/40 dark:bg-rule-idgham-dark/10',
    head: 'text-rule-idgham dark:text-rule-idgham-dark',
  },
}

export function Callout({
  kind,
  title,
  children,
}: {
  kind: CalloutKind
  /** Overrides the default heading, for when the box needs its own name. */
  title?: string
  children: ReactNode
}) {
  const style = STYLES[kind]
  const Icon = style.icon

  return (
    <aside className={cn('my-7 rounded-card border p-4 sm:p-5', style.box)}>
      <p className={cn('mb-2 flex items-center gap-2 font-bold', style.head)}>
        <Icon size={18} className="shrink-0" aria-hidden="true" />
        {title ?? style.title}
      </p>
      <div className="callout-body text-ink-700 dark:text-ink-300">{children}</div>
    </aside>
  )
}
