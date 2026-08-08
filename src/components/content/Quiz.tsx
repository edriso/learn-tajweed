import { useMemo, useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import { getAyah, getSpan, quranComUrl } from '@/lib/quran'
import type { QuizQuestion } from '@/lib/quiz'
import { cn, toArabicDigits } from '@/lib/utils'

/** The Qur'anic phrase a question is asking about, pulled from the corpus. */
function QuestionText({ question }: { question: QuizQuestion }) {
  if (!question.ref || !question.word) return null
  const ayah = getAyah(question.ref)
  const span = getSpan(question.ref, question.word)
  if (!ayah || !span) return null

  return (
    <p className="mb-3 rounded-xl bg-ink-100/70 px-4 py-3 text-center dark:bg-ink-800/50">
      <span className="quran block">{ayah.text.slice(span[0], span[1])}</span>
      <a
        href={quranComUrl(ayah)}
        target="_blank"
        rel="noreferrer"
        className="mt-1 block text-xs text-ink-600 no-underline transition hover:text-green-700 hover:underline dark:text-ink-400 dark:hover:text-green-400"
      >
        {ayah.surahName} {toArabicDigits(ayah.ayah)}
      </a>
    </p>
  )
}

function Question({
  question,
  index,
  onAnswer,
}: {
  question: QuizQuestion
  index: number
  onAnswer: (correct: boolean) => void
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const answered = picked !== null

  function choose(option: number) {
    if (answered) return
    setPicked(option)
    onAnswer(option === question.answer)
  }

  return (
    <li className="border-t border-ink-200 p-4 first:border-t-0 sm:p-5 dark:border-ink-800">
      <p className="mb-3 font-semibold text-ink-900 dark:text-ink-50">
        <span className="text-green-700 dark:text-green-400">
          {toArabicDigits(index + 1)}.{' '}
        </span>
        {question.q}
      </p>

      <QuestionText question={question} />

      <ul className="grid list-none grid-cols-1 gap-2 ps-0 sm:grid-cols-2">
        {question.options.map((option, optionIndex) => {
          const isAnswer = optionIndex === question.answer
          const isPicked = optionIndex === picked
          return (
            <li key={option}>
              <button
                type="button"
                onClick={() => choose(optionIndex)}
                aria-disabled={answered || undefined}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-start font-medium transition',
                  !answered &&
                    'border-ink-500 bg-white hover:border-green-500 hover:bg-green-50 dark:border-ink-500 dark:bg-ink-900 dark:hover:border-green-600 dark:hover:bg-green-950',
                  answered &&
                    isAnswer &&
                    'border-green-500 bg-green-50 text-green-900 dark:border-green-600 dark:bg-green-950 dark:text-green-200',
                  answered &&
                    isPicked &&
                    !isAnswer &&
                    'border-rule-idgham bg-rule-idgham/5 text-rule-idgham dark:border-rule-idgham-dark dark:text-rule-idgham-dark',
                  answered && !isAnswer && !isPicked && 'border-ink-200 opacity-70 dark:border-ink-800',
                )}
              >
                <span>
                  {option}
                  {answered && isAnswer && <span className="sr-only"> (الإجابة الصحيحة)</span>}
                  {answered && isPicked && !isAnswer && (
                    <span className="sr-only"> (اخترتَها، وهي خطأ)</span>
                  )}
                </span>
                {answered && isAnswer && <Check size={18} strokeWidth={3} aria-hidden="true" />}
                {answered && isPicked && !isAnswer && (
                  <X size={18} strokeWidth={3} aria-hidden="true" />
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <p
        role="status"
        className={cn(
          'mt-3 rounded-xl bg-ink-100/70 px-4 py-3 text-sm text-ink-700 dark:bg-ink-800/50 dark:text-ink-300',
          !answered && 'hidden',
        )}
      >
        {answered && (
          <>
            <span className="font-bold">
              {picked === question.answer
                ? 'إجابةٌ صحيحة. '
                : `الصواب «${question.options[question.answer]}». `}
            </span>
            {question.why}
          </>
        )}
      </p>
    </li>
  )
}

export function Quiz({
  questions,
  title,
  headingLevel: Heading = 'h3',
}: {
  questions: QuizQuestion[]
  title?: string
  /** h2 where the quiz is the page's only section, h3 inside a lesson. */
  headingLevel?: 'h2' | 'h3'
}) {
  // Remounts every child on retry, which clears each question's own state.
  const [attempt, setAttempt] = useState(0)
  const [score, setScore] = useState({ right: 0, done: 0 })

  const finished = score.done === questions.length && questions.length > 0
  const key = useMemo(() => `attempt-${attempt}`, [attempt])

  function record(correct: boolean) {
    setScore((prev) => ({ right: prev.right + (correct ? 1 : 0), done: prev.done + 1 }))
  }

  function retry() {
    setScore({ right: 0, done: 0 })
    setAttempt((value) => value + 1)
  }

  if (questions.length === 0) return null

  return (
    <section className="my-8 overflow-hidden rounded-card border border-ink-200 bg-white shadow-soft dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center justify-between gap-3 border-b border-ink-200 bg-ink-100/60 px-4 py-3 dark:border-ink-800 dark:bg-ink-800/40">
        <Heading className="font-bold text-ink-900 dark:text-ink-50">{title ?? 'اختبِر نفسك'}</Heading>
        <span className="inline-block min-w-[4.5ch] text-end text-sm font-semibold text-ink-600 dark:text-ink-400">
          {toArabicDigits(score.right)} / {toArabicDigits(questions.length)}
        </span>
      </div>

      <ul key={key} className="list-none ps-0">
        {questions.map((question, index) => (
          <Question key={question.id} question={question} index={index} onAnswer={record} />
        ))}
      </ul>

      {finished && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 bg-ink-100/60 px-4 py-3 dark:border-ink-800 dark:bg-ink-800/40">
          <p className="font-semibold text-ink-800 dark:text-ink-200">
            {score.right === questions.length
              ? 'ممتاز، أصبتَ في كلّ الأسئلة. انتقِل إلى الدرس التالي.'
              : 'راجِع ما أخطأتَ فيه ثمّ أعِد المحاولة.'}
          </p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink-500 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-green-400 hover:text-green-700 dark:border-ink-600 dark:text-ink-300 dark:hover:border-green-700 dark:hover:text-green-400"
          >
            <RotateCcw size={15} />
            أعِد المحاولة
          </button>
        </div>
      )}
    </section>
  )
}
