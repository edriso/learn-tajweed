import { useEffect } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock, PlayCircle } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Markdown } from '@/components/content/Markdown'
import { useProgress } from '@/hooks/useProgress'
import { getLesson, neighbours } from '@/lib/lessons'
import { SITE_NAME } from '@/lib/site'
import { getUnit } from '@/lib/units'
import { cn, toArabicDigits } from '@/lib/utils'
import { NotFound } from './NotFound'

export function LessonPage() {
  const { slug = '' } = useParams()
  const lesson = getLesson(slug)
  const { isDone, toggle } = useProgress()

  // The site is a single page app, so the tab title has to be set by hand.
  useEffect(() => {
    document.title = lesson ? `${lesson.title} · ${SITE_NAME}` : SITE_NAME
    return () => {
      document.title = SITE_NAME
    }
  }, [lesson])

  if (!lesson) return <NotFound />

  const unit = getUnit(lesson.unit)
  const { prev, next } = neighbours(lesson.slug)
  const done = isDone(lesson.slug)

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-50"
      >
        <ArrowRight size={16} aria-hidden="true" />
        كلّ الدروس
      </Link>

      <header className="mt-6 border-b border-ink-200 pb-8 dark:border-ink-800">
        {unit && (
          <p className="text-sm font-bold text-green-700 dark:text-green-400">{unit.title}</p>
        )}
        <h1 className="mt-2 flex flex-wrap items-center gap-3 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl dark:text-ink-50">
          <span aria-hidden="true">{lesson.emoji}</span>
          {lesson.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-600 dark:text-ink-400">
          {lesson.description}
        </p>
        <p className="mt-4 flex items-center gap-1.5 text-sm text-ink-500 dark:text-ink-500">
          <Clock size={14} aria-hidden="true" />
          نحو {toArabicDigits(lesson.minutes)} دقائق للقراءة
        </p>
      </header>

      <Markdown slug={lesson.slug}>{lesson.content}</Markdown>

      {/* ── Watch ────────────────────────────────────────────────────── */}
      {lesson.videos && lesson.videos.length > 0 && (
        <section className="mt-14">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-ink-900 dark:text-ink-50">
            <PlayCircle size={22} className="text-green-700 dark:text-green-400" aria-hidden="true" />
            شاهِد
          </h2>
          <div className="mt-4 space-y-6">
            {lesson.videos.map((video) => (
              <figure key={video.youtubeId}>
                <div className="overflow-hidden rounded-card border border-ink-200 dark:border-ink-800">
                  <iframe
                    // youtube-nocookie does not set tracking cookies until play.
                    src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}${
                      video.start ? `?start=${video.start}` : ''
                    }`}
                    title={video.title}
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="aspect-video w-full"
                  />
                </div>
                <figcaption className="mt-2 text-sm text-ink-500 dark:text-ink-400">
                  {video.title}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ── Go deeper ────────────────────────────────────────────────── */}
      {lesson.resources && lesson.resources.length > 0 && (
        <section className="mt-14">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-ink-900 dark:text-ink-50">
            <BookOpen size={22} className="text-green-700 dark:text-green-400" aria-hidden="true" />
            للاستزادة
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {lesson.resources.map((resource) => (
              <li key={resource.url}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-full flex-col rounded-card border border-ink-200 bg-white p-4 transition hover:border-green-400 hover:shadow-soft dark:border-ink-800 dark:bg-ink-900 dark:hover:border-green-700"
                >
                  <span className="font-bold text-ink-900 dark:text-ink-50">{resource.title}</span>
                  {resource.note && (
                    <span className="mt-1 text-sm text-ink-600 dark:text-ink-400">
                      {resource.note}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Mark as done ─────────────────────────────────────────────── */}
      <div className="mt-14 rounded-card border border-ink-200 bg-white p-5 text-center dark:border-ink-800 dark:bg-ink-900">
        <button
          type="button"
          onClick={() => toggle(lesson.slug)}
          aria-pressed={done}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-6 py-3 font-bold transition',
            done
              ? 'bg-green-700 text-white hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-500'
              : 'border border-ink-300 text-ink-700 hover:border-green-400 hover:text-green-800 dark:border-ink-600 dark:text-ink-300 dark:hover:border-green-700 dark:hover:text-green-300',
          )}
        >
          <Check size={18} strokeWidth={3} aria-hidden="true" />
          {done ? 'أتممتَ هذا الدرس' : 'وسم الدرس كمُنجَز'}
        </button>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-500">
          يُحفَظ تقدُّمك على جهازك وحده، بلا حسابٍ ولا خادم.
        </p>
      </div>

      {/* ── Previous / next ──────────────────────────────────────────── */}
      <nav aria-label="التنقّل بين الدروس" className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            to={`/lessons/${prev.slug}`}
            className="group flex items-center gap-3 rounded-card border border-ink-200 bg-white p-4 transition hover:border-green-400 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-green-700"
          >
            <ArrowRight
              size={18}
              className="shrink-0 text-ink-400 transition group-hover:text-green-700 dark:group-hover:text-green-400"
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block text-xs text-ink-500">الدرس السابق</span>
              <span className="block truncate font-bold text-ink-900 dark:text-ink-50">
                {prev.title}
              </span>
            </span>
          </Link>
        ) : (
          <span />
        )}

        {next && (
          <Link
            to={`/lessons/${next.slug}`}
            className="group flex items-center justify-end gap-3 rounded-card border border-ink-200 bg-white p-4 text-left transition hover:border-green-400 sm:col-start-2 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-green-700"
          >
            <span className="min-w-0">
              <span className="block text-xs text-ink-500">الدرس التالي</span>
              <span className="block truncate font-bold text-ink-900 dark:text-ink-50">
                {next.title}
              </span>
            </span>
            <ArrowLeft
              size={18}
              className="shrink-0 text-ink-400 transition group-hover:text-green-700 dark:group-hover:text-green-400"
              aria-hidden="true"
            />
          </Link>
        )}
      </nav>
    </div>
  )
}
