import { ArrowLeft, BookOpen, Headphones, ListChecks } from 'lucide-react'
import { Link } from 'react-router'
import { LessonCard } from '@/components/home/LessonCard'
import { ProgressBar } from '@/components/home/ProgressBar'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useProgress } from '@/hooks/useProgress'
import { lessons, lessonsOfUnit } from '@/lib/lessons'
import { RIWAYAH } from '@/lib/site'
import { UNITS } from '@/lib/units'
import { toArabicDigits } from '@/lib/utils'

const HOW_TO_USE = [
  {
    icon: BookOpen,
    title: 'اقرأ الدرس',
    body: 'كلّ درسٍ يشرح حكمًا واحدًا فقط، بلغةٍ بسيطةٍ وأمثلةٍ من القرآن الكريم.',
  },
  {
    icon: Headphones,
    title: 'استمِع وطبِّق',
    body: 'اضغط زرّ الاستماع في كلّ آية، ثمّ أعِد التلاوة بصوتك حتّى تسمع الحكم في نطقك أنت.',
  },
  {
    icon: ListChecks,
    title: 'أجِب عن التمارين',
    body: 'في آخر كلّ درسٍ أسئلةٌ قصيرة تكشف لك ما فهمتَه وما يحتاج إلى إعادة.',
  },
]

export function Home() {
  usePageTitle()
  const { isDone, completed, total, percent, nextLesson } = useProgress()
  const started = completed > 0

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="py-6 text-center sm:py-10">
        <p className="text-sm font-bold text-green-700 dark:text-green-400">
          {RIWAYAH}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold text-ink-900 sm:text-5xl dark:text-ink-50">
          تعلَّم أحكام التجويد
          <span className="mt-1 block text-green-700 dark:text-green-400">خطوةً بخطوة</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-600 dark:text-ink-400">
          أنت تقرأ العربيّة وتعرف التشكيل، لكنّك لا تعرف أسماء الأحكام ولا متى تُطبَّق. هذا
          الدليل يبدأ معك من الصفر، ويرتّب لك الأحكام من الأسهل إلى الأصعب، بأمثلةٍ مسموعةٍ من
          القرآن الكريم وتمارينَ بعد كلّ درس.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={`/lessons/${nextLesson?.slug ?? lessons[0]?.slug ?? ''}`}
            className="inline-flex items-center gap-2 rounded-full bg-green-700 px-6 py-3 font-bold text-white shadow-soft transition hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-500"
          >
            {started ? 'تابِع من حيث توقّفت' : 'ابدأ الدرس الأوّل'}
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <Link
            to="/cheatsheet"
            className="inline-flex items-center gap-2 rounded-full border border-ink-500 px-6 py-3 font-bold text-ink-700 transition hover:border-green-400 hover:text-green-800 dark:border-ink-700 dark:text-ink-300 dark:hover:border-green-700 dark:hover:text-green-300"
          >
            اذهب إلى الخلاصة
          </Link>
        </div>

        <p className="mt-5 text-sm text-ink-600 dark:text-ink-400">
          {toArabicDigits(total)} درسًا في {toArabicDigits(UNITS.length)} وحدات · مجّانيّ
          بالكامل · بلا حسابٍ ولا إعلانات
        </p>
      </section>

      {started && (
        <section className="mt-4 rounded-card border border-ink-200 bg-white p-5 shadow-soft dark:border-ink-800 dark:bg-ink-900">
          <ProgressBar completed={completed} total={total} percent={percent} />
        </section>
      )}

      {/* ── How to use it ────────────────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="text-xl font-bold text-ink-900 dark:text-ink-50">كيف تستعمل هذا الدليل</h2>
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {HOW_TO_USE.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-card border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900"
            >
              <Icon size={22} className="text-green-700 dark:text-green-400" aria-hidden="true" />
              <h3 className="mt-3 font-bold text-ink-900 dark:text-ink-50">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-ink-400">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── The curriculum ───────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="text-2xl font-extrabold text-ink-900 dark:text-ink-50">المنهج</h2>
        <p className="mt-2 text-ink-600 dark:text-ink-400">
          ترتيب الوحدات مقصود: كلّ وحدةٍ تبني على ما قبلها. اقرأها بالترتيب في أوّل مرّة، ثمّ
          عُد إلى ما تحتاجه متى شئت.
        </p>

        {/* Eleven units make a long page, so let readers jump straight to one. */}
        <nav aria-label="الانتقال إلى وحدة" className="mt-5">
          <ul className="flex flex-wrap gap-2">
            {UNITS.map((unit, unitIndex) => (
              <li key={unit.id}>
                <a
                  href={`#unit-${unit.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-400 bg-white px-3 py-1.5 text-sm font-semibold text-ink-700 transition hover:border-green-400 hover:text-green-800 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300 dark:hover:border-green-700 dark:hover:text-green-300"
                >
                  <span className="text-ink-600 dark:text-ink-400">{toArabicDigits(unitIndex + 1)}</span>
                  {unit.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <ol className="mt-8 space-y-12">
          {UNITS.map((unit, unitIndex) => {
            const unitLessons = lessonsOfUnit(unit.id)
            if (unitLessons.length === 0) return null

            return (
              <li key={unit.id} id={`unit-${unit.id}`} className="scroll-mt-24">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {unit.emoji}
                  </span>
                  <div>
                    <h3 className="text-xl font-extrabold text-ink-900 dark:text-ink-50">
                      <span className="text-green-700 dark:text-green-400">
                        الوحدة {toArabicDigits(unitIndex + 1)}:{' '}
                      </span>
                      {unit.title}
                    </h3>
                    <p className="mt-1 text-ink-600 dark:text-ink-400">{unit.description}</p>
                  </div>
                </div>

                <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {unitLessons.map((lesson) => (
                    <li key={lesson.slug}>
                      <LessonCard
                        lesson={lesson}
                        number={lessons.indexOf(lesson) + 1}
                        done={isDone(lesson.slug)}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
