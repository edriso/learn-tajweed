#!/usr/bin/env node
/**
 * Generates src/content/lessons.index.json: the frontmatter of every lesson,
 * and nothing else.
 *
 * Why this file exists. Lessons are loaded with an eager `import.meta.glob` of
 * the Markdown, which is what makes "drop a file in src/content/lessons/ and it
 * appears" true with no code change. But a raw import is all-or-nothing: the
 * home page only needs each lesson's title, description and unit, and was
 * pulling all thirty-four lesson bodies into the entry chunk to get them —
 * 60 KB gzipped, 27% of the first load, to render a list of cards.
 *
 * So the metadata is generated here and imported as JSON by src/lib/lessons.ts,
 * while the bodies stay behind src/lib/lesson-content.ts, which only the lazy
 * routes import. The "add a file, no code change" property is unchanged: this
 * script runs before dev and before build.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LESSONS = resolve(ROOT, 'src/content/lessons')
const OUT = resolve(ROOT, 'src/content/lessons.index.json')

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

const files = (await readdir(LESSONS)).filter((file) => file.endsWith('.md')).sort()

const index = []
for (const file of files) {
  const slug = file.replace(/\.md$/, '')
  const raw = await readFile(resolve(LESSONS, file), 'utf8')
  const match = raw.match(FRONTMATTER)
  if (!match) {
    console.error(`✗ الدرس "${file}" ينقصه بلوك الـ frontmatter في أعلى الملف.`)
    process.exit(1)
  }
  index.push({ slug, ...parse(match[1]) })
}

// Stable order in, stable diff out.
await writeFile(OUT, `${JSON.stringify(index, null, 2)}\n`, 'utf8')

console.log(`✓ src/content/lessons.index.json — ${index.length} درسًا (البيانات الوصفيّة فقط).`)
