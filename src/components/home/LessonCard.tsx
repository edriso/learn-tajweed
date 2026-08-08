import { Check, Clock } from 'lucide-react'
import { Link } from 'react-router'
import type { Lesson } from '@/lib/lessons'
import { cn, countLabel, toArabicDigits } from '@/lib/utils'

export function LessonCard({
  lesson,
  number,
  done,
}: {
  lesson: Lesson
  /** Position in the whole curriculum, shown so the order is obvious. */
  number: number
  done: boolean
}) {
  return (
    <Link
      to={`/lessons/${lesson.slug}`}
      className={cn(
        'group flex gap-4 rounded-card border bg-white p-4 transition hover:shadow-soft dark:bg-ink-900',
        done
          ? 'border-green-300 dark:border-green-800'
          : 'border-ink-200 hover:border-green-400 dark:border-ink-800 dark:hover:border-green-700',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
          done
            ? 'bg-green-600 text-white'
            : 'bg-ink-100 text-ink-600 group-hover:bg-green-100 group-hover:text-green-800 dark:bg-ink-800 dark:text-ink-400 dark:group-hover:bg-green-950 dark:group-hover:text-green-300',
        )}
      >
        {done ? <Check size={18} strokeWidth={3} /> : toArabicDigits(number)}
      </span>
      <span className="sr-only">الدرس {toArabicDigits(number)}: </span>

      <div className="min-w-0">
        {/* h4, not h3: this card sits inside a unit whose title is the h3, so an
            h3 here would make every lesson a sibling of its own unit. */}
        <h4 className="font-bold text-ink-900 group-hover:text-green-800 dark:text-ink-50 dark:group-hover:text-green-300">
          <span aria-hidden="true">{lesson.emoji}</span> {lesson.title}
          {done && <span className="sr-only"> (أتممتَه)</span>}
        </h4>
        <p className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
          {lesson.description}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-600 dark:text-ink-400">
          <Clock size={13} aria-hidden="true" />
          نحو {countLabel(lesson.minutes, ['دقيقةً واحدة', 'دقيقتين', 'دقائق', 'دقيقة'])}
        </p>
      </div>
    </Link>
  )
}
