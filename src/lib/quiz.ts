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

export function parseQuiz(source: string, lesson: string, block: number) {
  const raw = parse(source) as RawQuiz
  const questions: QuizQuestion[] = (raw.questions ?? []).map((question, index) => ({
    ...question,
    lesson,
    id: `${lesson}-${block}-${index}`,
  }))
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
  // Small deterministic PRNG (mulberry32): same seed, same questions.
  let state = seed >>> 0
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const shuffled = pool.slice()
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}
