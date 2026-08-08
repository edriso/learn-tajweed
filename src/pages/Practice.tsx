import { useMemo, useState } from 'react'
import { Shuffle } from 'lucide-react'
import { Link } from 'react-router'
import { Quiz } from '@/components/content/Quiz'
import { usePageTitle } from '@/hooks/usePageTitle'
import { allQuestions, pickQuestions } from '@/lib/quiz'
import { toArabicDigits } from '@/lib/utils'

const ROUND_SIZE = 10

export function Practice() {
  usePageTitle('تمارين مختلطة')
  // The seed is what decides which questions come up. Changing it is the whole
  // of «تمارين جديدة»; the Quiz below remounts because its key changes.
  const [seed, setSeed] = useState(1)

  const questions = useMemo(
    () => pickQuestions(allQuestions, ROUND_SIZE, seed),
    [seed],
  )

  return (
    <div>
      <header className="border-b border-ink-200 pb-8 dark:border-ink-800">
        <h1 className="text-3xl font-extrabold text-ink-900 sm:text-4xl dark:text-ink-50">
          <span aria-hidden="true">🎯</span> تمارين مختلطة
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-600 dark:text-ink-400">
          {toArabicDigits(ROUND_SIZE)} أسئلة مسحوبةً عشوائيًّا من كلّ الدروس. هذا هو الاختبار
          الحقيقيّ: أن تعرف الحكم دون أن يُقال لك أيّ درسٍ نحن فيه.
        </p>
        <p className="mt-3 text-sm text-ink-600 dark:text-ink-400">
          بنك الأسئلة يحوي {toArabicDigits(allQuestions.length)} سؤالًا.
        </p>
      </header>

      {allQuestions.length === 0 ? (
        <p className="mt-10 text-ink-600 dark:text-ink-400">
          لا توجد أسئلةٌ بعد. أضِف بلوك <code>quiz</code> إلى أيّ درس وستظهر هنا تلقائيًّا.
        </p>
      ) : (
        <>
          <Quiz key={seed} questions={questions} title="جولةٌ جديدة" headingLevel="h2" />

          <div className="text-center">
            <button
              type="button"
              onClick={() => setSeed((value) => value + 1)}
              className="inline-flex items-center gap-2 rounded-full bg-green-700 px-6 py-3 font-bold text-white shadow-soft transition hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-500"
            >
              <Shuffle size={18} aria-hidden="true" />
              أسئلةٌ أخرى
            </button>
          </div>
        </>
      )}

      <p className="mt-10 text-center text-ink-600 dark:text-ink-400">
        أخطأتَ في سؤال؟{' '}
        <Link
          to="/"
          className="font-bold text-green-700 hover:underline dark:text-green-400"
        >
          ارجِع إلى درسه
        </Link>{' '}
        واقرأه مرّةً أخرى؛ فالتمرين يكشف الخلل، والدرس يصلحه.
      </p>
    </div>
  )
}
