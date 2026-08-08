# How the Qur'anic text is verified

This document explains the one thing about this repository that is genuinely unusual,
and why it works the way it does.

## The problem

A tajweed site is made almost entirely of Qur'anic quotations. Copy a verse by hand and
you can very easily lose an invisible character: a tatweel, a superscript alef, a pause
mark. The result renders convincingly and reads correctly out loud, and nobody in code
review will ever spot it.

Publishing a wrong verse is not a bug. It is a wrong quotation of the Book of Allah.

## The solution in one line

> Nobody types a verse. Lessons cite a number; the build inserts the text.

## The moving parts

```
data/quran-uthmani.txt          the mushaf, 1.4 MB, checked in, pinned by SHA-256
data/surah-names.json           114 names + verse counts, so refs can be range-checked
scripts/fetch-quran.mjs         re-downloads both and refuses to write on a bad checksum
scripts/build-quran.mjs         the verifier + generator (runs before dev and build)
scripts/find-ayah.mjs           search helper for lesson authors
src/content/quran.generated.json   the output: only the verses the lessons actually use
src/lib/quran.ts                the tiny runtime that reads it
```

## What runs on every build

`npm run dev` and `npm run build` both start with `npm run quran:build`. That script:

### 1. Checks the corpus has not changed

```
sha256(data/quran-uthmani.txt) === 7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326
```

If it differs, the build stops. Restore the file with `npm run quran:fetch`, which
downloads from Tanzil and refuses to write anything whose checksum does not match.

### 2. Parses the corpus and strips the basmala

Tanzil joins the basmala onto verse 1 of 112 surahs. We show verses on their own, so it
comes off. The basmala is taken **from verse 1:1**, never typed: a hand-written copy
differs by one invisible tatweel and silently stops matching.

Two surahs (al-Tin and al-Qadr) carry a basmala with a shadda on the baa, because the
surahs before them end in a baa. The longer form is tried first. The script asserts that
exactly 112 prefixes were removed, so a change in Tanzil's conventions would be caught
rather than absorbed.

### 3. Self-tests the Arabic normalisation

Four assertions run before anything else is checked. They exist because of a real bug:
the character ranges in these helpers were originally typed in Arabic, and a
bidirectional editor renders "from U+0610 to U+061A" back to front, so the range that
got saved was a completely different one. Every letter counted as a diacritic, every
phrase folded to the empty string, and every lookup "matched". Nothing threw.

**This is why every Arabic character class in `scripts/` and in `src/lib/arabic.ts` is
written with `\uXXXX` escapes.** The escapes are ASCII, so what you read is what the
regex engine sees. Please keep it that way.

### 4. Collects every reference in the repository

- ` ```ayah `, ` ```examples ` and ` ```quiz ` blocks, from their `ref:` fields
- `getAyah('73:4')` and `getSpan('73:4', '…')` calls with literal arguments in `.tsx`

Each reference is range-checked against `data/surah-names.json`: surah 115 or verse 300
of al-Fatihah fails immediately.

### 5. Resolves every highlighted phrase

A lesson writes phrases the ordinary way, without tashkeel: `highlight: من الصواعق`.
Resolving that to a character range in `مِّنَ ٱلصَّوَٰعِقِ` is the interesting part.

The verse is reduced to a **skeleton**: diacritics, tatweel and pause marks are dropped,
and spelling variants are folded (`ٱ أ إ آ → ا`, `ى → ي`, `ة → ه`, `ؤ → و`, `ئ → ي`).
Each surviving character remembers where it came from, so a match can be mapped back to
real offsets in the original text.

The superscript alef stands for an alef the Uthmani script does not write, and a reader
may or may not spell it out. Three readings are tried in turn:

| mode | `ٱلْكِتَـٰبُ` | `ٱلصَّلَوٰةَ` |
| --- | --- | --- |
| `keep` | الكتاب | الصلواة |
| `merge` | الكتاب | الصلاة |
| `drop` | الكتب | الصلوة |

Alef madda needs the same treatment for a subtler reason. The mushaf stores `ٱلضَّآلِّينَ`
as alef + U+0653, but `String.normalize('NFC')` fuses those into the single character
`آ`. A naive rule of "always expand alef madda into hamza + alef" therefore turns
الضالين into الضءالين and nothing matches. Both readings are produced and both are tried.

Two hard requirements:

- **Word boundaries.** A match must start and end on a whole word, so `من` never matches
  inside `مؤمن`.
- **Uniqueness.** If a phrase occurs more than once in the verse the build fails and asks
  for a longer phrase. Silently colouring the wrong occurrence would be worse than
  stopping.

When a phrase does not resolve, the error prints the verse twice, in Uthmani script and
as a skeleton, so the author can copy the exact form. That is the whole authoring loop.

### 6. Catches hand-typed Qur'an anywhere in the repository

Hamzat al-wasl, the superscript alef and the mushaf pause marks appear in the mushaf and
essentially nowhere else in ordinary Arabic writing.

- Text inside `«…»` containing any of them is checked against the mushaf.
- Two or more consecutive Arabic words containing any of them **outside** `«…»` is a
  build failure: wrap it or use an `ayah` block.
- A single word is allowed. A lesson has to be able to print `ٱ` on its own to show what
  hamzat al-wasl looks like, and one word is never a quotation.

### 7. Validates the lessons themselves

- Every YAML block parses (a colon inside Arabic prose is the usual culprit, and would
  otherwise throw in the browser and blank the page).
- Every lesson has its required frontmatter fields.
- Every `unit:` exists in `src/lib/units.ts`.
- No two lessons share an `order`.
- Every quiz `answer` indexes a real option, and no question is missing its `why`.
- Every `lesson:` slug in `rules.ts` and `glossary.ts` points at a lesson that exists.

### 8. Writes the output

```json
{
  "source": "…tanzil.net…",
  "ayat":  { "2:19": { "surah": 2, "ayah": 19, "surahName": "البقرة", "text": "…" } },
  "spans": { "2:19|من الصواعق": [83, 100] }
}
```

Only the verses the lessons actually use, so the browser downloads a few kilobytes
rather than the whole mushaf. The ranges are pre-resolved, so nothing is matched at
runtime and the page cannot disagree with the build.

**If anything above fails, no file is written and the build exits non-zero.** CI runs the
same command, so a broken reference can never reach the published site.

## Updating the corpus

Only if Tanzil publishes a genuine revision:

```bash
npm run quran:fetch     # fails loudly if the checksum has changed
```

If it fails, **do not just update the constant**. Diff the two files, read what changed,
and satisfy yourself it is a real upstream correction before editing `EXPECTED_SHA256`
in both `scripts/fetch-quran.mjs` and `scripts/build-quran.mjs`.

## Licence of the text

The text is © [Tanzil Project](https://tanzil.net/), CC BY 3.0, Uthmani script following
the Madinah Mushaf. The terms permit distribution and require attribution, and forbid
modification. This repository uses the file byte for byte and never edits it, which is
also exactly what the checksum enforces.
