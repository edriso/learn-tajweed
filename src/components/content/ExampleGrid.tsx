import { getAyah, getInnerSpan, getSpan, quranComUrl } from '@/lib/quran'
import { getRule, RULE_TEXT_CLASS } from '@/lib/rules'
import { cn, toArabicDigits } from '@/lib/utils'

export interface ExampleItem {
  /** «2:19» — the verse the words are taken from. */
  ref: string
  /** The words to show, written without tashkeel in the lesson file. */
  word: string
  /** The part to colour. Defaults to the whole of `word`. */
  highlight?: string
  /** A very short label, usually the letter that triggers the rule. */
  note?: string
}

export interface ExampleGridSpec {
  /** Applies to every item unless the item sets its own. */
  rule?: string
  items: ExampleItem[]
}

function Example({ item, fallbackRule }: { item: ExampleItem; fallbackRule?: string }) {
  const ayah = getAyah(item.ref)
  const wordSpan = getSpan(item.ref, item.word)
  if (!ayah || !wordSpan) return null

  const rule = getRule(fallbackRule ?? '')
  const text = ayah.text.slice(wordSpan[0], wordSpan[1])

  // Colour only part of the phrase when the lesson asks for it, otherwise all
  // of it. Offsets are relative to the whole verse, so shift them back.
  const inner = item.highlight ? getInnerSpan(item.ref, item.word, item.highlight) : undefined
  const [start, end] = inner
    ? [inner[0] - wordSpan[0], inner[1] - wordSpan[0]]
    : [0, text.length]
  const safe = start >= 0 && end <= text.length && start < end

  return (
    <li className="rounded-xl border border-ink-200 bg-white p-3 text-center transition hover:border-green-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-green-800">
      <p className="quran !text-2xl !leading-snug">
        {safe ? (
          <>
            {text.slice(0, start)}
            <mark className={cn(rule && RULE_TEXT_CLASS[rule.color])}>{text.slice(start, end)}</mark>
            {text.slice(end)}
          </>
        ) : (
          text
        )}
      </p>
      {item.note && (
        <p className="mt-1 text-sm font-medium text-ink-600 dark:text-ink-400">{item.note}</p>
      )}
      <a
        href={quranComUrl(ayah)}
        target="_blank"
        rel="noreferrer"
        className="mt-1 block text-xs text-ink-400 transition hover:text-green-700 dark:hover:text-green-400"
      >
        {ayah.surahName} {toArabicDigits(ayah.ayah)}
      </a>
    </li>
  )
}

/** A grid of short Qur'anic examples: the drill that makes a rule stick. */
export function ExampleGrid({ spec }: { spec: ExampleGridSpec }) {
  return (
    <ul className="my-7 grid list-none grid-cols-2 gap-3 ps-0 sm:grid-cols-3">
      {spec.items.map((item, index) => (
        <Example key={`${item.ref}-${index}`} item={item} fallbackRule={spec.rule} />
      ))}
    </ul>
  )
}
