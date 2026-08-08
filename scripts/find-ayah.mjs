#!/usr/bin/env node
/**
 * Find which verses contain a phrase, so you never have to guess a reference.
 *
 *   npm run quran:find -- "من الصواعق"
 *   npm run quran:find -- "ينفقون" 5        (show at most 5 matches)
 *
 * Type the phrase the ordinary way, without tashkeel. The search folds the
 * diacritics, the spelling variants and the silent alef exactly as
 * scripts/build-quran.mjs does, so anything printed here will also resolve in a
 * lesson file.
 *
 * Output is `surah:ayah` plus the verse, ready to paste into a `ref:`.
 *
 * Every Arabic character class below is written with \uXXXX escapes. Arabic
 * letters typed inside a regular expression get reordered on screen by the
 * editor's bidirectional layout, which silently turns "ؐ-ؚ" into a
 * different range. That bug is invisible in review, so the escapes are not
 * optional here.
 */
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
// npm re-splits an argument that contains spaces, so join everything back and
// treat a trailing number as the result limit.
const limit = args.length > 1 && /^\d+$/.test(args.at(-1)) ? Number(args.pop()) : 12
const phrase = args.join(' ').trim()

if (!phrase) {
  console.error('Usage: npm run quran:find -- "<phrase>" [max results]')
  process.exit(1)
}

const surahs = JSON.parse(await readFile(resolve(ROOT, 'data/surah-names.json'), 'utf8'))
const corpus = await readFile(resolve(ROOT, 'data/quran-uthmani.txt'), 'utf8')

/*
 * What to do with the superscript alef, which stands for an alef the Uthmani
 * script does not write out:
 *   keep  -> plain alef        al-kitab reads as 'alktab'
 *   merge -> swallows a waw/ya  al-salah reads as 'alslah'
 *   drop  -> disappears        dhalika reads as 'dlk'
 * All three are searched, which is what scripts/build-quran.mjs does too.
 */
const SUPERSCRIPT_ALEF = {
  keep: { find: /\u0670/g, replace: '\u0627' },
  merge: { find: /[\u0648\u064A]?\u0670/g, replace: '\u0627' },
  drop: { find: /\u0670/g, replace: '' },
}

const MARKS = /[\u0610-\u061A\u064B-\u065F\u0640\u06D6-\u06ED\u08D3-\u08FF\u200C-\u200F]/g

/**
 * Fold a verse or a query to bare, comparable letters.
 *  decides what the superscript alef does. It stands for an alef the
 * Uthmani script does not write, and a reader spells the result two ways:
 * al-salah is 'alsalwah' letter by letter but 'alsalah' as anyone would write
 * it. Both foldings are produced and both are searched, which is what
 * scripts/build-quran.mjs does too.
 */
const fold = (text, mode, maddaAsHamza) =>
  (maddaAsHamza
    ? text.normalize('NFC').replace(/\u0622/g, '\u0621\u0627') // alef madda -> hamza + alef
    : text.normalize('NFC').normalize('NFD')
  )
    .replace(SUPERSCRIPT_ALEF[mode].find, SUPERSCRIPT_ALEF[mode].replace) // superscript alef
    .replace(MARKS, '')
    .replace(/[\u0623\u0625\u0671]/g, '\u0627') // hamza'd and wasl alefs -> alef
    .replace(/\u0649/g, '\u064A') // alef maqsura -> ya
    .replace(/\u0629/g, '\u0647') // ta marbuta -> ha
    .replace(/\u0624/g, '\u0648') // waw with hamza -> waw
    .replace(/\u0626/g, '\u064A') // ya with hamza -> ya
    .replace(/\s+/g, ' ')
    .trim()

const MODES = ['keep', 'merge', 'drop']
const variants = (text) => MODES.flatMap((mode) => [fold(text, mode, true), fold(text, mode, false)])
const needles = [...new Set(variants(phrase))].filter(Boolean)
if (needles.length === 0) {
  console.error('العبارة فارغةٌ بعد إسقاط التشكيل.')
  process.exit(1)
}

const verses = new Map()
for (const line of corpus.split('\n')) {
  if (!line || line.startsWith('#')) continue
  const [surah, ayah, ...rest] = line.split('|')
  if (!rest.length) continue
  verses.set(`${Number(surah)}:${Number(ayah)}`, rest.join('|').trim())
}

/*
 * Tanzil joins the basmala onto the first verse of 112 surahs. The build script
 * removes it, so this tool has to as well: otherwise it would happily report
 * that a basmala phrase lives in, say, an-Nas 114:1, and the reference would
 * then fail the build.
 */
const BASMALA = verses.get('1:1')
const BASMALA_IDGHAM = `${BASMALA[0]}\u0651${BASMALA.slice(1)}`
for (const [ref, text] of verses) {
  if (ref === '1:1' || !ref.endsWith(':1')) continue
  for (const prefix of [BASMALA_IDGHAM, BASMALA]) {
    if (text.startsWith(prefix)) {
      verses.set(ref, text.slice(prefix.length).trim())
      break
    }
  }
}

/*
 * A last, deliberately loose pass: ignore every alef on both sides.
 * The Uthmani script writes some alefs and leaves others implied, so a reader
 * searching for a phrase cannot know which spelling to type. Being forgiving is
 * right here because this tool only points at a verse. The build script stays
 * strict, and prints the exact skeleton to copy when a phrase does not resolve.
 */
const dropAlefs = (text) => text.replace(/\u0627/g, '')

function findMatches(loose) {
  const found = []
  for (const [ref, text] of verses) {
    const forms = variants(text).map((form) => (loose ? dropAlefs(form) : form))
    const wanted = loose ? needles.map(dropAlefs) : needles
    if (wanted.some((needle) => needle && forms.some((form) => form.includes(needle)))) {
      found.push({ ref, surah: Number(ref.split(':')[0]), text })
    }
  }
  return found
}

let matches = findMatches(false)
let loose = false
if (matches.length === 0) {
  matches = findMatches(true)
  loose = matches.length > 0
}

if (matches.length === 0) {
  console.log(`لا توجد آيةٌ فيها «${phrase}».`)
  console.log('جرّب عبارةً أقصر، أو راجِع الإملاء.')
  process.exit(0)
}

if (loose) {
  console.log('(لم تُطابق العبارة حرفيًّا، فبُحث عنها مع تجاهل الألفات)\n')
}
console.log(`${matches.length} موضعًا. أوّل ${Math.min(limit, matches.length)}:\n`)
for (const match of matches.slice(0, limit)) {
  console.log(`${match.ref}  (${surahs[match.surah].name})`)
  console.log(`   ${match.text}\n`)
}
if (matches.length > limit) console.log(`… و${matches.length - limit} موضعًا آخر.`)
