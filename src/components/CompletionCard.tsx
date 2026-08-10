import { useEffect, useRef, type CSSProperties } from 'react'
import { BookOpen, ScrollText, Sparkles, Target } from 'lucide-react'
import { Link } from 'react-router'
import { ayahLabel, getAyah, getSpan } from '@/lib/quran'
import { UNITS } from '@/lib/units'
import { cn, countLabel, toArabicDigits } from '@/lib/utils'

/**
 * What the reader sees when the last lesson is ticked.
 *
 * Two callers, one card. The lesson page mounts it with `celebrate` at the exact
 * moment the last remaining lesson is marked done, which is the only place the
 * burst plays. The home page mounts it in place of the progress bar for as long
 * as progress stays at 100%, with no animation — an entrance that replays on
 * every visit stops reading as a celebration and starts reading as a page that
 * cannot settle.
 *
 * The tone is deliberate. Finishing thirty-four lessons about the recitation of
 * the Qur'an is worth marking, and it is also not the finish of anything: the
 * verse below is a du'a for *more* knowledge, and the card says plainly that a
 * shaykh is still the next step. A guide that congratulated the reader into
 * thinking they were done would be teaching the one thing this site denies.
 */

/**
 * «وَقُل رَّبِّ زِدْنِى عِلْمًا».
 *
 * Not typed: looked up by reference, so `npm run quran:build` sees this call and
 * checks the phrase against the pinned mushaf exactly as it checks a lesson's.
 * See docs/quran-pipeline.md.
 */
function CompletionAyah() {
  const ayah = getAyah('20:114')
  const span = getSpan('20:114', 'وقل رب زدني علما')
  if (!ayah || !span) return null

  return (
    <figure className="mt-5">
      {/* `quran-md`, never a `text-*` size utility: those set a line-height too,
          and this font needs its full 2.5 line box or the tashkeel is clipped. */}
      <p className="quran quran-md text-center text-green-800 dark:text-green-300">
        {ayah.text.slice(span[0], span[1])}
      </p>
      <figcaption className="mt-1 text-center text-sm text-ink-600 dark:text-ink-400">
        {ayahLabel(ayah, toArabicDigits)}
      </figcaption>
    </figure>
  )
}

/**
 * The burst: a gold halo blooming out of the badge and eight flecks thrown off
 * it. Purely decorative, so it is `aria-hidden` and it is the first thing
 * `prefers-reduced-motion` removes — the animations end at `opacity: 0`, so the
 * global reduced-motion rule in index.css, which collapses every duration to
 * nothing, lands them on that final frame and the reader simply never sees them.
 *
 * The flecks are thrown at fixed angles from the centre rather than positioned
 * against an edge, so the arrangement is symmetric and there is no side for RTL
 * to get wrong.
 */
const FLECK_ANGLES = [18, 62, 108, 152, 198, 242, 288, 332]

function Burst() {
  return (
    <span aria-hidden="true">
      <span className="khatm-halo" />
      {FLECK_ANGLES.map((angle, index) => (
        <span
          key={angle}
          className="khatm-fleck"
          style={
            {
              '--khatm-angle': `${angle}deg`,
              '--khatm-delay': `${index * 45}ms`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  )
}

const LINK =
  'inline-flex items-center gap-1.5 rounded-full border border-gold-600/50 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:border-gold-600 hover:text-green-800 dark:border-gold-700/60 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-gold-600 dark:hover:text-green-300'

export function CompletionCard({
  total,
  celebrate = false,
  showLessonsLink = false,
  className,
}: {
  /** Lessons in the curriculum, so the card never hardcodes the count. */
  total: number
  /** Play the one-time burst. True only at the moment of finishing. */
  celebrate?: boolean
  /** The home page already *is* «الدروس», so it leaves that link out. */
  showLessonsLink?: boolean
  className?: string
}) {
  const card = useRef<HTMLElement>(null)

  /*
   * The mark-as-done button sits at the very bottom of a lesson, so on a phone
   * this card mounts entirely below the fold: the reader taps, the button's
   * label changes, and the thing the tap was for happens where they cannot see
   * it. `nearest` scrolls the least that makes it visible rather than dragging
   * the page to a fixed point.
   *
   * Deliberately no `focus()` alongside it. `focus()` scrolls too, instantly,
   * which cancels a smooth scroll already in flight — the bug that cost the
   * back-to-top button two clicks per press. Nothing here needs focus moved:
   * the announcement is made by the live region the lesson page keeps mounted
   * beside its button, and the reader's next Tab reaches these links anyway.
   */
  useEffect(() => {
    if (!celebrate) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    card.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' })
  }, [celebrate])

  return (
    // No `role="status"` here, and no live region: this card is ordinary visible
    // content. The announcement is made by the region the lesson page already
    // keeps mounted next to its mark-as-done button, because a live region
    // created in the same tick as its text is the race screen readers lose.
    <section
      ref={card}
      className={cn(
        'relative rounded-card border border-gold-300 bg-white p-5 text-center shadow-soft sm:p-7 dark:border-gold-800 dark:bg-ink-900',
        className,
      )}
    >
      {/* Gold, not the site's green. Gold is how this site marks something
          singular — the rule under a section heading, an ayah number — and the
          reader arrives here once. */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-card bg-linear-to-r from-transparent via-gold-400 to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex size-14 items-center justify-center rounded-full bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300">
        <Sparkles size={26} aria-hidden="true" className={celebrate ? 'khatm-badge' : undefined} />
        {celebrate && <Burst />}
      </div>

      <h2 className="mt-4 text-2xl font-extrabold text-ink-900 sm:text-3xl dark:text-ink-50">
        تمَّ المنهج، والحمد لله
      </h2>
      <p className="mt-2 text-ink-600 dark:text-ink-400">
        أتممتَ {countLabel(total, ['درسًا واحدًا', 'درسين', 'دروس', 'درسًا'])} في{' '}
        {countLabel(UNITS.length, ['وحدةٍ واحدة', 'وحدتين', 'وحدات', 'وحدة'])}، من مخارج الحروف
        إلى التطبيق والإتقان.
      </p>

      <CompletionAyah />

      {/* The honest next step, and the one the reader is likeliest to skip. It
          is the same warning as «عن هذا الدليل», put where it lands hardest: at
          the moment someone might conclude they have finished. */}
      <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-ink-600 dark:text-ink-400">
        وقد عرفتَ الأحكام وأسماءها، وبقي ما لا يُنال إلّا بالمشافهة: أن تعرض تلاوتك على
        مُقرِئٍ متقنٍ يسمعها ويصحّحها لك. فهذه الدروس تفتح الباب، والشيخ يُدخلك منه.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/practice" className={LINK}>
          <Target size={15} aria-hidden="true" />
          راجِع بالتمارين
        </Link>
        <Link to="/cheatsheet" className={LINK}>
          <ScrollText size={15} aria-hidden="true" />
          الخلاصة
        </Link>
        {showLessonsLink && (
          <Link to="/" className={LINK}>
            <BookOpen size={15} aria-hidden="true" />
            كلّ الدروس
          </Link>
        )}
      </div>
    </section>
  )
}
