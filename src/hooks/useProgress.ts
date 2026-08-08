import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { lessons } from '@/lib/lessons'

/**
 * Which lessons the reader has marked as finished.
 *
 * Progress lives only on this device (localStorage). There is no account and no
 * server, so nothing is ever sent anywhere.
 */
export function useProgress() {
  const [done, setDone] = useLocalStorage<string[]>('tajweed-progress', [])

  const doneSet = useMemo(() => new Set(done), [done])

  const isDone = useCallback((slug: string) => doneSet.has(slug), [doneSet])

  const toggle = useCallback(
    (slug: string) =>
      setDone((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug])),
    [setDone],
  )

  const reset = useCallback(() => setDone([]), [setDone])

  // Only count lessons that still exist, so a removed lesson cannot push the
  // percentage above 100.
  const completed = useMemo(
    () => lessons.filter((lesson) => doneSet.has(lesson.slug)).length,
    [doneSet],
  )
  const total = lessons.length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

  /** The first unfinished lesson, for the «تابِع من حيث توقّفت» button. */
  const nextLesson = useMemo(
    () => lessons.find((lesson) => !doneSet.has(lesson.slug)),
    [doneSet],
  )

  return { isDone, toggle, reset, completed, total, percent, nextLesson }
}
