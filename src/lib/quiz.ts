import { parse } from 'yaml'
import { lessons } from './lessons'

export interface QuizQuestion {
  /** Unique across the whole site: "<lesson>-<block>-<index>". */
  id: string
  q: string
  options: string[]
  /** Index into `options`. */
  answer: number
  /** Shown after answering. Always explain, never just mark it wrong. */
  why: string
  /** Optional Qur'anic phrase the question is about. */
  ref?: string
  word?: string
  /** Slug of the lesson the question came from. */
  lesson: string
}

/** What a ```quiz block looks like once parsed out of the YAML. */
interface RawQuiz {
  title?: string
  questions: Omit<QuizQuestion, 'id' | 'lesson'>[]
}

/** Small deterministic PRNG (mulberry32): same seed, same sequence. */
function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Shuffle a question's options and move `answer` with them.
 *
 * Lesson authors always write the correct answer first, which keeps the files
 * easy to review. Shipping them in that order would teach the reader that the
 * first option is always right, so the order is scrambled here instead. The
 * shuffle is seeded from the question's id, so it is the same on every render
 * and on every device, and answering does not become a memory test of position.
 */
function shuffleOptions(question: QuizQuestion): QuizQuestion {
  const next = random(hash(question.id))
  const order = question.options.map((_, index) => index)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return {
    ...question,
    options: order.map((index) => question.options[index]),
    answer: order.indexOf(question.answer),
  }
}

export function parseQuiz(source: string, lesson: string, block: number) {
  const raw = parse(source) as RawQuiz
  const questions: QuizQuestion[] = (raw.questions ?? []).map((question, index) =>
    shuffleOptions({ ...question, lesson, id: `${lesson}-${block}-${index}` }),
  )
  return { title: raw.title, questions }
}

const QUIZ_BLOCK = /```quiz\r?\n([\s\S]*?)```/g

/**
 * Every question in the whole curriculum, read straight out of the lesson
 * files. The practice page uses this, so there is no second copy of the
 * questions to keep in sync.
 */
export const allQuestions: QuizQuestion[] = lessons.flatMap((lesson) => {
  const matches = [...lesson.content.matchAll(QUIZ_BLOCK)]
  return matches.flatMap((match, block) => parseQuiz(match[1], lesson.slug, block).questions)
})

/**
 * A shuffled subset, for the mixed practice page.
 * `seed` keeps the order stable while the reader is answering: a new seed (from
 * pressing «تمارين جديدة») is what reshuffles the deck.
 */
export function pickQuestions(pool: QuizQuestion[], count: number, seed: number): QuizQuestion[] {
  const next = random(seed)
  const shuffled = pool.slice()
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}
