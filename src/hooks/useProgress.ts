import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { lessons } from '@/lib/lessons'

/** Slugs the curriculum actually has, so nothing else can ever be stored. */
const KNOWN = new Set(lessons.map((lesson) => lesson.slug))

/**
 * Which lessons the reader has marked as finished.
 *
 * Progress lives only on this device (localStorage). There is no account and no
 * server, so nothing is ever sent anywhere. Moving it to another device is the
 * reader's own doing, through the export and import buttons in the settings
 * panel — see `components/layout/ProgressTransfer.tsx`.
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

  /**
   * Add an imported list to what is already saved.
   *
   * A union, not a replacement: the file says «I finished these», and that
   * cannot un-finish a lesson this device already knows about. So importing an
   * older export, or a second device's, can never lose work. Unknown slugs are
   * dropped, which is what keeps a renamed lesson or a hand-edited file from
   * inflating the count.
   */
  const merge = useCallback(
    (slugs: readonly string[]) => {
      const recognised = slugs.filter((slug) => KNOWN.has(slug))
      const next = [...new Set([...done, ...recognised])]
      setDone(next)
      return { recognised: recognised.length, total: next.length }
    },
    [done, setDone],
  )

  // Only count lessons that still exist, so a removed lesson cannot push the
  // percentage above 100.
  const completed = useMemo(
    () => lessons.filter((lesson) => doneSet.has(lesson.slug)).length,
    [doneSet],
  )
  const total = lessons.length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

  /**
   * Every lesson done. Guarded on `total` so an empty curriculum — a build with
   * no lesson files — reads as «nothing finished» rather than «all finished».
   */
  const finished = total > 0 && completed === total

  /** The first unfinished lesson, for the «تابِع من حيث توقّفت» button. */
  const nextLesson = useMemo(
    () => lessons.find((lesson) => !doneSet.has(lesson.slug)),
    [doneSet],
  )

  return { isDone, toggle, reset, merge, completed, total, percent, finished, nextLesson }
}
