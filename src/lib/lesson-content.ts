/**
 * The lesson bodies.
 *
 * Kept apart from src/lib/lessons.ts on purpose. This module eagerly imports
 * all thirty-four Markdown files, so whatever imports it pulls every lesson
 * into its chunk. Only the lazy routes may: the lesson page, and the practice
 * page by way of src/lib/quiz.ts. The home page must not, or the entry chunk
 * grows by 60 KB gzipped to render a list of titles.
 *
 * If you find yourself importing this from something the home page reaches,
 * you probably want `lessons` from ./lessons instead — it has everything except
 * the body.
 */
const files = import.meta.glob('../content/lessons/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/

const BY_SLUG = new Map<string, string>()
for (const [path, raw] of Object.entries(files)) {
  const slug = path.split('/').pop()!.replace(/\.md$/, '')
  const match = raw.match(FRONTMATTER)
  if (!match) {
    throw new Error(`الدرس "${slug}.md" ينقصه بلوك الـ frontmatter في أعلى الملف.`)
  }
  BY_SLUG.set(slug, match[1].trim())
}

/** The Markdown body of a lesson, without its frontmatter. */
export function getLessonContent(slug: string): string | undefined {
  return BY_SLUG.get(slug)
}

/** Every lesson body, keyed by slug. Used to pull the quiz blocks out. */
export function allLessonContent(): ReadonlyMap<string, string> {
  return BY_SLUG
}
