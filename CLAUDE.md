# CLAUDE.md

Guidance for Claude Code (and for humans) working in this repository.

## What this project is

A free Arabic guide to Qur'anic tajweed, on **رواية حفص عن عاصم من طريق الشاطبيّة**.
Thirty-four lessons in eleven units, written for someone who reads Arabic and knows
tashkeel but does not know the names of the rules.

- **Live site:** https://edriso.github.io/learn-tajweed/
- **Repo:** https://github.com/edriso/learn-tajweed

The audience reads Arabic natively. Clarity beats cleverness, and correctness beats
everything.

## Read these first

| File | When |
| --- | --- |
| [docs/writing-lessons.md](./docs/writing-lessons.md) | Before touching any file in `src/content/` |
| [docs/quran-pipeline.md](./docs/quran-pipeline.md) | Before touching `scripts/` or anything about Qur'anic text |

## Commands

```bash
npm run dev          # verify the text, then start the dev server
npm run build        # verify + tsc + vite build + pre-render every route
npm run check        # verify + lint + type-check, no build
npm run quran:find -- "من الصواعق"   # find which verse contains a phrase
```

Always run `npm run check` before pushing.

## The rules that matter most

### 1. Never type a Qur'anic verse

Reference it (`ref: 2:19`) and the build inserts the exact text from the pinned Uthmani
corpus. If a verse must appear in running prose, wrap it in `«…»` and the build will
check it character by character. See [docs/quran-pipeline.md](./docs/quran-pipeline.md).

### 2. Never present a contested point as settled

Tajweed has genuine scholarly disagreement. Where it exists, the lesson says so, names
who holds what, and links the source. Examples already in the content:

- the ruling (حكم) of tajweed's detailed rules: واجب vs مستحب
- اللحن الخفيّ: عيب يجب اجتنابه vs مكروه
- «نَخْلُقكُّم»: إدغام كامل vs ناقص
- العين in the فواتح: 4 vs 6 harakat
- colour-coding mushafs (discussed in `about.md`)

If you add content that touches a disputed point and you flatten it into one answer, that
is a defect even if the answer you picked is the majority one.

### 3. Always name the riwayah when it matters

This guide is Hafs from al-Shatibiyyah. Where Tayyibah or another riwayah differs, say
so. Readers hear other recitations and must not conclude those are mistakes. The clearest
case is قصر المنفصل, which is valid from Tayyibah and not from Shatibiyyah.

### 4. Arabic typography has three hard rules

These are not preferences. Each one was a real bug before it was a rule.

- **Never put a `text-*` utility on `.quran`.** Tailwind's size utilities set a
  line-height too, so `text-2xl` silently clamps the line box and clips the
  tashkeel. Use `.quran-md` or `.quran-sm`, which change only the size.
- **Never set a line-height below `normal` on Qur'anic text.** Amiri Quran has a
  2.45em content area (1.82em ascender, 0.63em descender) because it reserves
  room for stacked waqf marks. Anything shorter and consecutive lines collide,
  starting with exactly the marks the reader came for. `.quran` pins 2.5.
- **Never use `letter-spacing` on Arabic.** It is a joined script: positive
  tracking breaks the connecting stroke, negative tracking merges the dots of
  ب ت ث and ج ح خ. The `--tracking-*` tokens are zeroed in `src/index.css` so a
  stray `tracking-tight` cannot reintroduce it.

A single letter in a fixed square is its own problem: centring by line box puts
the baseline 0.59em too low and drops the tail of a letter like غ out of the
box. `.letter-chip` compensates with bottom padding. See the comment there.

Prefer logical properties (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`,
`text-start`, `border-e`) over physical ones everywhere, so nothing hardcodes a
side. Media transport icons (play, pause) are the one thing that must **not**
mirror: they point at the direction of the audio, not the direction of reading.

### 5. Arabic character classes get `\uXXXX` escapes

In `scripts/` and in `src/lib/arabic.ts`, never type Arabic letters inside a regular
expression. A bidirectional editor reorders ranges on screen, so a range can be saved
completely differently from how it reads, silently. This already happened once and the
self-test in `build-quran.mjs` exists because of it. See the pipeline doc.

### 6. Nothing haram

No images of people, no music, no channels that mix teaching with entertainment. Videos
come from the shaykh's own channel, not from TV re-uploads. Verify a video id before
embedding it.

## Architecture

The site is content-driven. Lessons are Markdown; React is the shell that renders them.

```
data/                     the mushaf text + surah names, pinned by checksum
scripts/                  fetch, verify, generate, search
src/
  content/lessons/*.md    THE CONTENT. One file = one lesson, no code change needed.
  content/pages/*.md      the summary sheet and the about page
  content/quran.generated.json   generated, never edit by hand
  lib/units.ts            the eleven units in curriculum order
  lib/rules.ts            single source of truth for rule names, colours, definitions
  lib/glossary.ts         terms that are not rule names
  lib/quiz.ts             extracts every quiz question for the practice page
  components/content/     the custom Markdown blocks (ayah, examples, letters, …)
  components/layout/      header, footer, theme toggle, back-to-top
  pages/                  Home, LessonPage, Practice, Cheatsheet, Glossary, About
```

Decisions worth keeping:

- **Tailwind CSS v4, CSS-first.** No `tailwind.config.js`. Tokens live in the `@theme`
  block of `src/index.css`. The green hue is one number (158) in that file; change it
  there to recolour the whole site.
- **Dark mode** is a `dark` class on `<html>`, set before first paint by the inline
  script in `index.html`, toggled by `src/hooks/useTheme.ts`.
- **Arabic only, RTL.** `<html lang="ar" dir="rtl">` is fixed. Use logical CSS properties
  (`ps-`, `pe-`, `border-inline-start`) so nothing hardcodes a side.
- **Two fonts, self-hosted.** Cairo for the interface, Amiri Quran for Qur'anic text
  only. Amiri Quran has no bold; never ask for one, it would fake it and blur the
  diacritics.
- **Rule colours are a teaching aid, not part of the revelation.** Every colour is always
  accompanied by the rule's name in words, so the page works without colour.
- **GitHub Pages** serves the site under `/learn-tajweed/`. That is `base` in
  `vite.config.ts` and flows into the router through `import.meta.env.BASE_URL`.
  `scripts/prerender-routes.mjs` then writes a copy of `index.html` at every route,
  so a deep link answers 200 rather than the 404 a bare SPA fallback would give. It
  also rewrites each copy's `<title>`, description, Open Graph tags and canonical
  from that lesson's own frontmatter, because the crawlers behind a WhatsApp or
  Telegram link preview do not run the JavaScript that sets `document.title`. The
  same pass writes `sitemap.xml` and `robots.txt`. If you change the `<head>` in
  `index.html`, that script fails loudly rather than silently shipping 38 pages
  that all claim to be the home page.
- **No backend, no accounts, no analytics.** Progress is `localStorage` only.

## Adding a rule

1. Add it to `RULES` in `src/lib/rules.ts` with its Arabic name, colour, one-line
   definition, and the slug of the lesson that teaches it.
2. Write that lesson.
3. `npm run check` verifies the slug exists.

The rule then appears automatically in the glossary, in rule badges, and in any block
that names it.

## Git conventions

- Short imperative subjects. A conventional prefix (`feat:`, `fix:`, `docs:`, `content:`)
  is welcome.
- **No AI signatures.** Do not add "Generated with Claude" lines or `Co-Authored-By:
  Claude` trailers.
- Content changes can go straight to `main`. Use a branch for anything risky.
- Pushing to `main` deploys (`.github/workflows/deploy.yml`).
