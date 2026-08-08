#!/usr/bin/env node
/**
 * Writes a copy of dist/index.html at every route the site has, so GitHub Pages
 * answers a deep link with 200 instead of 404, and gives each copy its own
 * head and a static Arabic body.
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
 * Three things each copy then gets:
 *
 * 1. Its own <title>, description, Open Graph tags and canonical, from the
 *    lesson's own frontmatter. React sets `document.title` on navigation, but
 *    the crawlers behind a WhatsApp or Telegram link preview do not run
 *    JavaScript: they read the HTML as served. Without this every one of the
 *    38 routes previews as the home page.
 *
 * 2. A static Arabic rendering of the lesson inside #root. Google decides a
 *    page's language from its visible content, not from `lang="ar"`, and
 *    crawlers that never run JavaScript (Bing, Yandex, the LLM crawlers) would
 *    otherwise see an empty div. `createRoot` replaces this wholesale on mount,
 *    so there is no hydration contract to honour — it is for crawlers only.
 *
 * 3. JSON-LD: a breadcrumb per lesson, and the site identity on the home page.
 *
 * Every URL here ends in a slash. GitHub Pages serves a directory index only at
 * the trailing-slash form and 301s the bare form, so a canonical without it
 * points every crawler and every shared card at a redirect.
 */
import { execFile } from 'node:child_process'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { parse } from 'yaml'

const run = promisify(execFile)

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(ROOT, 'dist')
const SOURCE = resolve(DIST, 'index.html')

/** Must match `base` in vite.config.ts and the Pages URL it is served from. */
const ORIGIN = 'https://edriso.github.io'
const BASE = '/learn-tajweed/'

/** Kept in step with SITE_NAME in src/lib/site.ts. */
const SITE_NAME = 'تعلَّم التجويد'

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

async function readDoc(file) {
  const raw = await readFile(file, 'utf8')
  const match = raw.match(FRONTMATTER)
  if (!match) throw new Error(`${file}: ينقصه بلوك الـ frontmatter في أعلى الملف.`)
  return { meta: parse(match[1]), body: match[2].trim() }
}

/**
 * The units, in curriculum order, read out of the one file that defines them.
 * Used for the lesson breadcrumb and for the home page's static outline.
 */
async function readUnits() {
  const source = await readFile(resolve(ROOT, 'src/lib/units.ts'), 'utf8')
  const units = new Map()
  const entry =
    /id:\s*'([^']+)',\s*\n\s*title:\s*'((?:[^'\\]|\\.)*)',\s*\n\s*description:\s*'((?:[^'\\]|\\.)*)'/g
  for (const [, id, title, description] of source.matchAll(entry)) {
    units.set(id, { title, description })
  }
  if (units.size === 0) {
    throw new Error('prerender: تعذّر قراءة الوحدات من src/lib/units.ts.')
  }
  return units
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * One line of Markdown reduced to plain text: links to their label, emphasis
 * and code ticks removed, blockquote marker dropped. Table cells go through
 * this too — without it, a cell written `**الصغرى**` rendered its asterisks
 * literally into the static body.
 */
function inline(text) {
  return escapeHtml(
    text
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/^>\s*/, ''),
  )
}

/**
 * Prose-bearing keys inside the custom blocks. Four fifths of a lesson lives in
 * fenced YAML rather than in paragraphs, so skipping the fences entirely would
 * throw away most of the Arabic on the page.
 *
 * `text` is deliberately absent: in an `ayah` block that field holds Qur'anic
 * words, and the verse itself belongs to the corpus, not to this file.
 *
 * `options` is deliberately absent too. A quiz's wrong answers are only wrong
 * in the presence of the question and the buttons; stripped into bare
 * paragraphs they read as flat assertions about how to recite the Qur'an, and
 * this text is now fed to crawlers that summarise. The question (`q`) and the
 * explanation (`why`) carry the teaching without that risk.
 */
const PROSE_KEYS = new Set(['title', 'note', 'mnemonic', 'q', 'why', 'description'])

/** Fences whose body is Markdown rather than YAML. Mirrors CALLOUTS in src/components/content/Markdown.tsx. */
const CALLOUT_LANGS = new Set(['rule', 'tip', 'note', 'warning'])

/** Every prose string in a parsed block, depth-first. */
function proseFrom(value, key, into) {
  if (typeof value === 'string') {
    if (PROSE_KEYS.has(key) && value.trim()) into.push(value.trim())
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) proseFrom(item, key, into)
    return
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) proseFrom(v, k, into)
  }
}

/**
 * A deliberately small Markdown-to-HTML pass, for the static body only.
 *
 * It covers what carries the Arabic prose — headings, paragraphs, list items,
 * table cells, and the human-readable fields of the custom blocks. It is not
 * trying to reproduce the React rendering; it only has to give a crawler that
 * never runs JavaScript real Arabic sentences to read.
 */
function staticBody(markdown) {
  const out = []
  let fenceLang = null
  let fenceLines = null

  for (const line of markdown.split('\n')) {
    const fence = line.match(/^\s*```(\w*)/)
    if (fence) {
      if (fenceLang === null) {
        fenceLang = fence[1] || ''
        fenceLines = []
      } else {
        // Closing fence: pull the readable strings out of the block.
        const source = fenceLines.join('\n')
        if (CALLOUT_LANGS.has(fenceLang)) {
          // A callout body is Markdown, not YAML — run it through this pass.
          out.push(staticBody(source))
        } else if (fenceLang && fenceLang !== 'text') {
          const strings = []
          try {
            proseFrom(parse(source), '', strings)
          } catch {
            // A malformed block is build-quran.mjs's problem, not this pass's.
          }
          // Through inline() too: a block's `note` may itself contain **bold**.
          for (const s of strings) out.push(`<p>${inline(s)}</p>`)
        }
        fenceLang = null
        fenceLines = null
      }
      continue
    }
    if (fenceLang !== null) {
      fenceLines.push(line)
      continue
    }

    const text = line.trim()
    if (!text) continue

    const heading = text.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6)
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      continue
    }
    if (/^[-*]\s+/.test(text)) {
      out.push(`<li>${inline(text.replace(/^[-*]\s+/, ''))}</li>`)
      continue
    }
    if (/^\|/.test(text)) {
      // A table row. Skip the |---|---| separator; render cells as one line.
      if (/^\|[\s|:-]+\|$/.test(text)) continue
      const cells = text.split('|').slice(1, -1).map((c) => c.trim()).filter(Boolean)
      if (cells.length) out.push(`<p>${inline(cells.join(' · '))}</p>`)
      continue
    }
    out.push(`<p>${inline(text)}</p>`)
  }
  return out.join('\n')
}

function jsonLd(data) {
  // </script> inside a JSON-LD block would close it early.
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
}

const lessonFiles = (await readdir(resolve(ROOT, 'src/content/lessons')))
  .filter((file) => file.endsWith('.md'))
  .sort()

const units = await readUnits()

/** Every route to write, each with the head and body it should carry. */
const routes = []

for (const [slug, meta] of Object.entries(CODE_PAGES)) {
  routes.push({ path: slug, ...meta, ogType: 'website' })
}

for (const slug of ['cheatsheet', 'about']) {
  const { meta, body } = await readDoc(resolve(ROOT, `src/content/pages/${slug}.md`))
  routes.push({
    path: slug,
    title: meta.title,
    description: meta.description,
    ogType: 'article',
    body,
    file: `src/content/pages/${slug}.md`,
  })
}

for (const file of lessonFiles) {
  const slug = file.replace(/\.md$/, '')
  const { meta, body } = await readDoc(resolve(ROOT, `src/content/lessons/${file}`))
  routes.push({
    path: `lessons/${slug}`,
    title: meta.title,
    description: meta.description,
    ogType: 'article',
    body,
    unitId: meta.unit,
    unit: units.get(meta.unit)?.title,
    order: meta.order,
    file: `src/content/lessons/${file}`,
  })
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

const ROOT_DIV = '<div id="root"></div>'

function render(route) {
  const { path, title, description, ogType } = route
  const fullTitle = `${title} · ${SITE_NAME}`
  const url = `${ORIGIN}${BASE}${path}/`
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
  html = replaceTag(
    html,
    /<meta\s+property="og:type"[\s\S]*?\/>/,
    `<meta property="og:type" content="${ogType}" />\n    ` +
      `<meta property="og:url" content="${url}" />\n    ` +
      `<link rel="canonical" href="${url}" />`,
    'og:type',
  )

  const crumbs = [{ name: SITE_NAME, item: `${ORIGIN}${BASE}` }]
  if (route.unit) crumbs.push({ name: route.unit })
  crumbs.push({ name: title, item: url })

  const ld = jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.item ? { item: crumb.item } : {}),
    })),
  })
  html = html.replace('</head>', `  ${ld}\n  </head>`)

  if (route.body) {
    const body =
      `<h1>${escapeHtml(title)}</h1>\n<p>${d}</p>\n${staticBody(route.body)}`
    html = html.replace(ROOT_DIV, `<div id="root">${body}</div>`)
  }
  return html
}

for (const route of routes) {
  const target = resolve(DIST, route.path, 'index.html')
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, render(route), 'utf8')
}

// The home page keeps its own head; it gains a canonical and the site identity.
const homeLd = jsonLd({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${ORIGIN}${BASE}#website`,
      url: `${ORIGIN}${BASE}`,
      name: SITE_NAME,
      inLanguage: 'ar',
      description:
        'دليلٌ مجّانيٌّ لتعلُّم أحكام تجويد القرآن الكريم على رواية حفص عن عاصم من طريق الشاطبيّة.',
    },
    {
      '@type': 'EducationalOrganization',
      '@id': `${ORIGIN}${BASE}#org`,
      name: SITE_NAME,
      url: `${ORIGIN}${BASE}`,
    },
  ],
})

let home = replaceTag(
  template,
  /<meta\s+property="og:type"[\s\S]*?\/>/,
  `<meta property="og:type" content="website" />\n    ` +
    `<meta property="og:url" content="${ORIGIN}${BASE}" />\n    ` +
    `<link rel="canonical" href="${ORIGIN}${BASE}" />`,
  'og:type',
)
home = home.replace('</head>', `  ${homeLd}\n  </head>`)

/*
 * The home page has no Markdown file behind it, so its static body is built
 * from the curriculum itself: the eleven units in order, each with its lessons.
 * This is the page most likely to be indexed for a general Arabic query about
 * tajweed, and without it the site's front door is an empty div.
 */
const lessonRoutes = routes.filter((route) => route.unitId)
const outline = [...units.entries()]
  .map(([id, unit]) => {
    const inUnit = lessonRoutes
      .filter((route) => route.unitId === id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    if (inUnit.length === 0) return ''
    const items = inUnit
      .map(
        (route) =>
          `<li><a href="${BASE}${route.path}/">${escapeHtml(route.title)}</a> — ` +
          `${escapeHtml(route.description)}</li>`,
      )
      .join('\n')
    return (
      `<h2>${escapeHtml(unit.title)}</h2>\n<p>${escapeHtml(unit.description)}</p>\n<ul>\n${items}\n</ul>`
    )
  })
  .filter(Boolean)
  .join('\n')

home = home.replace(
  ROOT_DIV,
  `<div id="root"><h1>تعلَّم أحكام التجويد خطوةً بخطوة</h1>\n` +
    `<p>دليلٌ مجّانيٌّ لأحكام تجويد القرآن الكريم على رواية حفص عن عاصم من طريق ` +
    `الشاطبيّة، مكتوبٌ لمن يقرأ العربيّة ويعرف التشكيل لكنّه لا يعرف أسماء الأحكام ` +
    `ولا متى تُطبَّق. ${escapeHtml(String(lessonRoutes.length))} درسًا في ` +
    `${escapeHtml(String(units.size))} وحدة، من الأسهل إلى الأصعب.</p>\n${outline}</div>`,
)
await writeFile(SOURCE, home, 'utf8')

// The fallback for anything genuinely missing. It gets its own title so a
// mistyped link does not preview as the home page, and no canonical.
await writeFile(
  resolve(DIST, '404.html'),
  replaceTag(
    template,
    /<title>[\s\S]*?<\/title>/,
    `<title>الصفحة غير موجودة · ${SITE_NAME}</title>`,
    'title',
  ),
  'utf8',
)

/**
 * Last commit date per content file, for <lastmod>. One `git log` call per file
 * is fine at build time. Needs full history: the deploy workflow sets
 * fetch-depth: 0 for exactly this. Without git, lastmod is simply omitted —
 * a wrong date is worse than none, since Google only trusts it when accurate.
 */
async function lastModified(file) {
  if (!file) return undefined
  try {
    const { stdout } = await run('git', ['log', '-1', '--format=%cs', '--', file], { cwd: ROOT })
    return stdout.trim() || undefined
  } catch {
    return undefined
  }
}

const entries = [{ path: '', file: 'src/pages/Home.tsx' }, ...routes]
const urls = []
for (const entry of entries) {
  const lastmod = await lastModified(entry.file)
  const loc = `${ORIGIN}${BASE}${entry.path}${entry.path ? '/' : ''}`
  urls.push(
    `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`,
  )
}

await writeFile(
  resolve(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
  'utf8',
)

/*
 * Served at /learn-tajweed/robots.txt, not at the origin root, because that
 * root belongs to the user's GitHub Pages account and not to this repository.
 * The Robots Exclusion Protocol only reads the root, so the Sitemap: line here
 * does NOT give Google sitemap auto-discovery — submit the sitemap once in
 * Search Console instead. Bing and some other crawlers do read this path, and
 * a missing robots.txt means allow-all either way, so it costs nothing.
 */
await writeFile(
  resolve(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}${BASE}sitemap.xml\n`,
  'utf8',
)

console.log(
  `✓ Pre-rendered ${routes.length} routes plus the 404 fallback: own title, canonical, ` +
    `JSON-LD and static Arabic body. Wrote sitemap.xml and robots.txt.`,
)
