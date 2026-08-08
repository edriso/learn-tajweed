/**
 * Small Arabic text helpers.
 *
 * Every character class below is written with \uXXXX escapes rather than the
 * letters themselves. Arabic literals inside a regular expression reorder on
 * screen in any bidirectional editor, which makes a range like "alef to ya"
 * display back-to-front and impossible to review. The escapes are ASCII, so
 * what you read is what the engine sees.
 */

/** Vowel signs, sukun, shadda, the superscript alef and the mushaf marks. */
const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g

/** alef madda, alef hamza above/below, hamzat al-wasl -> plain alef. */
const ALEFS = /[\u0622\u0623\u0625\u0671]/g

const ALEF_MAQSURA = /\u0649/g // ya without dots -> ya
const TA_MARBUTA = /\u0629/g // ta marbuta -> ha
const DEFINITE_ARTICLE = /^\u0627\u0644/ // a leading "al-"

/**
 * Fold a word to a plain, comparable form: no diacritics, one spelling per
 * letter, no definite article. Used for search only, never for display.
 */
export function foldArabic(value: string): string {
  return value
    .replace(MARKS, '')
    .replace(ALEFS, '\u0627')
    .replace(ALEF_MAQSURA, '\u064A')
    .replace(TA_MARBUTA, '\u0647')
    .replace(DEFINITE_ARTICLE, '')
    .trim()
}
