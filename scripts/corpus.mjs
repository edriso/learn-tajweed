/**
 * The pinned mushaf: where it is, and the checksum that says it is unchanged.
 *
 * Two scripts verify this file before trusting a single letter of it —
 * build-quran.mjs, which resolves every verse the lessons reference, and
 * build-og-image.mjs, which slices the verse printed on the share card. Both
 * used to carry their own copy of the hash, joined by a comment saying they
 * must match.
 *
 * Nothing silently went wrong when they drifted; both scripts fail loudly on a
 * mismatch. What did go wrong is that updating the corpus meant remembering two
 * places, and one of the error messages told you to edit "this file" — which
 * after a drift is the wrong advice. For the constant that stands between the
 * site and a misprinted mushaf, one copy is the only defensible number.
 *
 * To change it deliberately: run `npm run quran:fetch`, verify what you got,
 * then update the hash here and nowhere else.
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The Uthmani text from the Tanzil Project. See NOTICE for its terms. */
export const CORPUS = resolve(ROOT, 'data/quran-uthmani.txt')

/** SHA-256 of the bytes of that file. */
export const CORPUS_SHA256 = '7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326'

/** Surah names, fetched alongside the corpus and read beside it. */
export const NAMES = resolve(ROOT, 'data/surah-names.json')
