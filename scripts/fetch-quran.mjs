#!/usr/bin/env node
/**
 * Downloads the Uthmani Qur'an text from Tanzil and writes it to
 * data/quran-uthmani.txt, refusing to write anything whose checksum does not
 * match the expected one.
 *
 *   npm run quran:fetch
 *
 * You normally never need this: the file is committed to the repository so
 * builds are reproducible and offline. Run it only to re-verify the copy we
 * ship against the source, or to update the pin deliberately.
 *
 * Text © Tanzil Project (https://tanzil.net), CC BY 3.0. The Uthmani type
 * follows the Madinah Mushaf. Changing the text is not permitted, and this
 * repository never does: the file is used verbatim.
 */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { CORPUS as TARGET, CORPUS_SHA256, NAMES } from './corpus.mjs'

/**
 * Every flag matters. Drop `marks` and the pause signs disappear; drop `rub`
 * and 199 verses lose their ۞; drop `tatweel` and the superscript alef is
 * written differently. `txt-2` is the "sura|aya|text" layout.
 */
const SOURCE =
  'https://tanzil.net/pub/download/index.php' +
  '?quranType=uthmani&outType=txt-2&marks=true&sajdah=true&rub=true&tatweel=true&agree=true'

const response = await fetch(SOURCE)
if (!response.ok) {
  console.error(`✗ Tanzil returned HTTP ${response.status}. Nothing was written.`)
  process.exit(1)
}

const bytes = Buffer.from(await response.arrayBuffer())
const sha256 = createHash('sha256').update(bytes).digest('hex')

if (sha256 !== CORPUS_SHA256) {
  console.error('✗ Checksum mismatch. Nothing was written.')
  console.error(`  expected ${CORPUS_SHA256}`)
  console.error(`  received ${sha256}`)
  console.error('\n  If Tanzil genuinely published a new revision, review the diff by hand')
  console.error('  before updating CORPUS_SHA256 in scripts/corpus.mjs.')
  process.exit(1)
}

await mkdir(dirname(TARGET), { recursive: true })
await writeFile(TARGET, bytes)
console.log(`✓ Wrote data/quran-uthmani.txt (${bytes.length.toLocaleString('en-US')} bytes)`)
console.log(`  sha256 ${sha256}`)

/*
 * Surah names and verse counts, so the build can print «سورة البقرة» next to a
 * verse and reject a reference to an ayah that does not exist. Fetched rather
 * than typed by hand, for the same reason as the text itself.
 */
const chapters = await fetch('https://api.quran.com/api/v4/chapters?language=ar')
if (!chapters.ok) {
  console.error(`✗ Could not fetch surah names (HTTP ${chapters.status}).`)
  console.error('  data/quran-uthmani.txt was written; re-run to get the names.')
  process.exit(1)
}

const { chapters: list } = await chapters.json()
if (list.length !== 114) {
  console.error(`✗ Expected 114 surahs, received ${list.length}. Nothing was written.`)
  process.exit(1)
}

const names = Object.fromEntries(
  list.map((chapter) => [chapter.id, { name: chapter.name_arabic, verses: chapter.verses_count }]),
)
await writeFile(NAMES, `${JSON.stringify(names, null, 2)}\n`)
console.log('✓ Wrote data/surah-names.json (114 surahs)')
