#!/usr/bin/env node
/**
 * Writes a copy of dist/index.html at every route the site has, so GitHub Pages
 * answers a deep link with 200 instead of 404, and gives each copy its own
 * title and description.
 *
 * GitHub Pages serves static files only: it knows nothing about client-side
 * routing. The usual fix is to copy index.html to 404.html, and that does make
 * deep links work, but the response still carries a 404 status. Search engines
 * and link previews treat that as a dead page, and a lesson nobody can share is
 * a lesson nobody reads.
 *
 * Writing dist/practice/index.html and dist/lessons/<slug>/index.html gives
 * every route a real file and a real 200. The 404.html copy stays as the
 * fallback for anything genuinely missing, where a 404 is the correct answer.
 *
 * The head of each copy is then rewritten from the lesson's own frontmatter.
 * React sets `document.title` on navigation, but the crawlers behind a WhatsApp
 * or Telegram link preview do not run JavaScript: they read the HTML as served.
 * Without this every one of the 38 routes previews as the home page, which is
 * how most people would first meet a lesson someone sent them.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(ROOT, 'dist')
const SOURCE = resolve(DIST, 'index.html')

/** Must match `base` in vite.config.ts and the Pages URL it is served from. */
const ORIGIN = 'https://edriso.github.io'
const BASE = '/learn-tajweed/'

/** Kept in step with SITE_NAME in src/lib/site.ts. */
const SITE_NAME = 'تعلَّم التجويد'

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

async function frontmatter(file) {
  const raw = await readFile(file, 'utf8')
  const match = raw.match(FRONTMATTER)
  if (!match) throw new Error(`${file}: ينقصه بلوك الـ frontmatter في أعلى الملف.`)
  return parse(match[1])
}

/**
 * The two pages that are code rather than content have no frontmatter to read,
 * so their descriptions live here. Everything else takes its text from the
 * Markdown file, which keeps the content the single source of truth.
 */
const CODE_PAGES = {
  practice: {
    title: 'تمارين مختلطة',
    description:
      'تمارينُ من كلّ دروس الدليل في مكانٍ واحد، تُعرض بترتيبٍ مختلف كلّ مرّة، لتختبر ما رسخ من أحكام التجويد.',
  },
  glossary: {
    title: 'معجم المصطلحات',
    description:
      'شرحٌ موجزٌ لمصطلحات التجويد الواردة في الدليل، مرتَّبةً للرجوع السريع مع رابط الدرس الذي يفصّل كلَّ واحدٍ منها.',
  },
}

const lessonFiles = (await readdir(resolve(ROOT, 'src/content/lessons')))
  .filter((file) => file.endsWith('.md'))
  .sort()

/** Every route to write, each with the head it should carry. */
const routes = []

for (const [slug, meta] of Object.entries(CODE_PAGES)) {
  routes.push({ path: slug, ...meta })
}

for (const slug of ['cheatsheet', 'about']) {
  const meta = await frontmatter(resolve(ROOT, `src/content/pages/${slug}.md`))
  routes.push({ path: slug, title: meta.title, description: meta.description })
}

for (const file of lessonFiles) {
  const slug = file.replace(/\.md$/, '')
  const meta = await frontmatter(resolve(ROOT, `src/content/lessons/${file}`))
  routes.push({ path: `lessons/${slug}`, title: meta.title, description: meta.description })
}

const template = await readFile(SOURCE, 'utf8')

// This pass rewrites dist/index.html in place, so running it twice over the same
// dist would stack a second canonical on top of the first. Vite regenerates the
// file on every build, so this only catches the script being run on its own.
if (template.includes('rel="canonical"')) {
  throw new Error(
    'prerender: dist/index.html مُعالَجٌ من قبل. شغّل `npm run build` كاملًا بدل هذا السكربت وحده.',
  )
}

/** Arabic text carries none of these, but a description is free text. */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Swaps one tag in the head. Throws rather than returning the input unchanged:
 * a silent miss here would ship 38 pages that all claim to be the home page,
 * and nothing downstream would notice.
 */
function replaceTag(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(
      `prerender: لم يُعثر على وسم «${label}» في dist/index.html. ` +
        `غالبًا تغيّر index.html — حدِّث scripts/prerender-routes.mjs ليطابقه.`,
    )
  }
  return html.replace(pattern, replacement)
}

function headFor({ path, title, description }) {
  const fullTitle = `${title} · ${SITE_NAME}`
  const url = `${ORIGIN}${BASE}${path}`
  const t = escapeHtml(fullTitle)
  const d = escapeHtml(description)

  let html = template
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${t}</title>`, 'title')
  html = replaceTag(
    html,
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${d}" />`,
    'description',
  )
  html = replaceTag(
    html,
    /<meta\s+property="og:title"[\s\S]*?\/>/,
    `<meta property="og:title" content="${t}" />`,
    'og:title',
  )
  html = replaceTag(
    html,
    /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${d}" />`,
    'og:description',
  )
  // A shared link should resolve to one canonical address, and og:url is what
  // the preview card links back to.
  html = replaceTag(
    html,
    /<meta\s+property="og:type"[\s\S]*?\/>/,
    `<meta property="og:type" content="article" />\n    ` +
      `<meta property="og:url" content="${url}" />\n    ` +
      `<link rel="canonical" href="${url}" />`,
    'og:type',
  )
  return html
}

for (const route of routes) {
  const target = resolve(DIST, route.path, 'index.html')
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, headFor(route), 'utf8')
}

// The home page keeps the head it already has; it only gains its canonical.
await writeFile(
  SOURCE,
  replaceTag(
    template,
    /<meta\s+property="og:type"[\s\S]*?\/>/,
    `<meta property="og:type" content="website" />\n    ` +
      `<meta property="og:url" content="${ORIGIN}${BASE}" />\n    ` +
      `<link rel="canonical" href="${ORIGIN}${BASE}" />`,
    'og:type',
  ),
  'utf8',
)

// The fallback for URLs that really do not exist. Copied from the template
// rather than the rewritten home page, so it claims no canonical of its own.
await writeFile(resolve(DIST, '404.html'), template, 'utf8')

// A sitemap so the lessons can be found, not only shared.
const urls = ['', ...routes.map((route) => route.path)]
  .map((path) => `  <url><loc>${ORIGIN}${BASE}${path}</loc></url>`)
  .join('\n')

await writeFile(
  resolve(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  'utf8',
)

await writeFile(
  resolve(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}${BASE}sitemap.xml\n`,
  'utf8',
)

console.log(
  `✓ Pre-rendered ${routes.length} routes plus the 404 fallback, each with its own title, ` +
    `and wrote sitemap.xml and robots.txt.`,
)
