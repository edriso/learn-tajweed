# تعلَّم التجويد · Learn Tajweed

> **الموقع → [dartajweed.com](https://dartajweed.com/)**

دليلٌ مجّانيٌّ مفتوح المصدر لتعلُّم أحكام تجويد القرآن الكريم، بالعربيّة الفصحى، على
**رواية حفص عن عاصم من طريق الشاطبيّة**.

مكتوبٌ لمن يقرأ العربيّة ويعرف التشكيل لكنّه لا يعرف أسماء الأحكام ولا متى تُطبَّق:
أربعةٌ وثلاثون درسًا في إحدى عشرة وحدة، من الأسهل إلى الأصعب، مع أمثلةٍ مسموعةٍ من
القرآن الكريم وتمارينَ بعد كلّ درس.

A free, open-source Arabic guide to Qur'anic tajweed. Thirty-four lessons in eleven
units, ordered from easiest to hardest, with audio examples and quizzes.

---

## Why this repo is unusual: the text is machine-verified

Nobody types a Qur'anic verse into this repository. Lessons reference verses by number
(`ref: 2:19`) and the build fills in the text from a checked-in Uthmani corpus that is
pinned by SHA-256.

`npm run build` refuses to produce a site if any of these fail:

1. The corpus in `data/quran-uthmani.txt` no longer matches its pinned checksum.
2. A lesson references a verse that does not exist.
3. A phrase a lesson wants to highlight is not in that verse, or occurs more than once.
4. Any file contains Uthmani orthography that does not match the mushaf character for
   character.
5. Any lesson has broken frontmatter, a duplicate order, or an unknown unit.

Full details: [docs/quran-pipeline.md](./docs/quran-pipeline.md).

## Tech stack

- [React 19](https://react.dev/) + TypeScript (strict) on [Vite](https://vite.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/), CSS-first theming, light and dark
- [React Router](https://reactrouter.com/) for pages
- Lessons are plain Markdown rendered with [react-markdown](https://github.com/remarkjs/react-markdown), plus a handful of custom blocks
- Self-hosted fonts: **Cairo** for the interface, **Amiri Quran** for Qur'anic text
- No backend, no accounts, no tracking. Progress lives in `localStorage`.

## Run it locally

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build        # verify the text, type-check, build, and pre-render routes
npm run preview      # serve the production build
npm run lint         # oxlint
npm run check        # verify + lint + type-check, without building

npm run content:build # regenerate the verse data and the lesson index (runs automatically)
npm run quran:fetch  # re-download the corpus from Tanzil and verify its checksum
npm run quran:find -- "من الصواعق"   # find which verse contains a phrase
npm run og           # regenerate the share card and PNG icons (needs Chrome)
```

## Add or edit a lesson

1. Create a file in `src/content/lessons/`, for example `madd-badal.md`.
2. Copy the frontmatter from a neighbouring lesson and fill it in.
3. Write the body using the blocks documented in
   [docs/writing-lessons.md](./docs/writing-lessons.md).
4. Run `npm run check`. It will tell you, in Arabic, exactly what is wrong.

No code change is needed. The file name becomes the URL
(`madd-badal.md` → `/lessons/madd-badal`), and the site picks it up automatically.

## Project structure

```
data/                     the Uthmani mushaf text + surah names (checked in, pinned)
scripts/
  fetch-quran.mjs         downloads the corpus and verifies its checksum
  build-quran.mjs         verifies every reference and generates the runtime data
  find-ayah.mjs           search helper for lesson authors
src/
  content/lessons/*.md    THE CONTENT. One file = one lesson.
  content/pages/*.md      the summary sheet and the about page
  lib/units.ts            the eleven units, in curriculum order
  lib/rules.ts            every tajweed rule: name, colour, definition, lesson
  lib/glossary.ts         terms that are not rule names
  components/content/     the custom Markdown blocks
  components/layout/      header, footer, theme toggle, back-to-top
  components/CompletionCard.tsx   what the reader sees on finishing the guide
  components/ProgressBar.tsx      how far through the curriculum they are
  pages/                  Home, LessonPage, Practice, Cheatsheet, Glossary, About
docs/                     how the pipeline works, how to write a lesson
```

## Sources

- **Qur'anic text:** [Tanzil Project](https://tanzil.net/), Uthmani script, CC BY 3.0.
- **Surah names:** [quran.com](https://quran.com/) API.
- **Recitation audio:** [everyayah.com](https://everyayah.com/), Shaykh Mahmoud Khalil
  al-Husary, murattal.
- **Content:** built on the standard references of the field, cited lesson by lesson.
  The main ones are [قواعد التجويد على رواية حفص](https://shamela.ws/book/11301) by
  عبد العزيز بن عبد الفتاح القارئ, [المقدّمة الجزريّة](https://www.alukah.net/sharia/0/58168/),
  [متن تحفة الأطفال](https://shamela.ws/book/9632), and
  [هداية القاري](https://www.islamweb.net/ar/library/content/231/1/) by المرصفيّ.

## Contributing

Found a mistake? It is a mistake about the Book of Allah, so please report it:

- Open an issue on this repository, or
- Send a pull request.

If the correction is a point of tajweed, cite a source from the recognised books of
the field so it can be checked.

## Deployment

### Forking this: what you have to do

Nothing. Fork it, turn on GitHub Pages (Settings → Pages → Source: **GitHub Actions**),
and push. The workflow works out your address from your repository name, so your copy
builds for `https://<your-username>.github.io/<your-repo>/` without you editing a file.

You do **not** need to change `site.config.mjs`, and no part of this repository points a
fork at the original site.

### How it works

Every push to `main` runs `.github/workflows/deploy.yml`. It verifies the Qur'anic text,
builds the site, and publishes it to GitHub Pages. Two environment variables control the
addresses, and both have sensible defaults:

| Variable | What it means | Default |
| --- | --- | --- |
| `SITE_URL` | Where this build is **served from**. Assets, links and fonts resolve against it. | `https://<owner>.github.io/<repo>/` |
| `SITE_CANONICAL` | The address this build **says it is**, in canonical tags and the sitemap. | the same as `SITE_URL` |

They are only different when one site is published at two addresses. To build a copy
locally for a specific address:

```bash
SITE_URL=https://example.com/ npm run build
```

### Publishing at a second address (optional)

This repository publishes twice, at [dartajweed.com](https://dartajweed.com/) and at
[edriso.github.io/learn-tajweed](https://edriso.github.io/learn-tajweed/). The reason is
worth knowing before you copy it: **GitHub Pages redirects a repository's own Pages URL
to its custom domain, and there is no setting to stop it.** So attaching a domain does
not leave the github.io address as a spare — it turns it into a sign pointing at the
domain, and if the domain ever expires both addresses break at once. Publishing the same
files to a second repository is the only way to keep an address that does not depend on
the domain being paid for.

To set that up, add these in Settings → Secrets and variables → Actions:

| Name | Kind | Example |
| --- | --- | --- |
| `MIRROR_REPO` | Variable | `edriso/dartajweed` |
| `SITE_URL` | Variable | `https://dartajweed.com/` |
| `MIRROR_DEPLOY_KEY` | Secret | private half of an SSH deploy key with write access to `MIRROR_REPO` |

**Leave `MIRROR_REPO` unset and the whole second half is skipped** — the `mirror` job
never runs, so a fork never sees a failed deploy. The mirror repository holds no source,
only the built site, replaced on every deploy. Its build writes a `CNAME` file, because
branch-based Pages reads that file where `actions/deploy-pages` ignores it, and every
mirror push replaces everything.

Both copies claim the same canonical address, so two sites with identical text never
compete in search, and each serves its own `og:image` so link previews keep working even
if the other address is down.

## Licence

| What | Licence |
| --- | --- |
| Everything written for this repository — the app, the build scripts, the styling, and the lessons | [0BSD](./LICENSE) |
| The Qur'anic text in `data/` | © [Tanzil Project](https://tanzil.net/docs/tanzil_license), CC BY 3.0 — see [NOTICE](./NOTICE) |
| Surah names, recitation audio, fonts | third-party — see [NOTICE](./NOTICE) |

[0BSD](https://opensource.org/license/0bsd) is a public-domain-equivalent
licence: fork the site, print the lessons for a halaqah, translate them, put
them in a book, re-host them, sell them. You owe no credit and no notice. It is
sadaqah, and being asked for a footer would defeat the point.

What you cannot relicense is the material this repository only redistributes.
The Tanzil terms on the Qur'anic text require Tanzil to be named and forbid
modifying the text; they travel with it into your fork, so keep the attribution
that is already on the «عن هذا الدليل» page. [NOTICE](./NOTICE) lists all of it.

One request, and it is a request rather than a condition of the licence: if you
republish the lessons, keep the places where the text names a scholarly
disagreement or the riwayah a rule belongs to. Flattening those is how a guide
to reciting the Qur'an starts doing harm.
