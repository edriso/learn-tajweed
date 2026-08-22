#!/usr/bin/env node
/**
 * Writes a copy of dist/index.html at every route the site has, so GitHub Pages
 * answers a deep link with 200 instead of 404, and gives each copy its own head.
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
 * Two things each copy then gets:
 *
 * 1. Its own <title>, description, Open Graph tags and canonical, from the
 *    lesson's own frontmatter. React sets `document.title` on navigation, but
 *    the crawlers behind a WhatsApp or Telegram link preview do not run
 *    JavaScript: they read the HTML as served. Without this every one of the
 *    38 routes previews as the home page.
 *
 * 2. JSON-LD: a breadcrumb per lesson, and the site identity on the home page.
 *
 * What this deliberately does NOT do is write a static copy of the lesson into
 * #root. That was tried, to give crawlers that never run JavaScript some real
 * Arabic to read. But `createRoot` replaces #root wholesale on mount, so every
 * visitor watched a wall of unstyled text turn into the actual page — about a
 * second and a half of it on a slow connection. Content for those crawlers has
 * to come from server-rendering the real components and hydrating them, not
 * from a second rendering that the first paint then throws away.
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
import { BASE, CANONICAL_URL, IS_CANONICAL, SITE_URL } from '../site.config.mjs'

const run = promisify(execFile)

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(ROOT, 'dist')
const SOURCE = resolve(DIST, 'index.html')

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
 * Used for the lesson breadcrumb.
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

/**
 * Preload the two Arabic faces.
 *
 * Both are declared `font-display: swap`, and the browser only discovers them
 * after it has fetched and parsed the stylesheet — so the first paint used a
 * fallback and the text visibly reflowed when Cairo and Amiri Quran arrived.
 * Preloading starts both in parallel with the CSS instead. Only the Arabic
 * subsets: the Latin ones are for the handful of code spans and URLs, and
 * preloading those would compete for bandwidth with the fonts every line of the
 * page actually needs.
 *
 * The filenames carry a content hash, so they are read back out of the build
 * rather than written down anywhere.
 */
async function fontPreloads() {
  const assets = await readdir(resolve(DIST, 'assets'))
  const wanted = ['cairo-arabic-wght-normal', 'amiri-quran-arabic-400-normal']
  const links = []
  for (const stem of wanted) {
    const file = assets.find((name) => name.startsWith(stem) && name.endsWith('.woff2'))
    if (!file) {
      throw new Error(
        `prerender: لم يُعثر على ملفّ الخطّ «${stem}*.woff2» في dist/assets. ` +
          `غالبًا تغيّرت أسماء الخطوط — حدِّث scripts/prerender-routes.mjs.`,
      )
    }
    links.push(
      `<link rel="preload" as="font" type="font/woff2" crossorigin href="${BASE}assets/${file}" />`,
    )
  }
  return links.join('\n    ')
}

const preloads = await fontPreloads()

const withPreloads = (await readFile(SOURCE, 'utf8')).replace(
  '</head>',
  `  ${preloads}\n  </head>`,
)

// This pass rewrites dist/index.html in place, so running it twice over the same
// dist would stack a second canonical on top of the first. Vite regenerates the
// file on every build, so this only catches the script being run on its own.
if (withPreloads.includes('rel="canonical"')) {
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

/**
 * og:image is inserted here rather than written in index.html, because it has
 * to be absolute — a link-preview crawler has no base to resolve against — and
 * the origin is known only to site.config.mjs. Every page below inherits it.
 *
 * This one is SITE_URL, not CANONICAL_URL: it points at the copy this build
 * serves. The mirror's cards then keep working even while the domain the
 * canonicals name is unreachable, which is the whole reason the mirror exists.
 */
const template = replaceTag(
  withPreloads,
  /<meta\s+property="og:image:width"[\s\S]*?\/>/,
  (tag) => `<meta property="og:image" content="${SITE_URL}og.png" />\n    ${tag}`,
  'og:image:width',
)

function render(route) {
  const { path, title, description, ogType } = route
  const fullTitle = `${title} · ${SITE_NAME}`
  const url = `${CANONICAL_URL}${path}/`
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

  const crumbs = [{ name: SITE_NAME, item: CANONICAL_URL }]
  // Three units are named after their one lesson (القلقلة, الوقف والابتداء,
  // المتماثلان…), and repeating the name would render as «… › القلقلة › القلقلة».
  if (route.unit && route.unit !== title) crumbs.push({ name: route.unit })
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
      '@id': `${CANONICAL_URL}#website`,
      url: CANONICAL_URL,
      name: SITE_NAME,
      inLanguage: 'ar',
      description:
        'دليلٌ مجّانيٌّ لتعلُّم أحكام تجويد القرآن الكريم على رواية حفص عن عاصم من طريق الشاطبيّة.',
      // The guide itself, code and lessons alike, is 0BSD — see LICENSE. This
      // says nothing about the Qur'anic text it quotes, which stays under the
      // Tanzil terms recorded in NOTICE and is not ours to relicense.
      license: 'https://opensource.org/license/0bsd',
      isAccessibleForFree: true,
    },
    {
      '@type': 'EducationalOrganization',
      '@id': `${CANONICAL_URL}#org`,
      name: SITE_NAME,
      url: CANONICAL_URL,
    },
  ],
})

let home = replaceTag(
  template,
  /<meta\s+property="og:type"[\s\S]*?\/>/,
  `<meta property="og:type" content="website" />\n    ` +
    `<meta property="og:url" content="${CANONICAL_URL}" />\n    ` +
    `<link rel="canonical" href="${CANONICAL_URL}" />`,
  'og:type',
)
home = home.replace('</head>', `  ${homeLd}\n  </head>`)

/*
 * The home page has no Markdown file behind it, so its static body is built
 * from the curriculum itself: the eleven units in order, each with its lessons.
 * This is the page most likely to be indexed for a general Arabic query about
 * tajweed, and without it the site's front door is an empty div.
 */
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
  const loc = `${CANONICAL_URL}${entry.path}${entry.path ? '/' : ''}`
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
 * Crawling stays allowed on both builds — the mirror has to be readable for its
 * canonical to be believed, and a page nobody may fetch is a canonical nobody
 * reads. What the mirror does not do is advertise the sitemap.
 *
 * The Robots Exclusion Protocol reads this file only at the origin root. On the
 * canonical build that is where it lands, so the Sitemap: line gives Google
 * real auto-discovery. From the mirror the same line would name URLs on another
 * host, served from a path Google does not read robots.txt at anyway — an
 * invitation to be misread, in exchange for nothing. Submitting the sitemap
 * once in Search Console is what actually guarantees it; a missing robots.txt
 * means allow-all regardless, so writing this costs nothing either way.
 */
await writeFile(
  resolve(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n` +
    (IS_CANONICAL ? `\nSitemap: ${CANONICAL_URL}sitemap.xml\n` : ''),
  'utf8',
)

console.log(
  `✓ Pre-rendered ${routes.length} routes plus the 404 fallback: own title, canonical, ` +
    `JSON-LD and font preloads. Wrote sitemap.xml and robots.txt.`,
)
// Printed because these are the two things that silently ruin a deploy: a build
// served from one address while claiming another shows a working site whose
// every canonical points somewhere else, and nothing else reports it.
console.log(`  served from : ${SITE_URL}`)
console.log(`  claims to be: ${CANONICAL_URL}${IS_CANONICAL ? '' : '  (this copy is not the canonical one)'}`)
