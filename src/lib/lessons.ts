import { parse } from 'yaml'
import { unitOrder } from './units'

/** A video embedded at the end of a lesson. */
export interface LessonVideo {
  title: string
  /** The id from the YouTube URL: youtube.com/watch?v=XXXXXXXXXXX */
  youtubeId: string
  /** Optional: jump straight to a timestamp, in seconds. */
  start?: number
}

/** An outside link shown under «للاستزادة» at the end of a lesson. */
export interface LessonResource {
  title: string
  url: string
  /** One short line saying why this link is worth opening. */
  note?: string
}

/** The YAML block at the top of every lesson file. */
export interface LessonMeta {
  title: string
  /** One sentence a beginner understands, shown on the card and under the title. */
  description: string
  /** Which unit it belongs to. Must match an `id` in src/lib/units.ts. */
  unit: string
  /** Position inside the whole curriculum. Lower comes first. */
  order: number
  /** Rough reading time in minutes, used to set expectations on the card. */
  minutes: number
  emoji: string
  /** 2 to 4 short Arabic keywords shown on the lesson card. */
  tags?: string[]
  videos?: LessonVideo[]
  resources?: LessonResource[]
}

export interface Lesson extends LessonMeta {
  /** URL segment, taken from the file name: ikhfa-haqiqi.md -> "ikhfa-haqiqi" */
  slug: string
  /** The lesson body, as Markdown. */
  content: string
}

/**
 * Load every lesson at build time. Adding a file to src/content/lessons/ is all
 * it takes to add a lesson: no code change anywhere.
 */
const files = import.meta.glob('../content/lessons/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

function parseLesson(path: string, raw: string): Lesson {
  const slug = path.split('/').pop()!.replace(/\.md$/, '')
  const match = raw.match(FRONTMATTER)
  if (!match) {
    throw new Error(`الدرس "${slug}.md" ينقصه بلوك الـ frontmatter في أعلى الملف.`)
  }
  const meta = parse(match[1]) as LessonMeta
  return { ...meta, slug, content: match[2].trim() }
}

/** Every lesson, in curriculum order (by unit first, then by `order`). */
export const lessons: Lesson[] = Object.entries(files)
  .map(([path, raw]) => parseLesson(path, raw))
  .sort((a, b) => unitOrder(a.unit) - unitOrder(b.unit) || a.order - b.order)

const BY_SLUG = new Map(lessons.map((lesson) => [lesson.slug, lesson]))

export function getLesson(slug: string): Lesson | undefined {
  return BY_SLUG.get(slug)
}

/** Lessons of one unit, in order. */
export function lessonsOfUnit(unitId: string): Lesson[] {
  return lessons.filter((lesson) => lesson.unit === unitId)
}

/** The lesson before and after this one, for the «السابق / التالي» links. */
export function neighbours(slug: string): { prev?: Lesson; next?: Lesson } {
  const index = lessons.findIndex((lesson) => lesson.slug === slug)
  if (index === -1) return {}
  return { prev: lessons[index - 1], next: lessons[index + 1] }
}
