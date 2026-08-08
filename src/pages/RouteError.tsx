import { useEffect, useState } from 'react'
import { ArrowRight, RotateCw } from 'lucide-react'
import { Link, useRouteError } from 'react-router'
import { usePageTitle } from '@/hooks/usePageTitle'

/**
 * What the reader sees when a page fails to load.
 *
 * Nearly always this is one specific thing. Every route past the home page is
 * fetched on demand, GitHub Pages keeps only the newest build, and the file
 * names carry a content hash. So the moment a deploy lands, the chunk a tab
 * opened ten minutes ago no longer exists on the server. That tab follows a
 * link, asks for `assets/About-lcqbP6WZ.js`, is handed the 404 page instead,
 * and the import throws.
 *
 * Nothing is broken: the reader is holding a stale copy of the app. Reloading
 * fetches the current index.html with the current file names and lands on the
 * route they asked for — which is why refreshing always appeared to fix it. So
 * we do it for them, once, rather than showing them an error they would have to
 * understand.
 *
 * Once, because a reload that fails the same way again would spin forever. The
 * second failure in ten seconds is a real error, and gets a page that says so.
 *
 * Two things decide the shape of this. The router commits the navigation before
 * it hands the error over, so by the time this renders the address bar already
 * holds the page the reader clicked and a plain `reload()` finishes the journey.
 * And the router caches a rejected `lazy()` for the life of the page, so trying
 * the link again could never work: only a fresh document can recover, which is
 * why both buttons below are a page load rather than a retry.
 */

/**
 * The same failure, worded five ways. Chrome, Firefox and Safari each have their
 * own phrasing; Vite raises the fourth when it is the stylesheet beside the
 * chunk that has gone; the fifth is Safari again, for a host that answers a
 * missing script with an HTML page and a 200 instead of a 404.
 */
const STALE_BUILD =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|is not a valid JavaScript MIME type/i

const RELOAD_KEY = 'tajweed-stale-build-reload'
const RELOAD_GAP_MS = 10_000

function takeReloadTurn(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0
    if (Date.now() - last < RELOAD_GAP_MS) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    return true
  } catch {
    // No session storage means no way to count the attempts, and an unbounded
    // reload loop is worse than an error page.
    return false
  }
}

export function RouteError() {
  const error = useRouteError()
  const message = error instanceof Error ? error.message : String(error ?? '')
  const stale = STALE_BUILD.test(message)
  const [reloading, setReloading] = useState(false)

  useEffect(() => {
    if (!stale || !takeReloadTurn()) return
    setReloading(true)
    // The router commits the navigation before handing the error over, so the
    // address bar already holds the page the reader clicked. Reloading it
    // finishes the journey rather than restarting it.
    window.location.reload()
  }, [stale])

  usePageTitle(reloading ? 'جارٍ التحديث' : 'تعذَّر فتح الصفحة')

  if (reloading) {
    return (
      <p role="status" className="py-20 text-center text-ink-600 dark:text-ink-400">
        صدرت نسخةٌ جديدة من الموقع، ونحن نُحدِّث الصفحة…
      </p>
    )
  }

  return (
    <div className="py-20 text-center">
      <p className="text-6xl" aria-hidden="true">
        🌐
      </p>
      <h1 className="mt-6 text-3xl font-extrabold text-ink-900 dark:text-ink-50">
        تعذَّر فتح هذه الصفحة
      </h1>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-600 dark:text-ink-400">
        {stale
          ? 'يبدو أنّ نسخة الموقع المفتوحة عندك قديمة. أعِد تحميل الصفحة لتحصل على الجديدة.'
          : 'حدث خطأٌ غير متوقَّع أثناء تحميل الصفحة. أعِد التحميل، فإن بقي الخطأ فعُد إلى قائمة الدروس.'}
      </p>
      <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
        تقدُّمك في الدروس محفوظٌ كما هو، ولا يتأثَّر بهذا.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-full bg-green-700 px-6 py-3 font-bold text-white transition hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-500"
        >
          <RotateCw size={18} aria-hidden="true" />
          أعِد التحميل
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-ink-500 px-6 py-3 font-bold text-ink-700 transition hover:border-green-400 hover:text-green-800 dark:border-ink-500 dark:text-ink-300 dark:hover:border-green-700 dark:hover:text-green-300"
        >
          <ArrowRight size={18} aria-hidden="true" />
          كلّ الدروس
        </Link>
      </div>
    </div>
  )
}
