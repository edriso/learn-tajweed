# تعلَّم التجويد · Learn Tajweed

> **الموقع → [edriso.github.io/learn-tajweed](https://edriso.github.io/learn-tajweed/)**

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
npm run build        # verify the Qur'anic text, type-check, and build to dist/
npm run preview      # serve the production build
npm run lint         # oxlint
npm run check        # verify + lint + type-check, without building

npm run quran:build  # regenerate src/content/quran.generated.json (runs automatically)
npm run quran:fetch  # re-download the corpus from Tanzil and verify its checksum
npm run quran:find -- "من الصواعق"   # find which verse contains a phrase
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

Every push to `main` runs the workflow in `.github/workflows/deploy.yml`, which verifies
the text, builds the site, and publishes it to GitHub Pages at
[edriso.github.io/learn-tajweed](https://edriso.github.io/learn-tajweed/).

## Licence

- Code and lesson text: open source, see this repository.
- Qur'anic text: © Tanzil Project, CC BY 3.0. Used verbatim and never modified.
