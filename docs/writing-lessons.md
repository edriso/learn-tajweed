# How to write a lesson

Everything a lesson needs lives in one Markdown file in `src/content/lessons/`. No code
change is ever required to add, remove or reorder a lesson.

This page is the complete reference. If you read only one section, read
[The golden rule](#the-golden-rule).

---

## The golden rule

> **Never type a Qur'anic verse.** Reference it by number and let the build fill it in.

```markdown
```ayah
ref: 2:19
```
```

The verse text comes from `data/quran-uthmani.txt`, a checked-in copy of the Tanzil
Uthmani mushaf pinned by SHA-256. Typing a verse by hand risks a missing tatweel or a
wrong diacritic that nobody would notice in review, so the build refuses to let you.

If you genuinely need Qur'anic text inside a sentence (in the glossary, say, or in a
table cell), wrap it in Arabic guillemets `«…»` and the build will check it against the
mushaf character by character.

---

## The file

```
src/content/lessons/ikhfa-haqiqi.md   →   /lessons/ikhfa-haqiqi
```

The file name becomes the URL. Use lowercase English with hyphens, transliterating the
Arabic name of the rule.

### Frontmatter

Every lesson starts with a YAML block:

```yaml
---
title: الإخفاء الحقيقيّ
description: خمسة عشر حرفًا، وهو أكثر الأحكام دورانًا.
unit: nun-sakinah        # must match an id in src/lib/units.ts
order: 13                # position in the whole curriculum, must be unique
minutes: 10              # rough reading time
emoji: 🌫️
tags: [الإخفاء, الغنّة]   # 2 to 4 short Arabic keywords
videos:                  # optional, embedded at the end under «شاهِد»
  - title: عنوان المقطع (اسم القناة)
    youtubeId: 1mydlMCh9eg
    start: 90            # optional, seconds
resources:               # optional, link cards at the end under «للاستزادة»
  - title: اسم المرجع
    url: https://…
    note: سطرٌ واحدٌ يقول لماذا يستحقّ الفتح.
---
```

`title`, `description`, `unit`, `order`, `minutes` and `emoji` are required. The build
fails if one is missing, if `unit` is unknown, or if two lessons share an `order`.

### ⚠️ Colons in Arabic text

YAML reads `:` as "key: value". An Arabic sentence containing a colon breaks the parser,
and in the browser that means a **blank page**. Wrap any value containing a colon in
single quotes:

```yaml
description: 'أسهل الأحكام الأربعة: انطق النون كما هي.'
```

`npm run check` catches this before it can ship, and tells you which line.

---

## The body

Ordinary Markdown works: headings, bold, lists, tables, links, blockquotes.

Follow this shape, which every lesson uses:

1. **A `>` blockquote** at the very top with the one idea to remember.
2. **`## القاعدة`** with a ` ```rule ` box stating the rule precisely.
3. **The letters**, if the rule has a letter set, in a ` ```letters ` block.
4. **Examples**, in ` ```examples ` grids and ` ```ayah ` cards.
5. **Common mistakes**, in ` ```mistake ` blocks.
6. **A ` ```quiz `** as the last thing in the file.

---

## The blocks

Seven fenced block types turn into real components. Four take YAML; three take Markdown.

### `ayah` — one verse, displayed large

```markdown
```ayah
ref: 13:11
show: من بين يديه ومن خلفه          # optional: display only this part
marks:                              # optional: colour these stretches
  - text: من بين
    rule: iqlab
  - text: ومن خلفه
    rule: izhar
note: سطرٌ واحدٌ يقول ما الذي ننظر إليه.
```
```

For a single mark there is a shorthand:

```yaml
ref: 2:19
highlight: من الصواعق
rule: ikhfa
```

**Write the phrases without tashkeel**, the way you would in ordinary Arabic. The build
resolves them against the mushaf. If a phrase does not resolve it prints the verse both
with and without diacritics, so you can copy the exact form.

Every phrase must occur **exactly once** in the verse. If it occurs more than once the
build says so and you write a longer phrase.

`rule:` values come from `src/lib/rules.ts`. They decide the colour and the badge.

### `examples` — a grid of short examples

The drill that makes a rule stick. Use it after the rule box:

```markdown
```examples
rule: ikhfa                # applies to every item
items:
  - ref: 2:23
    word: إن كنتم صادقين    # the phrase to show
    highlight: كنتم         # optional: colour only this part of it
    note: ت                 # a very short label, usually the trigger letter
```
```

`highlight` is looked for **inside `word`**, not across the whole verse, so a two-letter
word like «مِن» will not be reported as ambiguous.

### `letters` — a rule's letter set

```markdown
```letters
title: حروف الإخفاء الحقيقيّ
items: [ت, ث, ج, د, ذ, ز, س, ش, ص, ض, ط, ظ, ف, ق, ك]
rule: ikhfa                # optional: colours the letters
mnemonic: صِفْ ذَا ثَنَا كَمْ جَادَ…   # optional: the classical mnemonic
note: سطرٌ اختياريّ.
```
```

The count is worked out and displayed automatically, with correct Arabic grammar.

Do not use Uthmani orthography in a mnemonic. Mnemonics are not Qur'an, so write
hamzat al-wasl as a plain alef.

### `mistake` — a common error and its correction

```markdown
```mistake
wrong: ما يفعله الناس عادةً.
right: ما تقتضيه القاعدة.
why: السبب في جملةٍ واحدة.
```
```

Always fill in `why`. Marking something wrong without explaining it does not teach.

### `compare` — two or three rules side by side

```markdown
```compare
columns:
  - title: إخفاءٌ حقيقيّ
    rule: ikhfa            # optional: tints the heading
    points:
      - نقطةٌ قصيرة
      - نقطةٌ أخرى
  - title: إخفاءٌ شفويّ
    rule: ikhfa-shafawi
    points:
      - …
```
```

### `quiz` — questions

```markdown
```quiz
title: اختبِر نفسك          # optional
questions:
  - q: ما حكم النون هنا؟
    ref: 2:9                # optional: shows the Qur'anic phrase above the question
    word: أنفسهم
    options:
      - إخفاءٌ حقيقيّ
      - إظهار
      - إدغام
      - إقلاب
    answer: 0               # index into `options`, so 0 is the FIRST one
    why: الفاء من حروف الإخفاء الخمسة عشر.
```
```

Rules for questions:

- Put the **correct answer first** and use `answer: 0`. It keeps review easy. The
  options are not shuffled, so vary the position only if you have a reason.
- `why` is required. It is shown after answering, right or wrong.
- Four options is the house style. Distractors should be plausible, not silly.
- Every question automatically joins the mixed bank on `/practice`. Write them so they
  still make sense out of context.

### `rule`, `tip`, `note`, `warning` — callout boxes

These four take **Markdown**, not YAML, so lists and bold work inside them:

````markdown
```rule
**الإخفاء:** النطق بالنون بصفةٍ بين الإظهار والإدغام.
```

```tip
حيلةٌ عمليّةٌ للحفظ أو للتطبيق.
```

```note
تفصيلٌ جانبيّ لا يُخلّ تجاهله بالفهم.
```

```warning
شيءٌ يُخطئ فيه كثيرون، أو مسألةٌ فيها خلاف.
```
````

| Box | Heading | Use it for |
| --- | --- | --- |
| `rule` | القاعدة | the precise statement of the rule |
| `tip` | حيلةٌ للحفظ | mnemonics, practical shortcuts |
| `note` | انتبِه | a side detail, or a point of scholarly difference |
| `warning` | تنبيهٌ مهمّ | a common trap, or a caveat about the riwayah |

---

## Writing style

- **Arabic, fully vowelled where it helps.** The reader knows tashkeel; use it on rule
  names and on anything ambiguous, not on every word.
- **Short sentences.** The reader is learning a new vocabulary, not admiring prose.
- **Explain the term the first time it appears**, then use it freely.
- **Say when scholars differ.** Never present a contested point as settled. Say who holds
  what and link the source. This is the single most important editorial rule here.
- **Always name the riwayah when it matters.** If a ruling is specific to Hafs from
  al-Shatibiyyah, say so. The reader will hear other recitations and must not conclude
  they are wrong.
- **Link the source, not a blog.** Prefer islamweb's library, alukah, islamqa,
  shamela, and the published books of the field.
- **Nothing haram.** No images of people, no music, no videos from channels that mix
  teaching with entertainment. Prefer the shaykh's own channel over a TV re-upload.
- **Verify a video before embedding it.** Confirm the id and the title:
  `node -e "fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=ID&format=json').then(r=>r.json()).then(console.log)"`

---

## Before you commit

```bash
npm run check
```

That runs the verifier, the linter and the type-checker. The verifier speaks Arabic and
points at the exact line. Common messages:

| Message | What to do |
| --- | --- |
| `لم يُعثر على «…» في الآية` | Copy the phrase from the "بلا تشكيل" line it prints |
| `العبارة «…» تتكرّر N مرّاتٍ` | Write a longer phrase that pins down the place |
| `فيه خطأٌ في صيغة YAML` | Usually a colon in Arabic text; wrap the value in `'…'` |
| `رسمٌ عثمانيّ خارج علامتَي الاقتباس` | Wrap the verse in `«…»` or move it into an `ayah` block |
| `الترتيب N مستعملٌ أيضًا في …` | Two lessons share an `order`; renumber one |
| `يشير إلى درسٍ غير موجود` | A rule or glossary entry points at a renamed lesson |
