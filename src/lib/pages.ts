import { parse } from 'yaml'

/**
 * Standalone pages (the summary sheet, the about page) written as Markdown in
 * src/content/pages/. They use exactly the same blocks as the lessons, so
 * `​```ayah` and friends work there too.
 */

export interface PageMeta {
  title: string
  description: string
  emoji: string
}

export interface Page extends PageMeta {
  slug: string
  content: string
}

const files = import.meta.glob('../content/pages/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

const PAGES = new Map<string, Page>(
  Object.entries(files).map(([path, raw]) => {
    const slug = path.split('/').pop()!.replace(/\.md$/, '')
    const match = raw.match(FRONTMATTER)
    if (!match) throw new Error(`الصفحة "${slug}.md" ينقصها بلوك الـ frontmatter.`)
    const meta = parse(match[1]) as PageMeta
    return [slug, { ...meta, slug, content: match[2].trim() }]
  }),
)

export function getPage(slug: string): Page | undefined {
  return PAGES.get(slug)
}
