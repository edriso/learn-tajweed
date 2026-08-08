import { useEffect, useId, useRef, useState } from 'react'
import { Download, Trash2, Upload } from 'lucide-react'
import { useProgress } from '@/hooks/useProgress'
import { lessons } from '@/lib/lessons'
import { cn, countLabel, toArabicDigits } from '@/lib/utils'

/**
 * Move progress between devices, without an account.
 *
 * Progress is localStorage and nothing else, which is the right trade for a site
 * with no backend but leaves the reader stranded when they change phone or clear
 * their browser. A small JSON file they hold themselves is the whole answer: no
 * server learns anything, and the file is readable if they ever want to see what
 * is in it.
 *
 * It lives in the settings panel rather than on a page of its own because almost
 * nobody needs it, and the ones who do go looking for it under the gear.
 */

/** Bumped only if the shape below changes in a way an old reader cannot read. */
const FILE_VERSION = 1
const FILE_APP = 'learn-tajweed'

const LESSON_WORDS: [string, string, string, string] = [
  'درسٌ واحد',
  'درسان',
  'دروس',
  'درسًا',
]

const BUTTON =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'
const NEUTRAL =
  'border-ink-500 text-ink-700 hover:border-green-400 hover:text-green-800 dark:border-ink-500 dark:text-ink-300 dark:hover:border-green-700 dark:hover:text-green-300'

type Status = { tone: 'ok' | 'error'; text: string } | null

export function ProgressTransfer() {
  const { isDone, reset, merge, completed, total } = useProgress()
  const [status, setStatus] = useState<Status>(null)
  const [confirming, setConfirming] = useState(false)
  const labelId = useId()
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Pressing «مسح» unmounts the button that was pressed, which drops focus onto
  // the body and sends the next Tab back to the top of the page. Move it to the
  // confirmation, which is where the reader's attention already is.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
  }, [confirming])

  function download() {
    const saved = {
      app: FILE_APP,
      version: FILE_VERSION,
      savedAt: new Date().toISOString(),
      // Curriculum order, so the file reads like the syllabus rather than like
      // the order the reader happened to tick things off in.
      lessons: lessons.filter((lesson) => isDone(lesson.slug)).map((lesson) => lesson.slug),
    }
    const blob = new Blob([`${JSON.stringify(saved, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tajweed-progress-${saved.savedAt.slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setStatus({ tone: 'ok', text: 'نُزِّل ملفّ تقدُّمك.' })
  }

  async function upload(file: File) {
    setConfirming(false)
    try {
      const parsed: unknown = JSON.parse(await file.text())
      const list = (parsed as { lessons?: unknown } | null)?.lessons
      if (!Array.isArray(list) || list.some((slug) => typeof slug !== 'string')) {
        setStatus({ tone: 'error', text: 'هذا ليس ملفّ تقدُّمٍ من هذا الدليل.' })
        return
      }
      const { recognised, total: saved } = merge(list as string[])
      setStatus(
        recognised === 0
          ? { tone: 'error', text: 'لم نجد في الملفّ أيّ درسٍ من دروس هذا الدليل.' }
          : {
              tone: 'ok',
              text: `تمّ الاستيراد. المحفوظ الآن ${countLabel(saved, LESSON_WORDS)} من ${toArabicDigits(total)}.`,
            },
      )
    } catch {
      setStatus({ tone: 'error', text: 'تعذّرت قراءة الملفّ. اختر ملفًّا بصيغة JSON صدَّرتَه من هنا.' })
    }
  }

  const intro =
    completed === 0
      ? 'لم تُتمّ درسًا بعد. وإن كان لك تقدُّمٌ محفوظٌ في متصفِّحٍ آخر فاستورِد ملفَّه هنا.'
      : `المحفوظ على هذا الجهاز: ${countLabel(completed, LESSON_WORDS)} من ${toArabicDigits(total)}. ` +
        'صدِّره في ملفٍّ لتنقله إلى متصفِّحٍ آخر؛ والاستيراد يُضيف إلى المحفوظ ولا يمحوه.'

  return (
    <div role="group" aria-labelledby={labelId}>
      <p id={labelId} className="text-sm font-bold text-ink-900 dark:text-ink-50">
        تقدُّمك في الدروس
      </p>
      <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{intro}</p>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={download}
          disabled={completed === 0}
          className={cn(BUTTON, NEUTRAL)}
        >
          <Download size={15} aria-hidden="true" />
          تصدير
        </button>

        {/*
          A label wrapping a visually hidden file input, not a button that
          clicks a hidden one: this way the input keeps its own name, its own
          place in the tab order and the browser's own file picker. The ring is
          drawn on the label because the input itself cannot be seen.
        */}
        <label
          className={cn(
            BUTTON,
            NEUTRAL,
            'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green-600 has-[:focus-visible]:ring-offset-2 dark:has-[:focus-visible]:ring-offset-ink-900',
          )}
        >
          <Upload size={15} aria-hidden="true" />
          استيراد
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              // Clear it straight away, so picking the same file twice still
              // fires a change event the second time.
              event.target.value = ''
              if (file) void upload(file)
            }}
          />
        </label>

        {confirming ? (
          <>
            <button
              ref={confirmRef}
              type="button"
              onClick={() => {
                reset()
                setConfirming(false)
                setStatus({ tone: 'ok', text: 'مُسِح تقدُّمك على هذا الجهاز.' })
              }}
              className={cn(
                BUTTON,
                'border-red-600 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950',
              )}
            >
              <Trash2 size={15} aria-hidden="true" />
              تأكيد المسح
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={cn(BUTTON, NEUTRAL)}
            >
              تراجُع
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setStatus(null)
              setConfirming(true)
            }}
            disabled={completed === 0}
            className={cn(BUTTON, NEUTRAL)}
          >
            <Trash2 size={15} aria-hidden="true" />
            مسح
          </button>
        )}
      </div>

      {/* Always mounted, filled later: a live region created in the same tick as
          its text is reliably missed by screen readers. It keeps its empty line
          for the same reason a form keeps room for its error — so the panel does
          not jump under the reader's hand when a message arrives. */}
      <p
        role="status"
        className={cn(
          'mt-2 text-sm',
          status?.tone === 'error'
            ? 'text-red-700 dark:text-red-400'
            : 'text-green-800 dark:text-green-300',
        )}
      >
        {status?.text ?? ''}
      </p>
    </div>
  )
}
