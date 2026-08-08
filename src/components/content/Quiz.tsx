import { useId, useMemo, useRef, useState } from 'react'
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
        className="mt-1 block text-sm text-ink-600 no-underline transition hover:text-green-700 hover:underline dark:text-ink-400 dark:hover:text-green-400"
      >
        {ayah.surahName} {toArabicDigits(ayah.ayah)}
        <span className="sr-only"> (يفتح في صفحةٍ جديدة)</span>
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
  // Ties the options to the question they belong to. Without it each option
  // button announces only its own label, which on the practice page means forty
  // buttons in a row with no idea what any of them is answering.
  const questionId = useId()

  function choose(option: number) {
    if (answered) return
    setPicked(option)
    onAnswer(option === question.answer)
  }

  return (
    <li className="border-t border-ink-200 p-4 first:border-t-0 sm:p-5 dark:border-ink-800">
      <p id={questionId} className="mb-3 font-semibold text-ink-900 dark:text-ink-50">
        <span className="text-green-700 dark:text-green-400">
          {toArabicDigits(index + 1)}.{' '}
        </span>
        {question.q}
      </p>

      <QuestionText question={question} />

      {/* `group` rather than the default list role: what matters to a screen
          reader here is that these four buttons answer the question above them,
          which `aria-labelledby` then reads out before the first option. */}
      <ul
        role="group"
        aria-labelledby={questionId}
        className="grid list-none grid-cols-1 gap-2 ps-0 sm:grid-cols-2"
      >
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
                  answered && !isAnswer && !isPicked && 'border-ink-200 opacity-80 dark:border-ink-800',
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

      {/* The live region has to be in the accessibility tree BEFORE the answer
          lands in it. A region that is `display:none` until it has something to
          say is created and filled in the same tick, and screen readers reliably
          miss that — which would silently drop the whole point of the quiz. So
          the wrapper is always rendered and only its contents appear. */}
      <div role="status">
        {answered && (
          <p className="mt-3 rounded-xl bg-ink-100/70 px-4 py-3 text-sm text-ink-700 dark:bg-ink-800/50 dark:text-ink-300">
            <span className="font-bold">
              {picked === question.answer
                ? 'إجابةٌ صحيحة. '
                : `الصواب «${question.options[question.answer]}». `}
            </span>
            {question.why}
          </p>
        )}
      </div>
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
  const headingRef = useRef<HTMLHeadingElement>(null)

  const finished = score.done === questions.length && questions.length > 0
  const key = useMemo(() => `attempt-${attempt}`, [attempt])
  const verdict =
    score.right === questions.length
      ? 'ممتاز، أصبتَ في كلّ الأسئلة. انتقِل إلى الدرس التالي.'
      : 'راجِع ما أخطأتَ فيه ثمّ أعِد المحاولة.'

  function record(correct: boolean) {
    setScore((prev) => ({ right: prev.right + (correct ? 1 : 0), done: prev.done + 1 }))
  }

  function retry() {
    setScore({ right: 0, done: 0 })
    setAttempt((value) => value + 1)
    // Pressing this button unmounts it, which drops focus onto <body> and sends
    // the next Tab back to the top of the document. Move focus to the quiz's own
    // heading instead, which is also where the reader wants to be.
    headingRef.current?.focus()
  }

  if (questions.length === 0) return null

  return (
    <section className="my-8 overflow-hidden rounded-card border border-ink-200 bg-white shadow-soft dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center justify-between gap-3 border-b border-ink-200 bg-ink-100/60 px-4 py-3 dark:border-ink-800 dark:bg-ink-800/40">
        {/* No `outline-none` here. Focus lands on this heading after a retry,
            and suppressing the ring unconditionally left a keyboard user with
            no idea where they had been sent. */}
        <Heading ref={headingRef} tabIndex={-1} className="font-bold text-ink-900 dark:text-ink-50">
          {title ?? 'اختبِر نفسك'}
        </Heading>
        <span className="inline-block min-w-[4.5ch] text-end text-sm font-semibold text-ink-600 dark:text-ink-400">
          {toArabicDigits(score.right)} / {toArabicDigits(questions.length)}
        </span>
      </div>

      {/* Tailwind's preflight removes list-style from every ul, and Safari drops
          the list role along with it, so it is restored by hand. */}
      <ul key={key} role="list" className="list-none ps-0">
        {questions.map((question, index) => (
          <Question key={question.id} question={question} index={index} onAnswer={record} />
        ))}
      </ul>

      {/* The region has to be in the tree before the verdict arrives, so it sits
          outside the `finished` block rather than inside it — a region created
          in the same tick that fills it is the race screen readers lose. The
          visible copy below carries no role, and the retry button is kept out
          of the region so it is not read as part of the result. */}
      <div role="status" className="sr-only">
        {finished ? verdict : ''}
      </div>

      {finished && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 bg-ink-100/60 px-4 py-3 dark:border-ink-800 dark:bg-ink-800/40">
          <p className="font-semibold text-ink-800 dark:text-ink-200">{verdict}</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink-500 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:border-green-400 hover:text-green-700 dark:border-ink-500 dark:text-ink-300 dark:hover:border-green-700 dark:hover:text-green-400"
          >
            <RotateCcw size={15} />
            أعِد المحاولة
          </button>
        </div>
      )}
    </section>
  )
}
