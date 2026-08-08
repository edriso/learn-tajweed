import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router'
import { usePageTitle } from '@/hooks/usePageTitle'
import { foldArabic } from '@/lib/arabic'
import { TERMS, type Term } from '@/lib/glossary'
import { RULES } from '@/lib/rules'
import { toArabicDigits } from '@/lib/utils'

/** Rules are glossary entries too, so they are folded in rather than retyped. */
const ALL_TERMS: Term[] = [
  ...TERMS,
  ...RULES.map((rule) => ({ term: rule.name, definition: rule.short, lesson: rule.lesson })),
].sort((a, b) => a.term.localeCompare(b.term, 'ar'))

export function Glossary() {
  usePageTitle('معجم المصطلحات')
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const needle = foldArabic(query)
    if (!needle) return ALL_TERMS
    return ALL_TERMS.filter(
      (entry) =>
        foldArabic(entry.term).includes(needle) || foldArabic(entry.definition).includes(needle),
    )
  }, [query])

  return (
    <div>
      <header className="border-b border-ink-200 pb-8 dark:border-ink-800">
        <h1 className="text-3xl font-extrabold text-ink-900 sm:text-4xl dark:text-ink-50">
          <span aria-hidden="true">📖</span> معجم المصطلحات
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-600 dark:text-ink-400">
          كلّ كلمةٍ اصطلاحيّةٍ في هذا الدليل، بتعريفٍ من سطرٍ أو سطرين ورابطٍ إلى درسها. إذا
          مرَّ بك مصطلحٌ في أثناء القراءة فابحث عنه هنا.
        </p>

        <div className="relative mt-6">
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 start-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          {/* The border is the only thing that marks where the field is, so it
              has to clear 3:1 (WCAG 1.4.11) rather than merely be visible. */}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن مصطلح…"
            aria-label="ابحث في المصطلحات"
            className="w-full rounded-full border border-ink-500 bg-white py-3 ps-12 pe-4 text-ink-900 placeholder:text-ink-600 focus:border-green-500 dark:border-ink-500 dark:bg-ink-900 dark:text-ink-50 dark:placeholder:text-ink-400"
          />
        </div>
        <p className="mt-3 text-sm text-ink-600 dark:text-ink-400" role="status">
          {toArabicDigits(results.length)} من {toArabicDigits(ALL_TERMS.length)} مصطلحًا
        </p>
      </header>

      {results.length === 0 ? (
        <p className="mt-10 text-center text-ink-600 dark:text-ink-400">
          لا يوجد مصطلحٌ بهذا الاسم. جرّب كلمةً أقصر.
        </p>
      ) : (
        <dl className="mt-8 space-y-4">
          {results.map((entry) => (
            <div
              key={entry.term}
              className="rounded-card border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900"
            >
              <dt className="text-lg font-extrabold text-ink-900 dark:text-ink-50">{entry.term}</dt>
              {/* No `leading-relaxed` here: some definitions quote a verse in
                  «…», and 1.625 is below Cairo's own `normal` of 1.874. It did
                  not clip, but it was the one place on the site where Qur'anic
                  text sat under a tightened line box. */}
              <dd className="mt-1.5 text-ink-600 dark:text-ink-400">
                {entry.definition}
                {entry.lesson && (
                  <Link
                    to={`/lessons/${entry.lesson}`}
                    className="mt-2 block text-sm font-bold text-green-700 hover:underline dark:text-green-400"
                  >
                    اقرأ الدرس
                  </Link>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
