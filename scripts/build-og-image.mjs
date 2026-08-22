#!/usr/bin/env node
/**
 * Renders public/og.png — the card that WhatsApp, Telegram and X show when
 * somebody shares a link to the site.
 *
 * This is a separate, on-demand script rather than part of `npm run build`,
 * because it needs a real browser to lay out Arabic and the build must stay
 * runnable in CI without one. The PNG it produces is committed.
 *
 *   npm run og
 *
 * The card carries one verse. It is NOT typed here: it is sliced out of the
 * same pinned Uthmani corpus the lessons use, for the same reason lessons may
 * not type one. Writing «وَرَتِّلِ...» by hand into this file produced a shadda
 * and a kasra in the opposite order from the mushaf — visually identical, two
 * codepoints transposed. That is precisely the error this pipeline exists to
 * make impossible, and a link preview is seen by far more people than a lesson.
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITE_LABEL } from '../site.config.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CORPUS = resolve(ROOT, 'data/quran-uthmani.txt')
const OUT = resolve(ROOT, 'public/og.png')

/** Must match CORPUS_SHA256 in scripts/build-quran.mjs. */
const EXPECTED_SHA256 = '7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326'

/** Al-Muzzammil 73:4. The card shows the last three words. */
const AYAH = { surah: '73', ayah: '4', lastWords: 3 }

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

async function verseFromCorpus() {
  // Hash the bytes, exactly as scripts/build-quran.mjs does, so the two agree.
  const bytes = await readFile(CORPUS)
  const raw = bytes.toString('utf8')

  // The corpus is pinned. If it ever changes, every verse on the site is
  // suspect, so refuse rather than render something unverified.
  const sha = createHash('sha256').update(bytes).digest('hex')
  if (EXPECTED_SHA256 !== sha && process.env.OG_ALLOW_CORPUS_DRIFT !== '1') {
    throw new Error(
      `og: بصمة المصحف تغيّرت.\n  المتوقَّع: ${EXPECTED_SHA256}\n  الموجود : ${sha}\n` +
        `شغّل \`npm run quran:fetch\` وتحقّق، أو حدِّث EXPECTED_SHA256 في هذا الملف.`,
    )
  }

  for (const line of raw.split('\n')) {
    const parts = line.split('|')
    if (parts[0] === AYAH.surah && parts[1] === AYAH.ayah) {
      // Slice by whitespace, so no Arabic is typed in this file at all.
      return parts[2].trim().split(/\s+/).slice(-AYAH.lastWords).join(' ')
    }
  }
  throw new Error(`og: الآية ${AYAH.surah}:${AYAH.ayah} غير موجودة في المصحف.`)
}

function html(verse, fonts) {
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>
@font-face{font-family:'Cairo';src:url('${fonts.cairo}') format('woff2-variations');font-weight:200 1000;font-display:block}
@font-face{font-family:'Amiri Quran';src:url('${fonts.amiri}') format('woff2');font-weight:400;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;font-family:'Cairo';background:#fbfaf7;display:flex;overflow:hidden}
.spine{width:22px;background:#216342;flex:none}
.hair{width:5px;background:#e7c889;flex:none}
.body{flex:1;padding:58px 68px 50px;display:flex;flex-direction:column;justify-content:space-between}
.riwayah{font-size:25px;font-weight:700;color:#216342}
h1{font-size:100px;font-weight:900;color:#161c18;line-height:1.26;margin-top:6px}
h1 .accent{color:#216342}
.sub{font-size:33px;font-weight:500;color:#5e5c56;line-height:1.6;margin-top:12px}
/* Amiri Quran reserves 2.45em of content area for stacked marks; never tighten
   this line-height or the tashkeel clips. Same rule as .quran in src/index.css. */
.ayah{font-family:'Amiri Quran';font-weight:400;font-synthesis:none;font-size:38px;line-height:2.5;
      color:#216342;background:#ecfaf1;border:2px solid #e7c889;border-radius:16px;
      padding:2px 30px 10px;margin-top:20px;align-self:flex-start}
.foot{display:flex;align-items:center;justify-content:space-between;border-top:2px solid #e7e5e0;padding-top:24px}
.facts{font-size:25px;font-weight:600;color:#5e5c56}
.facts b{color:#216342;font-weight:800}
.url{font-size:23px;font-weight:600;color:#5e5c56;direction:ltr}
</style></head><body>
<div class="spine"></div><div class="hair"></div>
<div class="body">
  <div>
    <p class="riwayah">رواية حفص عن عاصم من طريق الشاطبيّة</p>
    <h1>تعلَّم <span class="accent">التجويد</span></h1>
    <p class="sub">أحكام تلاوة القرآن الكريم، مرتَّبةً من الأسهل إلى الأصعب</p>
    <p class="ayah">${verse}</p>
  </div>
  <div class="foot">
    <p class="facts"><b>٣٤</b> درسًا في <b>١١</b> وحدة · مجّانيّ · بلا إعلانات</p>
    <p class="url">${SITE_LABEL}</p>
  </div>
</div></body></html>`
}

const verse = await verseFromCorpus()
const dir = await mkdtemp(resolve(tmpdir(), 'tajweed-og-'))
const page = resolve(dir, 'og.html')

await writeFile(
  page,
  html(verse, {
    cairo: `file://${resolve(ROOT, 'node_modules/@fontsource-variable/cairo/files/cairo-arabic-wght-normal.woff2')}`,
    amiri: `file://${resolve(ROOT, 'node_modules/@fontsource/amiri-quran/files/amiri-quran-arabic-400-normal.woff2')}`,
  }),
  'utf8',
)

function shoot(file, out, width, height) {
  return new Promise((done) => {
    const chrome = spawn(CHROME, [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${width},${height}`,
      '--virtual-time-budget=6000',
      `--screenshot=${out}`,
      `file://${file}`,
    ])
    chrome.on('close', done)
    chrome.on('error', () => done(1))
  })
}

const exit = await shoot(page, OUT, 1200, 630)

/*
 * PNG icons alongside favicon.svg. Google's favicon documentation does not list
 * SVG among the formats it states support for, and iOS "add to home screen"
 * screenshots the page when there is no apple-touch-icon — which for a study
 * tool that keeps progress in localStorage is exactly the wrong first
 * impression. Both are rendered from the same SVG so they cannot drift.
 */
const svg = await readFile(resolve(ROOT, 'public/favicon.svg'), 'utf8')

const icons = [
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['public/apple-touch-icon.png', 180],
]
let iconExit = 0
for (const [out, size] of icons) {
  // Explicit pixel sizes, not 100vw/100vh: the viewport units resolved against
  // a layout viewport wider than the window and rendered a zoomed crop.
  const iconPage = resolve(dir, `icon-${size}.html`)
  await writeFile(
    iconPage,
    `<!doctype html><meta charset="utf-8"><style>
     html,body{margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden}
     svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    'utf8',
  )
  iconExit ||= await shoot(iconPage, resolve(ROOT, out), size, size)
}

await rm(dir, { recursive: true, force: true })

if (exit !== 0 || iconExit !== 0) {
  throw new Error(
    `og: تعذّر تشغيل المتصفّح (${CHROME}). حدِّد مسارًا آخر عبر CHROME_PATH.`,
  )
}

console.log(
  `✓ public/og.png — البطاقة جاهزة، والآية منسوخة من المصحف المثبَّت (${AYAH.surah}:${AYAH.ayah}).\n` +
    `✓ public/icon-192.png، icon-512.png، apple-touch-icon.png — من نفس الأيقونة.`,
)
