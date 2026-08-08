#!/usr/bin/env node
/**
 * Turns the lesson files into src/content/quran.generated.json, and refuses to
 * finish if anything about the Qur'anic text in this repository is off.
 *
 *   npm run quran:build      (runs automatically before `npm run dev` and `build`)
 *
 * What it guarantees
 * ------------------
 * 1. The committed corpus still has the checksum we pinned.
 * 2. Every `ref:` in a lesson points at a verse that exists.
 * 3. Every `show:` / `highlight:` / `word:` phrase really occurs in that verse,
 *    exactly once, on word boundaries. An ambiguous phrase fails the build
 *    rather than silently colouring the wrong letters.
 * 4. Any Qur'anic text typed directly into a file matches the mushaf character
 *    for character.
 *
 * Nothing here "fixes up" text. If something does not match, the build stops
 * and says where. That is the point: a wrong verse must never ship.
 *
 * See docs/quran-pipeline.md for the long version.
 *
 * Note on the code below: every Arabic character class is written with \uXXXX
 * escapes. Arabic literals inside a regular expression reorder on screen in any
 * bidirectional editor, which makes them almost impossible to review.
 */
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CORPUS = resolve(ROOT, 'data/quran-uthmani.txt')
const NAMES = resolve(ROOT, 'data/surah-names.json')
const OUTPUT = resolve(ROOT, 'src/content/quran.generated.json')
const CORPUS_SHA256 = '7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326'

const SOURCE_NOTE =
  'نصّ المصحف برواية ' +
  'حفص عن عاصم بالرسم ' +
  'العثماني، من مشروع ' +
  'تنزيل (tanzil.net) بترخيص CC BY 3.0.'

const problems = []
const fail = (message) => problems.push(message)

// ─────────────────────────────────────────────────────────────────────────────
// 1. Read the corpus
// ─────────────────────────────────────────────────────────────────────────────

const corpusBytes = await readFile(CORPUS)
const actualSha = createHash('sha256').update(corpusBytes).digest('hex')
if (actualSha !== CORPUS_SHA256) {
  console.error('✗ data/quran-uthmani.txt does not match the pinned checksum.')
  console.error(`  expected ${CORPUS_SHA256}`)
  console.error(`  found    ${actualSha}`)
  console.error('  Restore it with: npm run quran:fetch')
  process.exit(1)
}

const surahs = JSON.parse(await readFile(NAMES, 'utf8'))

/** "2:19" -> the exact Uthmani text of that verse. */
const verses = new Map()
for (const line of corpusBytes.toString('utf8').split('\n')) {
  if (!line || line.startsWith('#')) continue
  const [surah, ayah, ...rest] = line.split('|')
  if (!rest.length) continue
  verses.set(`${Number(surah)}:${Number(ayah)}`, rest.join('|').trim())
}

if (verses.size !== 6236) {
  console.error(`✗ Expected 6236 verses in the corpus, parsed ${verses.size}.`)
  process.exit(1)
}

/*
 * Tanzil joins the basmala onto the first verse of 112 surahs (all except
 * al-Fatihah, where it is verse 1 in its own right, and at-Tawbah, which has
 * none). We show verses on their own, so that prefix has to come off.
 *
 * The basmala is taken from verse 1:1 rather than typed here: a hand-written
 * copy would differ by one invisible tatweel and silently stop matching. Before
 * al-Tin and al-Qadr, Tanzil writes it with a shadda on the baa, because the
 * surahs before them end in a baa; that longer form is tried first.
 */
const BASMALA = verses.get('1:1')
const BASMALA_IDGHAM = `${BASMALA[0]}\u0651${BASMALA.slice(1)}`
let stripped = 0
for (const [ref, text] of verses) {
  if (ref === '1:1' || !ref.endsWith(':1')) continue
  for (const prefix of [BASMALA_IDGHAM, BASMALA]) {
    if (text.startsWith(prefix)) {
      verses.set(ref, text.slice(prefix.length).trim())
      stripped++
      break
    }
  }
}
if (stripped !== 112) {
  console.error(`✗ Expected to remove the basmala from 112 verses, removed ${stripped}.`)
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Arabic normalisation
// ─────────────────────────────────────────────────────────────────────────────

const SUPERSCRIPT_ALEF = '\u0670'

/**
 * Marks that sit above or below a letter and are not letters themselves: the
 * vowel signs, the tatweel, the pause marks, the sajdah sign and the hizb sign.
 * Removing them leaves the bare consonants.
 * U+0670 is deliberately absent: it stands in for a real alef, so `skeleton()`
 * decides what to do with it.
 */
const MARKS =
  /[\u0610-\u061A\u064B-\u065F\u0640\u06D6-\u06ED\u08D3-\u08FF\u200C-\u200F]/

/** Letters that people spell more than one way, folded to a single form. */
function foldLetter(char) {
  if ('\u0671\u0623\u0625\u0622\u0627'.includes(char)) return '\u0627' // ٱ أ إ آ -> ا
  if (char === '\u0649') return '\u064A' // ى -> ي
  if (char === '\u0629') return '\u0647' // ة -> ه
  if (char === '\u0624') return '\u0648' // ؤ -> و
  if (char === '\u0626') return '\u064A' // ئ -> ي
  return char
}

/**
 * Build a searchable skeleton of a verse, plus a map back to the original
 * character positions.
 *
 * `alefMode` decides what happens to the superscript alef, which stands for an
 * alef the Uthmani script does not write out:
 *   'keep'  -> becomes a plain alef       ٱلْكِتَـٰبُ  -> الكتاب
 *   'merge' -> swallows a preceding و/ي   ٱلصَّلَوٰةَ  -> الصلاه
 *   'drop'  -> disappears                 ٱلْكِتَـٰبُ  -> الكتب
 * Each mode is tried in turn, so a lesson author can write a word the way it
 * comes naturally instead of hunting for the mushaf spelling.
 */
function skeleton(text, alefMode) {
  let out = ''
  const positions = []

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (char === SUPERSCRIPT_ALEF) {
      if (alefMode === 'drop') continue
      if (alefMode === 'merge' && (out.endsWith('\u0648') || out.endsWith('\u064A'))) {
        // The waw or ya is silent here, so it becomes the alef it carries.
        out = `${out.slice(0, -1)}\u0627`
        continue
      }
      out += '\u0627'
      positions.push(i)
      continue
    }

    if (MARKS.test(char)) continue

    if (/\s/.test(char)) {
      if (out.endsWith(' ')) continue // collapse runs of whitespace
      out += ' '
      positions.push(i)
      continue
    }

    out += foldLetter(char)
    positions.push(i)
  }

  return { text: out, positions }
}

/**
 * Turn a phrase from a lesson file into the forms it could take in the mushaf.
 *
 * Ordinary Arabic writes one letter, alef madda, where the Uthmani script
 * writes two different things: «القرآن» is spelt there as hamza followed by
 * alef, while «الضالين» is a plain alef carrying a madd sign.
 *
 * Unicode makes this trickier than it looks. The mushaf stores the second case
 * as alef followed by U+0653, but `normalize('NFC')` fuses those two into the
 * single character U+0622. So a rule of "always expand alef madda into hamza +
 * alef" quietly turns الضالين into الضءالين and nothing matches. Both readings
 * are produced here instead, and `locate()` tries each.
 */
function queryForms(phrase, alefMode) {
  const composed = phrase.normalize('NFC')
  const readings = [
    composed.replace(/\u0622/g, '\u0621\u0627'), // as hamza + alef
    composed.normalize('NFD'), // as alef + madd sign, which then drops as a mark
  ]
  const forms = readings.map((form) => skeleton(form, alefMode).text.trim().replace(/\s+/g, ' '))
  return [...new Set(forms)].filter(Boolean)
}

/*
 * A guard against one specific, very quiet bug.
 *
 * The first version of these helpers had its character ranges typed in Arabic.
 * A bidirectional editor renders "from U+0610 to U+061A" back to front, so the
 * range that got saved was a different one: every letter counted as a mark,
 * every phrase folded to the empty string, and every lookup "matched". Nothing
 * threw. These checks would have caught it in a second, so they run every build.
 */
function selfTest(label, got, expected) {
  if (got === expected) return
  console.error('✗ The Arabic normalisation is broken; every check below would be meaningless.')
  console.error(`  case     ${label}`)
  console.error(`  expected ${JSON.stringify(expected)}`)
  console.error(`  got      ${JSON.stringify(got)}`)
  process.exit(1)
}

// The verse side: marks come off and the superscript alef behaves per mode.
for (const [ref, mode, expected] of [
  ['2:2', 'keep', '\u0630\u0627\u0644\u0643 \u0627\u0644\u0643\u062A\u0627\u0628 \u0644\u0627 \u0631\u064A\u0628 \u0641\u064A\u0647 \u0647\u062F\u064A \u0644\u0644\u0645\u062A\u0642\u064A\u0646'],
  ['1:6', 'keep', '\u0627\u0647\u062F\u0646\u0627 \u0627\u0644\u0635\u0631\u0627\u0637 \u0627\u0644\u0645\u0633\u062A\u0642\u064A\u0645'],
]) {
  selfTest(`verse ${ref}`, skeleton(verses.get(ref), mode).text, expected)
}

// A plain alef carrying a madd sign must NOT turn into hamza + alef.
selfTest('verse 1:7 tail', skeleton(verses.get('1:7'), 'keep').text.split(' ').pop(), '\u0627\u0644\u0636\u0627\u0644\u064A\u0646')

// The query side: a phrase typed the ordinary way must reach the same skeleton.
selfTest('query al-quran', queryForms('\u0627\u0644\u0642\u0631\u0622\u0646', 'keep')[0], '\u0627\u0644\u0642\u0631\u0621\u0627\u0646')
selfTest('query as-salah', queryForms('\u0627\u0644\u0635\u0644\u0627\u0629', 'merge')[0], '\u0627\u0644\u0635\u0644\u0627\u0647')

/** True when a match starts and ends on a whole word, not mid-word. */
function onWordBoundary(haystack, at, length) {
  const before = at === 0 || haystack[at - 1] === ' '
  const end = at + length
  const after = end === haystack.length || haystack[end] === ' '
  return before && after
}

function findAll(haystack, needle) {
  const hits = []
  let at = haystack.indexOf(needle)
  while (at !== -1) {
    if (onWordBoundary(haystack, at, needle.length)) hits.push(at)
    at = haystack.indexOf(needle, at + 1)
  }
  return hits
}

/**
 * Resolve a phrase to a [start, end) range inside a verse.
 * Returns an explanatory string instead when it cannot.
 */
function locate(verse, phrase) {
  for (const mode of ['keep', 'merge', 'drop']) {
    const hay = skeleton(verse, mode)
    const needles = queryForms(phrase, mode)
    if (needles.length === 0) return 'العبارة فارغة.'

    const needle = needles.find((form) => findAll(hay.text, form).length > 0) ?? needles[0]
    const hits = findAll(hay.text, needle)
    if (hits.length > 1) {
      return `العبارة «${phrase}» تتكرّر ${hits.length} مرّاتٍ في الآية. اكتب عبارةً أطول تحدّد الموضع المقصود.`
    }
    if (hits.length === 1) {
      const at = hits[0]
      const start = hay.positions[at]
      // Stretch to just before the next base letter, so the closing vowel sign,
      // shadda or sukun of the last letter stays inside the highlight.
      const nextIndex = at + needle.length
      let end = nextIndex < hay.positions.length ? hay.positions[nextIndex] : verse.length
      while (end > start && /\s/.test(verse[end - 1])) end--
      return [start, end]
    }
  }

  return (
    `لم يُعثر على «${phrase}» في الآية.\n` +
    `      الرسم العثمانيّ : ${verse}\n` +
    `      بلا تشكيل       : ${skeleton(verse, 'keep').text}\n` +
    `      (انسخ من السطر الثاني إن أشكل عليك الرسم)`
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Collect every reference used in the content
// ─────────────────────────────────────────────────────────────────────────────

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(path)))
    else out.push(path)
  }
  return out
}

const sourceFiles = (await walk(resolve(ROOT, 'src'))).filter(
  (path) => ['.md', '.ts', '.tsx'].includes(extname(path)) && !path.endsWith('.generated.json'),
)

/** Fenced blocks whose YAML can carry a `ref:`. */
const REF_BLOCK = /```(ayah|examples|quiz)\r?\n([\s\S]*?)```/g

/**
 * Every fenced block whose body is YAML, and the frontmatter at the top of each
 * file, get parsed here even when they hold no verse reference.
 *
 * The reason is that these are parsed again in the browser, where a YAML error
 * is an uncaught exception and the whole page goes blank. The commonest cause
 * is an Arabic sentence containing a colon, which YAML reads as a second key.
 * Catching it in the build turns a white screen into a one-line message.
 */
const YAML_BLOCK = /```(ayah|examples|quiz|letters|mistake|compare)\r?\n([\s\S]*?)```/g
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/

/** Fields every lesson must have, so a half-written file cannot ship. */
const REQUIRED_META = ['title', 'description', 'unit', 'order', 'minutes', 'emoji']

function yamlHint(message) {
  return /Nested mappings|implicit map key|multiline plain value|All collection items/.test(message)
    ? "\n      غالبًا السبب نقطتان «:» داخل نصٍّ عربيّ. ضَع القيمة بين علامتَي تنصيصٍ مفردة: '…'"
    : ''
}

/**
 * A component can also ask for a verse in code, by calling the helpers in
 * src/lib/quran.ts with literal arguments. Picking those up here means the
 * footer's verse is verified exactly like a lesson's.
 *   getAyah('73:4')
 *   getSpan('73:4', 'ورتل القرآن ترتيلا')
 */
const CODE_AYAH = /getAyah\(\s*['"](\d+:\d+)['"]/g
const CODE_SPAN = /getSpan\(\s*['"](\d+:\d+)['"]\s*,\s*['"]([^'"]+)['"]/g

const wanted = new Map() // ref -> Set of phrases needed inside it
const nested = new Map() // ref -> [word, highlight, where] to resolve inside the word

function request(ref, phrase, where) {
  if (typeof ref !== 'string' || !/^\d+:\d+$/.test(ref)) {
    fail(`${where}: «${ref}» ليس مرجعًا صحيحًا. الصيغة المطلوبة «سورة:آية»، مثل 2:19.`)
    return
  }
  const [surah, ayah] = ref.split(':').map(Number)
  const meta = surahs[surah]
  if (!meta) {
    fail(`${where}: لا توجد سورةٌ برقم ${surah}.`)
    return
  }
  if (ayah < 1 || ayah > meta.verses) {
    fail(`${where}: سورة ${meta.name} فيها ${meta.verses} آية، فلا وجود للآية ${ayah}.`)
    return
  }
  if (!wanted.has(ref)) wanted.set(ref, new Set())
  if (phrase) wanted.get(ref).add(phrase)
}

const unitIds = new Set(
  [...(await readFile(resolve(ROOT, 'src/lib/units.ts'), 'utf8')).matchAll(/^\s*id: '([\w-]+)'/gm)].map(
    (match) => match[1],
  ),
)
const seenOrders = new Map()

for (const path of sourceFiles) {
  const raw = await readFile(path, 'utf8')
  const where = relative(ROOT, path)

  for (const [, ref] of raw.matchAll(CODE_AYAH)) request(ref, undefined, where)
  for (const [, ref, phrase] of raw.matchAll(CODE_SPAN)) request(ref, phrase, where)

  // Every YAML body in the file has to parse, or the page goes blank at runtime.
  for (const [, kind, body] of raw.matchAll(YAML_BLOCK)) {
    try {
      parse(body)
    } catch (error) {
      fail(`${where}: بلوك \`${kind}\` لا يُقرأ كـ YAML — ${error.message}${yamlHint(error.message)}`)
    }
  }

  // Lesson frontmatter: parses, has its required fields, and names a real unit.
  if (where.startsWith('src/content/lessons/')) {
    const front = raw.match(FRONTMATTER)
    if (!front) {
      fail(`${where}: ينقص الدرسَ بلوك الـ frontmatter في أعلى الملف.`)
      continue
    }
    let meta
    try {
      meta = parse(front[1])
    } catch (error) {
      fail(`${where}: الـ frontmatter لا يُقرأ كـ YAML — ${error.message}${yamlHint(error.message)}`)
      continue
    }
    for (const field of REQUIRED_META) {
      if (meta?.[field] === undefined) fail(`${where}: ينقص الحقل \`${field}\` من الـ frontmatter.`)
    }
    if (meta?.unit && !unitIds.has(meta.unit)) {
      fail(`${where}: الوحدة «${meta.unit}» غير معرَّفة في src/lib/units.ts.`)
    }
    if (typeof meta?.order === 'number') {
      const clash = seenOrders.get(meta.order)
      if (clash) fail(`${where}: الترتيب ${meta.order} مستعملٌ أيضًا في ${clash}.`)
      else seenOrders.set(meta.order, where)
    }
  }

  for (const [, kind, body] of raw.matchAll(REF_BLOCK)) {
    let spec
    try {
      spec = parse(body)
    } catch (error) {
      // Much the commonest cause: an Arabic sentence containing a colon, which
      // YAML reads as the start of another key. Say so instead of leaving the
      // author to decode the parser's wording.
      const hint = /Nested mappings|implicit map key|multiline plain value/.test(error.message)
        ? '\n      غالبًا السبب نقطتان «:» داخل نصٍّ عربيّ. ضَع القيمة بين علامتَي تنصيصٍ مفردة: \'…\''
        : ''
      fail(`${where}: بلوك \`${kind}\` فيه خطأٌ في صيغة YAML — ${error.message}${hint}`)
      continue
    }
    if (!spec) continue

    if (kind === 'ayah') {
      if (!spec.ref) {
        fail(`${where}: بلوك \`ayah\` بلا حقل \`ref\`.`)
        continue
      }
      request(spec.ref, spec.show, where)
      if (spec.highlight && !spec.rule) {
        fail(`${where}: بلوك \`ayah\` فيه \`highlight\` بلا \`rule\`.`)
      }
      if (spec.highlight) request(spec.ref, spec.highlight, where)
      for (const mark of spec.marks ?? []) request(spec.ref, mark.text, where)
    }

    if (kind === 'examples') {
      for (const item of spec.items ?? []) {
        if (!item.ref || !item.word) {
          fail(`${where}: كلّ عنصرٍ في بلوك \`examples\` يحتاج \`ref\` و\`word\`.`)
          continue
        }
        request(item.ref, item.word, where)
        // An example's `highlight` is looked for inside its own `word`, not
        // across the whole verse: a two-letter word like "min" occurs many
        // times in a long verse, and searching the whole verse would call it
        // ambiguous when the author's intent was never in doubt.
        if (item.highlight) {
          if (!nested.has(item.ref)) nested.set(item.ref, [])
          nested.get(item.ref).push([item.word, item.highlight, where])
        }
      }
    }

    if (kind === 'quiz') {
      for (const question of spec.questions ?? []) {
        if (question.ref) request(question.ref, question.word, where)
        if (Array.isArray(question.options)) {
          if (
            typeof question.answer !== 'number' ||
            question.answer < 0 ||
            question.answer >= question.options.length
          ) {
            fail(`${where}: السؤال «${question.q}» يشير إلى إجابةٍ خارج قائمة خياراته.`)
          }
          if (new Set(question.options).size !== question.options.length) {
            fail(`${where}: السؤال «${question.q}» فيه خيارٌ مكرّر.`)
          }
        }
        if (!question.why) fail(`${where}: السؤال «${question.q}» بلا حقل \`why\`.`)
      }
    }
  }
}

/*
 * Every `lesson:` slug named in src/lib/rules.ts and src/lib/glossary.ts has to
 * exist. A rule badge or a glossary entry pointing at a lesson that was renamed
 * would render as a dead link, which the type checker cannot see.
 */
const lessonSlugs = new Set(
  sourceFiles
    .filter((path) => path.includes('/content/lessons/'))
    .map((path) => path.split('/').pop().replace(/\.md$/, '')),
)
for (const file of ['src/lib/rules.ts', 'src/lib/glossary.ts']) {
  const raw = await readFile(resolve(ROOT, file), 'utf8')
  for (const [, slug] of raw.matchAll(/^\s*lesson: '([\w-]+)'/gm)) {
    if (!lessonSlugs.has(slug)) fail(`${file}: يشير إلى درسٍ غير موجود «${slug}».`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Resolve everything
// ─────────────────────────────────────────────────────────────────────────────

const ayat = {}
const spans = {}

for (const ref of [...wanted.keys()].sort()) {
  const text = verses.get(ref)
  const [surah, ayah] = ref.split(':').map(Number)
  ayat[ref] = { surah, ayah, surahName: surahs[surah].name, text }

  for (const phrase of wanted.get(ref)) {
    const found = locate(text, phrase)
    if (typeof found === 'string') fail(`${ref} — ${found}`)
    else spans[`${ref}|${phrase}`] = found
  }

  for (const [word, highlight, where] of nested.get(ref) ?? []) {
    const outer = spans[`${ref}|${word}`]
    if (!outer) continue // the word itself already failed and was reported
    const inner = locate(text.slice(outer[0], outer[1]), highlight)
    if (typeof inner === 'string') {
      fail(`${where} — داخل «${word}» من الآية ${ref}: ${inner}`)
    } else {
      spans[`${ref}|${word}|${highlight}`] = [outer[0] + inner[0], outer[0] + inner[1]]
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Catch Qur'anic text typed straight into a file
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hamzat al-wasl, the superscript alef and the pause/sajdah marks occur in the
 * mushaf and essentially nowhere else in ordinary Arabic writing. Text holding
 * one of them was copied from a mushaf, so it has to be checked against ours.
 *
 * This is now only used for the "verse pasted outside \u00AB\u2026\u00BB" sweep below. The
 * quotation check no longer relies on it: a phrase can be pure Qur'an and
 * contain none of these characters, and nine such quotations sat in the lessons
 * with a mark missing precisely because this guard let them past.
 */
const MUSHAF_ONLY = /[\u0670\u0671\u06D6-\u06ED]/

/**
 * Marks the reader may legitimately drop when quoting a fragment: the waqf
 * signs (\u06D6 \u06D7 \u06D8 \u06D9 \u06DA \u06DB), the end-of-ayah circle and the sajdah sign. They are the
 * mushaf's editorial furniture, not part of any word, and a two-word quotation
 * lifted from the middle of a verse should not have to carry one.
 *
 * Everything else \u2014 the madda, hamzat al-wasl, the small seen, the silent-letter
 * circles, every haraka \u2014 IS part of the word and must match.
 */
const OPTIONAL_MARKS = /[\u06D6-\u06DB\u06DD\u06DE\u06E9]/g

/**
 * Quotations that deliberately depart from the mushaf, each with its reason.
 *
 * A lesson sometimes has to print what a mistaken reciter says, which is by
 * definition not what the mushaf has. Listing them here rather than exempting a
 * whole file keeps every one of them a visible, reviewed decision \u2014 and means a
 * tenth mistyped verse cannot hide among them.
 */
const DELIBERATE = new Map([
  ['\u0623\u064E\u0646\u0652\u0639\u064E\u0645\u0652\u062A\u064F \u0639\u064E\u0644\u064E\u064A\u0652\u0647\u0650\u0645\u0652', '\u0633\u0624\u0627\u0644\u064C \u0639\u0646 \u0642\u0627\u0631\u0626\u064D \u0636\u0645\u0651 \u0627\u0644\u062A\u0627\u0621\u061B \u0627\u0644\u062E\u0637\u0623 \u0646\u0641\u0633\u0647 \u0647\u0648 \u0627\u0644\u0645\u0642\u0635\u0648\u062F'],
  ['\u0645\u0650\u0646\u0652 \u0631\u064E\u0651\u0628\u0650\u0651\u0647\u0650\u0645\u0652', '\u0628\u0644\u0648\u0643 mistake: \u0646\u0637\u0642\u064F \u0645\u0646 \u064A\u064F\u0628\u0642\u064A \u0623\u062B\u0631 \u0627\u0644\u0646\u0648\u0646 \u0642\u0628\u0644 \u0627\u0644\u0645\u0634\u062F\u064E\u0651\u062F'],
  ['\u0645\u0650\u0646 \u0631\u064E\u0651\u0628\u0650\u0651\u0647\u0650\u0645\u0652', '\u0633\u0624\u0627\u0644\u064C \u0639\u0646 \u0642\u0627\u0631\u0626\u064D \u0623\u0638\u0647\u0631 \u0627\u0644\u0646\u0648\u0646 \u0648\u0644\u0645 \u064A\u064F\u062F\u063A\u0645\u0647\u0627'],
  ['\u0645\u0650\u0646\u0652 \u0642\u064E\u0628\u0652\u0644\u064F', '\u0631\u0633\u0645\u064F \u0627\u0644\u0646\u0637\u0642 \u0639\u0646\u062F \u0627\u0644\u0625\u062E\u0641\u0627\u0621\u060C \u0644\u0627 \u0631\u0633\u0645 \u0627\u0644\u0645\u0635\u062D\u0641'],
  ['\u0645\u0650\u0646\u0652 \u0628\u064E\u0639\u0652\u062F\u0650', '\u0631\u0633\u0645\u064F \u0627\u0644\u0646\u0637\u0642 \u0639\u0646\u062F \u0627\u0644\u0625\u062E\u0641\u0627\u0621\u060C \u0644\u0627 \u0631\u0633\u0645 \u0627\u0644\u0645\u0635\u062D\u0641'],
  ['\u0644\u0627 \u0631\u064A\u0628 \u0641\u064A\u0647', '\u0645\u0630\u0643\u0648\u0631\u0629\u064C \u0628\u0644\u0627 \u062A\u0634\u0643\u064A\u0644 \u0644\u0628\u064A\u0627\u0646 \u0645\u0648\u0636\u0639 \u0627\u0644\u0648\u0642\u0641 \u0648\u062D\u062F\u0647'],
  ['\u0641\u064A\u0647 \u0647\u062F\u064B\u0649 \u0644\u0644\u0645\u062A\u0651\u0642\u064A\u0646', '\u0645\u0630\u0643\u0648\u0631\u0629\u064C \u0628\u0644\u0627 \u062A\u0634\u0643\u064A\u0644 \u0644\u0628\u064A\u0627\u0646 \u0645\u0648\u0636\u0639 \u0627\u0644\u0648\u0642\u0641 \u0648\u062D\u062F\u0647'],
  ['\u0647\u062F\u064B\u0649 \u0644\u0644\u0645\u062A\u0651\u0642\u064A\u0646', '\u0645\u0630\u0643\u0648\u0631\u0629\u064C \u0628\u0644\u0627 \u062A\u0634\u0643\u064A\u0644 \u0644\u0628\u064A\u0627\u0646 \u0645\u0648\u0636\u0639 \u0627\u0644\u0648\u0642\u0641 \u0648\u062D\u062F\u0647'],
  ['\u0641\u0625\u0630\u0627 \u0642\u0631\u0623\u062A\u064E', '\u0625\u0634\u0627\u0631\u0629\u064C \u0625\u0644\u0649 \u0627\u0644\u0622\u064A\u0629 \u0641\u064A \u0633\u064A\u0627\u0642 \u0627\u0644\u0643\u0644\u0627\u0645\u060C \u0644\u0627 \u0627\u0642\u062A\u0628\u0627\u0633\u064C \u0644\u0631\u0633\u0645\u0647\u0627'],
  ['\u0625\u0644\u0651\u0627 \u0627\u0644\u0644\u0647', '\u0625\u0634\u0627\u0631\u0629\u064C \u0625\u0644\u0649 \u0645\u0648\u0636\u0639 \u0627\u0644\u0648\u0642\u0641\u060C \u0644\u0627 \u0627\u0642\u062A\u0628\u0627\u0633\u064C \u0644\u0631\u0633\u0645\u0647\u0627'],
])

/** The verse text as one string per verse, for exact lookups. */
const verseTexts = [...verses.entries()]

/**
 * Does this quotation look Qur'anic, and if so does it match the mushaf?
 *
 * Returns nothing when the phrase is not Qur'anic at all, or when it matches.
 * The comparison is on NFC-normalised text: the corpus stores a shadda before
 * its haraka and most editors write them the other way round, which is the same
 * string under Unicode and must not be reported as a difference.
 */
function quotationProblem(inner) {
  const phrase = inner.trim()
  if (DELIBERATE.has(phrase)) return undefined
  if (phrase.split(/\s+/).length < 2) return undefined

  const wanted = skeleton(phrase, 'keep').text
  if (baseLetters(wanted).length < 6) return undefined

  const tidy = (s) => s.normalize('NFC').replace(OPTIONAL_MARKS, '').replace(/\s+/g, ' ').trim()

  // A phrase can occur in several verses that spell it differently — «هُمْ فِيهَا
  // خَالِدُونَ» is 2:39 and «هُمْ فِيهَآ خَـٰلِدُونَ» is 2:25. Matching ANY of them is
  // enough; only report when the writing matches none.
  const candidates = []
  for (const [ref, verse] of verseTexts) {
    const hay = skeleton(verse, 'keep').text
    const at = hay.indexOf(wanted)
    if (at === -1 || !onWordBoundary(hay, at, wanted.length)) continue
    const segment = mushafSegment(verse, wanted)
    if (tidy(segment) === tidy(phrase)) return undefined
    candidates.push({ ref, mushaf: segment })
  }
  if (candidates.length === 0) return undefined

  const best = candidates[0]
  return {
    ref: candidates.length > 1 ? `${best.ref} وغيرها` : best.ref,
    mushaf: best.mushaf,
    detail: firstDifference(tidy(phrase), tidy(best.mushaf)),
  }
}

/** The stretch of the verse whose letters are `wanted`, marks and all. */
function mushafSegment(verse, wanted) {
  const { text, positions } = skeleton(verse, 'keep')
  const at = text.indexOf(wanted)
  if (at === -1) return verse
  const from = positions[at]
  let to = (positions[at + wanted.length - 1] ?? verse.length - 1) + 1
  while (to < verse.length && !/[\u0621-\u064A\u0671\s]/.test(verse[to])) to++
  return verse.slice(from, to).trim()
}

/** Where two strings first diverge, named by codepoint so it is actionable. */
function firstDifference(mine, theirs) {
  const a = [...mine]
  const b = [...theirs]
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === b[i]) continue
    const name = (ch) => (ch ? `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}` : '\u0644\u0627 \u0634\u064A\u0621')
    return `\u0623\u0648\u0651\u0644 \u0641\u0631\u0642 \u0639\u0646\u062F \u0627\u0644\u062D\u0631\u0641 ${i + 1}: \u0627\u0644\u0645\u0643\u062A\u0648\u0628 ${name(a[i])}\u060C \u0648\u0627\u0644\u0645\u0635\u062D\u0641 ${name(b[i])}`
  }
  return '\u0627\u0644\u0637\u0648\u0644 \u0645\u062E\u062A\u0644\u0641'
}

/**
 * A run of two or more Arabic words. A quotation from the mushaf is always at
 * least two words, whereas a single word in Uthmani spelling is ordinary
 * teaching vocabulary («the ten nouns that take hamzat al-wasl are …»), which a
 * lesson has every right to print. Requiring two words keeps the check aimed at
 * copied verses and off the vocabulary lists.
 */
const ARABIC_PHRASE = /[\u0621-\u065F\u0670\u0671\u0640\u06D6-\u06ED]+(?: [\u0621-\u065F\u0670\u0671\u0640\u06D6-\u06ED]+)+/g

/** The base letters of a word, without any of the marks sitting on them. */
const baseLetters = (word) => word.replace(/[^\u0621-\u064A\u0671]/g, '')

/**
 * The house style is that every Qur'anic quotation sits inside «guillemets»
 * (or inside an `ayah` block, which is checked above). That gives the checker a
 * reliable way to tell a quotation apart from the Arabic prose around it.
 */
const QUOTED = /«([^«»]{2,})»/g

for (const path of sourceFiles) {
  const raw = await readFile(path, 'utf8')
  const where = relative(ROOT, path)

  // The verse text of a ref block is resolved from the corpus and already
  // exact. Its prose fields — note, q, why, wrong, right — are hand-written and
  // reach the reader, so they are checked like any other prose.
  const prose = raw.replace(
    /```(ayah|examples|quiz)\r?\n([\s\S]*?)```/g,
    (_whole, _lang, body) =>
      body
        .split('\n')
        .filter((line) => /^\s*(-\s*)?(note|q|why|wrong|right|title|mnemonic):/.test(line))
        .join('\n'),
  )

  const quoted = []
  for (const [whole, inner] of prose.matchAll(QUOTED)) {
    quoted.push(whole)
    const problem = quotationProblem(inner)
    if (problem) {
      fail(
        `${where}: هذه العبارة قرآنيّة لكنّها لا تطابق المصحف:\n` +
          `      المكتوب: ${inner.trim()}\n` +
          `      المصحف : ${problem.mushaf}   (${problem.ref})\n` +
          `      ${problem.detail}\n` +
          `      استعمل بلوك \`ayah\` بحقل \`ref\`، أو انسخ اللفظ من المصحف كما هو.\n` +
          `      وإن كان الاختلاف مقصودًا (نطقُ قارئٍ مخطئ مثلًا) فأضِفه إلى\n` +
          `      DELIBERATE في هذا الملفّ مع سبب واضح.`,
      )
    }
  }

  // Mushaf orthography outside a quotation means someone pasted a verse into
  // running text. Wrap it in «» so it gets checked, or use an `ayah` block.
  let outside = prose
  for (const segment of quoted) outside = outside.replace(segment, '')

  // A lone mushaf character is a typographic example, not a quotation: a
  // lesson may well need to show what hamzat al-wasl looks like on its own.
  // Only flag it once it sits inside a real word, the shortest thing anyone
  // could actually be quoting.
  for (const [phrase] of outside.matchAll(ARABIC_PHRASE)) {
    if (!MUSHAF_ONLY.test(phrase)) continue
    if (baseLetters(phrase).length < 5) continue
    const at = outside.indexOf(phrase)
    fail(
      `${where}: رسمٌ عثمانيّ خارج علامتَي الاقتباس «…»:\n` +
        `      …${outside.slice(Math.max(0, at - 30), at + phrase.length + 30).trim()}…\n` +
        `      ضَع الآية بين «…» أو استعمل بلوك \`ayah\` حتّى تُراجَع آليًّا.`,
    )
    break // one report per file is enough to send the author there
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Report
// ─────────────────────────────────────────────────────────────────────────────

if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} مشكلة في النصّ القرآنيّ:\n`)
  for (const problem of problems) console.error(`  • ${problem}\n`)
  console.error('لم يُكتب أيّ ملف. صحِّح ما سبق ثمّ أعِد المحاولة.\n')
  process.exit(1)
}

const payload = { source: SOURCE_NOTE, ayat, spans }
await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`)

console.log(
  `✓ src/content/quran.generated.json — ${Object.keys(ayat).length} verses, ` +
    `${Object.keys(spans).length} resolved spans, all matching the mushaf.`,
)
