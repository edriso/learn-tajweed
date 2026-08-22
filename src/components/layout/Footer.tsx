import { Link } from 'react-router'
import { GitHubIcon } from './GitHubIcon'
import { getAyah, getSpan } from '@/lib/quran'
import { REPO_URL, RIWAYAH } from '@/lib/site'
import { toArabicDigits } from '@/lib/utils'

/**
 * The verse that names what this whole site is about. It is looked up rather
 * than typed: `npm run quran:build` sees this call and checks the phrase
 * against the mushaf, exactly as it does for a lesson.
 */
function FooterAyah() {
  const ayah = getAyah('73:4')
  const span = getSpan('73:4', 'ورتل القرآن ترتيلا')
  if (!ayah || !span) return null

  return (
    <>
      <p className="quran quran-sm text-center text-green-700 dark:text-green-300">
        {ayah.text.slice(span[0], span[1])}
      </p>
      <p className="mt-2 text-center text-sm text-ink-600 dark:text-ink-400">
        سورة {ayah.surahName}، الآية {toArabicDigits(ayah.ayah)}
      </p>
    </>
  )
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-200 bg-ink-100/60 dark:border-ink-800 dark:bg-ink-900/40">
      {/* Extra bottom room below `xl`: the back-to-top button is fixed in the
          bottom corner, and at the end of the page it sat on top of the GitHub
          link and swallowed its clicks. The overlap only stops once the centred
          896px column is pushed clear of the button, at about 1090px wide. */}
      <div className="mx-auto max-w-4xl px-4 pt-10 pb-24 xl:pb-10">
        <FooterAyah />

        <div className="mt-8 flex flex-col items-center gap-4 border-t border-ink-200 pt-6 text-sm text-ink-600 dark:text-ink-400 sm:flex-row sm:justify-between dark:border-ink-800 dark:text-ink-400">
          <p>
            دليلٌ مجّانيّ مفتوح المصدر على {RIWAYAH}.{' '}
            <Link to="/about" className="font-semibold text-green-700 hover:underline dark:text-green-400">
              اقرأ عن المصادر
            </Link>
          </p>
          {/* Omitted rather than broken: REPO_URL is derived, and a copy built
              outside both CI and a git clone has nothing to point at. */}
          {REPO_URL && (
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 transition hover:text-ink-900 dark:hover:text-ink-50"
            >
              <GitHubIcon size={16} />
              ساهِم في تحسينه
            </a>
          )}
        </div>
      </div>
    </footer>
  )
}
