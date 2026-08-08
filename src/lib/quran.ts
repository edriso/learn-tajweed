import data from '@/content/quran.generated.json'

/**
 * Qur'anic text used by the lessons.
 *
 * IMPORTANT: nothing here is typed by hand. `src/content/quran.generated.json`
 * is produced by `npm run quran:build`, which reads every `ref:` in the lesson
 * files and copies the verses out of the checked-in Uthmani text in
 * `data/quran-uthmani.json`. The build fails if a reference does not resolve,
 * so a lesson can never ship a verse that is missing, misspelt or invented.
 *
 * See docs/quran-pipeline.md for the whole flow.
 */

export interface QuranAyah {
  surah: number
  ayah: number
  /** Arabic surah name without the word «سورة», e.g. «البقرة». */
  surahName: string
  /** The exact Uthmani text of the verse. */
  text: string
}

interface QuranData {
  /** Where the text came from, shown in «عن الدليل». */
  source: string
  ayat: Record<string, QuranAyah>
  /**
   * Resolved character ranges for every `show:` / `highlight:` phrase used in a
   * lesson, keyed as "<ref>|<phrase>". Matching happens once at build time so
   * the browser never has to guess.
   */
  spans: Record<string, [number, number]>
}

// TypeScript reads the generated JSON as `number[]` for the span pairs; the
// build script guarantees they are always exactly two numbers.
const QURAN = data as unknown as QuranData

export const QURAN_SOURCE = QURAN.source

/** `2:19` -> the verse. Returns undefined only if the build data is stale. */
export function getAyah(ref: string): QuranAyah | undefined {
  return QURAN.ayat[ref]
}

/** Character range of a phrase inside a verse, resolved at build time. */
export function getSpan(ref: string, phrase: string): [number, number] | undefined {
  return QURAN.spans[`${ref}|${phrase}`]
}

/**
 * Character range of a phrase inside another phrase.
 * An example card shows one short phrase and colours part of it. That inner
 * part is resolved inside its own phrase rather than across the whole verse,
 * because a word like «مِن» can occur four times in one long verse.
 */
export function getInnerSpan(
  ref: string,
  word: string,
  phrase: string,
): [number, number] | undefined {
  return QURAN.spans[`${ref}|${word}|${phrase}`]
}

/** «2:19» -> «سورة البقرة، الآية ١٩» */
export function ayahLabel(ayah: QuranAyah, digits: (value: number) => string): string {
  return `سورة ${ayah.surahName}، الآية ${digits(ayah.ayah)}`
}

/** Deep link to the verse on quran.com, for readers who want the context. */
export function quranComUrl(ayah: QuranAyah): string {
  return `https://quran.com/${ayah.surah}/${ayah.ayah}`
}
