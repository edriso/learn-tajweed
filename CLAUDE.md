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
npm run og           # regenerate the share card and the PNG icons (needs Chrome)
npm run quran:find -- "من الصواعق"   # find which verse contains a phrase
```

Always run `npm run check` before pushing.

## The rules that matter most

### 1. Never type a Qur'anic verse

Reference it (`ref: 2:19`) and the build inserts the exact text from the pinned Uthmani
corpus. If a verse must appear in running prose, wrap it in `«…»` and the build will
check it character by character. See [docs/quran-pipeline.md](./docs/quran-pipeline.md).

That check is exact, not approximate. Any `«…»` of two or more words whose
letters match a phrase in the mushaf must then match the mushaf's own writing —
every haraka, the madda, hamzat al-wasl, the small seen, the silent-letter
circles. It compares NFC-normalised text, so writing a shadda before or after
its haraka is not a difference; and a fragment may drop the waqf and sajdah
marks, which are the mushaf's editorial furniture rather than part of a word.

If a lesson needs to print something that deliberately is **not** the mushaf —
a quiz quoting a reciter's mistake, a `mistake` block rendering how a wrong
reading sounds — add it to `DELIBERATE` in `scripts/build-quran.mjs` with the
reason. Do not weaken the check, and do not exempt a whole file: every
departure from the mushaf on this site should be one somebody chose on purpose.

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

### 7. Anything third-party gets an entry in NOTICE

Everything written for this repository — the app, the scripts, the lesson text — is
[0BSD](./LICENSE): no attribution, no conditions, deliberately. Do not add a licence
header to a file, and do not add a credit-us line anywhere.

Material this repository only redistributes is the opposite case, because its terms are
not ours to give away. The Qur'anic text is CC BY 3.0 from Tanzil and requires that
Tanzil be named; the fonts are OFL. If you bring in a new corpus, dataset, font or audio
source, add it to [NOTICE](./NOTICE) in the same pass — that file is the only record of
what a forker still owes, so an omission there is what turns a fork into a licence
breach.

## Architecture

The site is content-driven. Lessons are Markdown; React is the shell that renders them.

```
data/                     the mushaf text + surah names, pinned by checksum
scripts/                  fetch, verify, generate, search
src/
  content/lessons/*.md    THE CONTENT. One file = one lesson, no code change needed.
  content/pages/*.md      the summary sheet and the about page
  content/quran.generated.json   generated, never edit by hand
  content/lessons.index.json     generated, never edit by hand
  lib/lessons.ts          lesson metadata: title, unit, order. NO bodies.
  lib/lesson-content.ts   the lesson bodies. Lazy routes only — see below.
  lib/units.ts            the eleven units in curriculum order
  lib/rules.ts            single source of truth for rule names, colours, definitions
  lib/glossary.ts         terms that are not rule names
  lib/quiz.ts             extracts every quiz question for the practice page
  components/content/     the custom Markdown blocks (ayah, examples, letters, …)
  components/layout/      header, footer, settings panel, theme toggle, back-to-top
  components/CompletionCard.tsx   finishing the last lesson: shared by Home and LessonPage
  pages/                  Home, LessonPage, Practice, Cheatsheet, Glossary, About,
                          NotFound, RouteError
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
- **Lesson metadata and lesson bodies are separate modules, on purpose.**
  `lib/lessons.ts` holds only frontmatter, generated into
  `content/lessons.index.json` by `npm run content:build`. `lib/lesson-content.ts`
  eagerly imports all thirty-four Markdown files, so **anything that imports it
  pulls every lesson into its chunk**. Only lazy routes may: the lesson page,
  and the practice page through `lib/quiz.ts`. The home page importing it once
  cost 60 KB gzipped on first load — 40% of the entry chunk — to render a list
  of titles. If you need a lesson's title or unit, use `lessons` from
  `lib/lessons.ts`.
- **Scrolling on a route change is instant, and that is load-bearing.** Do not put
  `scroll-behavior: smooth` back on `<html>`: it applies to the router's own
  `window.scrollTo`, so opening a lesson from halfway down the curriculum used to
  slide the new page past the reader for the best part of a second. Smooth is opt-in
  per action, in JS, where it can also check `prefers-reduced-motion` — the back-to-top
  button is the only place that asks. Two related traps, both already sprung once: an
  in-page jump must be a `Link`, never a bare `<a href="#…">`, or the router mistakes
  the browser's own fragment navigation for a return to the entry the page was opened
  on; and `<ScrollRestoration>` needs a `getKey` carrying the path, because saved
  positions outlive the document while every document's first entry is keyed
  `"default"`.
- **When the code is already deciding where the page sits, `focus()` must pass
  `preventScroll: true`.** `focus()` does two things: it moves focus, and it scrolls
  the element into view. That second scroll is instant, so it also *cancels* a smooth
  scroll already in flight. Both calls that focus `<main>` were bitten. The
  back-to-top button scrolled smoothly to the top and handed focus over on the next
  line, killing the animation — `<main>` is nearly as tall as the document, so its
  scroll-into-view target is a fixed point down by the footer, and the reader was
  dragged there and left: 5057 → 4705, with only a second click reaching 0. `Layout`
  does the same on every route change, where it is invisible today only because
  `<ScrollRestoration>` runs afterwards and overwrites it — react-router's effect
  ordering, not a promise to us. Grow the footer past one screen and the same call
  jumps 3498px.

  This is not a blanket ban. The other focus calls — the header toggle, the settings
  trigger, the transfer confirm button — return focus to a small control that is on
  screen anyway, and `Quiz`'s retry deliberately *wants* the scroll, since the heading
  it focuses is where the reader is meant to end up. The guard belongs where the app
  itself owns the scroll position and focus would fight it.
- **A stale build must not become a broken link.** Every route past the home page is
  loaded on demand and GitHub Pages keeps only the newest deploy, so a tab left open
  across a deploy asks for a chunk that no longer exists and the import throws. The
  `errorElement` in `src/main.tsx` catches it, recognises the message and reloads the
  page once — the router commits the navigation before handing the error over, so the
  address bar already holds the route the reader clicked and a plain reload lands on
  it. Guarded by a `sessionStorage` timestamp: a second failure within ten seconds is
  a real error and gets the error page instead of another reload. Never call
  `preventDefault()` on Vite's `vite:preloadError` — that makes the import resolve to
  `undefined` and the failure resurfaces as an unrecognisable `TypeError`.
- **Finishing the curriculum is marked once, in two different registers.**
  `components/CompletionCard.tsx` serves both. The lesson page mounts it with
  `celebrate` at the instant the last remaining lesson is ticked, and that is the
  only place the burst plays; the home page mounts it in place of the progress bar
  for as long as progress stays at 100%, with no animation, because an entrance
  that replays on every visit stops reading as a celebration. The lesson page
  gates it on `finishedAt === slug` rather than on `finished`, which stays true
  afterwards — a boolean would greet the reader again on every lesson they
  reopened, and would follow them to the next one, since react-router reuses this
  route component across slugs.

  Two things about the card are load-bearing rather than decorative. Every
  keyframe ends on the frame that should survive `prefers-reduced-motion`, since
  the global rule in `index.css` collapses durations to nothing and lands each
  animation on its last frame — so the badge ends settled and the burst ends at
  `opacity: 0`. And the card scrolls *itself* into view with `block: 'nearest'`
  and no `focus()`: the button that summons it is the last thing on a lesson, so
  on a phone the card mounts entirely below the fold, and `focus()` would cancel
  that smooth scroll exactly as it did the back-to-top button's.

  The wording is not a detail either. The verse is a du'a for more knowledge and
  the card says outright that a shaykh is still the next step — congratulating a
  reader into thinking they are finished would teach the one thing `about.md`
  denies.
- **No backend, no accounts, no analytics.** Progress is `localStorage` only. The one
  way it leaves the device is the reader's own doing: export and import buttons in the
  settings panel (`components/layout/ProgressTransfer.tsx`) write and read a small JSON
  file, `{ app, version, savedAt, lessons: [slug] }`. Importing is a **union**, never a
  replacement, and unknown slugs are dropped — so an old file, or a second device's,
  can never lose work or invent a lesson. If you rename a lesson slug, old files simply
  stop matching that one lesson; nothing else breaks.

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
