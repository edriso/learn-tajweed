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
 */
const MUSHAF_ONLY = /[\u0670\u0671\u06D6-\u06ED]/

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

/** Every verse as a skeleton, so a quoted phrase can be found anywhere. */
const haystacks = [...verses.values()].map((verse) => skeleton(verse, 'keep').text)

function isInMushaf(phrase) {
  return queryForms(phrase, 'keep').some((needle) =>
    haystacks.some((hay) => {
      const at = hay.indexOf(needle)
      return at !== -1 && onWordBoundary(hay, at, needle.length)
    }),
  )
}

for (const path of sourceFiles) {
  const raw = await readFile(path, 'utf8')
  const where = relative(ROOT, path)

  // Text inside a ref block is a reference, not a quotation: already checked.
  const prose = raw.replace(/```(ayah|examples|quiz)\r?\n[\s\S]*?```/g, '')

  const quoted = []
  for (const [whole, inner] of prose.matchAll(QUOTED)) {
    quoted.push(whole)
    if (!MUSHAF_ONLY.test(inner)) continue // an ordinary quotation, not a verse
    if (!isInMushaf(inner)) {
      fail(
        `${where}: هذا النصّ يبدو قرآنيًّا لكنّه لا يطابق المصحف حرفًا بحرف:\n` +
          `      ${inner.trim()}\n` +
          `      الأفضل استعمال بلوك \`ayah\` بحقل \`ref\` بدلًا من كتابة الآية باليد.`,
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
