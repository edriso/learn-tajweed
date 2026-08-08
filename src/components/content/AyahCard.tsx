import { Fragment, useId } from 'react'
import { ExternalLink } from 'lucide-react'
import { AudioButton } from './AudioButton'
import { RuleBadge } from './RuleBadge'
import { getAyah, getSpan, quranComUrl } from '@/lib/quran'
import { getRule, RULE_TEXT_CLASS } from '@/lib/rules'
import { cn, toArabicDigits } from '@/lib/utils'

/** One coloured stretch of the verse: the letters a rule applies to. */
export interface AyahMark {
  /** The words to colour, written without tashkeel in the lesson file. */
  text: string
  /** A rule id from src/lib/rules.ts. */
  rule: string
}

export interface AyahSpec {
  /** «2:19» — surah:ayah. */
  ref: string
  /** Show only this part of a long verse. Written without tashkeel. */
  show?: string
  /** Shorthand for a single mark, used with `rule`. */
  highlight?: string
  rule?: string
  marks?: AyahMark[]
  /** One line explaining what to notice. Plain text, no Markdown. */
  note?: string
}

interface Segment {
  text: string
  rule?: string
}

/**
 * Cut the verse into plain and coloured segments.
 * Every range was resolved and checked by `npm run quran:build`, so anything
 * that fails to resolve here means the generated data is stale: we then show
 * the verse uncoloured rather than showing it wrong.
 */
function toSegments(text: string, ref: string, marks: AyahMark[], from: number, to: number): Segment[] {
  const ranges = marks
    .map((mark) => ({ mark, span: getSpan(ref, mark.text) }))
    .filter((entry): entry is { mark: AyahMark; span: [number, number] } => entry.span !== undefined)
    .filter(({ span }) => span[0] >= from && span[1] <= to)
    .sort((a, b) => a.span[0] - b.span[0])

  const segments: Segment[] = []
  let cursor = from

  for (const { mark, span } of ranges) {
    // Skip a mark that overlaps the previous one instead of slicing mid-letter.
    if (span[0] < cursor) continue
    if (span[0] > cursor) segments.push({ text: text.slice(cursor, span[0]) })
    segments.push({ text: text.slice(span[0], span[1]), rule: mark.rule })
    cursor = span[1]
  }
  if (cursor < to) segments.push({ text: text.slice(cursor, to) })

  return segments
}

export function AyahCard({ spec }: { spec: AyahSpec }) {
  const captionId = useId()
  const ayah = getAyah(spec.ref)
  if (!ayah) {
    // Only reachable if the generated data is out of date; `npm run quran:build`
    // fixes it. Never render a guess in place of a verse.
    return (
      <p className="my-6 rounded-card border border-rule-idgham/40 bg-rule-idgham/5 p-4 text-sm text-rule-idgham">
        الآية <bdi>{spec.ref}</bdi> غير موجودة في بيانات المصحف. شغِّل{' '}
        <code>npm run quran:build</code>.
      </p>
    )
  }

  const marks: AyahMark[] = spec.marks ?? []
  if (spec.highlight && spec.rule) marks.unshift({ text: spec.highlight, rule: spec.rule })

  const showSpan = spec.show ? getSpan(spec.ref, spec.show) : undefined
  const [from, to] = showSpan ?? [0, ayah.text.length]
  const isPartial = from > 0 || to < ayah.text.length

  const segments = toSegments(ayah.text, spec.ref, marks, from, to)
  const usedRules = [...new Set(marks.map((mark) => mark.rule))]

  return (
    <figure
      aria-labelledby={captionId}
      className="my-7 overflow-hidden rounded-card border border-ink-200 bg-white shadow-soft dark:border-ink-800 dark:bg-ink-900"
    >
      <div className="border-b border-gold-200/70 bg-gold-100/40 px-4 py-2.5 dark:border-gold-900/60 dark:bg-gold-900/15">
        <div className="flex items-center justify-between gap-3">
          <p id={captionId} className="text-sm font-semibold text-ink-700 dark:text-ink-300">
            سورة {ayah.surahName}
            <span className="mx-1.5 text-ink-400" aria-hidden="true">
              ·
            </span>
            الآية {toArabicDigits(ayah.ayah)}
            {isPartial && <span className="text-ink-600 dark:text-ink-400"> (جزء منها)</span>}
          </p>
          <div className="flex items-center gap-1.5">
            <AudioButton ayah={ayah} />
            <a
              href={quranComUrl(ayah)}
              target="_blank"
              rel="noreferrer"
              title="افتح الآية في سياقها"
              className="inline-flex size-10 items-center justify-center rounded-full text-ink-600 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-50"
            >
              <ExternalLink size={16} aria-hidden="true" />
              <span className="sr-only">
                افتح الآية في سياقها على <span lang="en">quran.com</span>
              </span>
            </a>
          </div>
        </div>
      </div>

      <p className="quran px-5 py-6 text-center">
        {isPartial && (
          <span className="text-ink-400" aria-hidden="true">
            …{' '}
          </span>
        )}
        {/*
          The <mark> carries no font weight: Amiri Quran ships one 400 face, so
          asking for 500 would render the highlighted stretch in the Cairo
          fallback during the font swap — a visible weight seam inside a verse.
          The colour and the rule's name already carry the emphasis.
        */}
        {segments.map((segment, index) => {
          const rule = segment.rule ? getRule(segment.rule) : undefined
          return (
            <Fragment key={index}>
              {rule ? (
                <mark className={cn(RULE_TEXT_CLASS[rule.color])}>{segment.text}</mark>
              ) : (
                segment.text
              )}
            </Fragment>
          )
        })}
        {isPartial && (
          <span className="text-ink-400" aria-hidden="true">
            {' '}
            …
          </span>
        )}
      </p>

      {segments.some((segment) => segment.rule) && (
        <p className="sr-only">
          {segments
            .filter((segment) => segment.rule)
            .map((segment) => `${segment.text.trim()}: ${getRule(segment.rule!)?.name ?? ''}`)
            .join('، ')}
        </p>
      )}

      {(usedRules.length > 0 || spec.note) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-ink-200 px-4 py-3 dark:border-ink-800">
          {usedRules.map((id) => (
            <RuleBadge key={id} id={id} />
          ))}
          {spec.note && (
            <p className="text-sm text-ink-600 dark:text-ink-400">{spec.note}</p>
          )}
        </div>
      )}
    </figure>
  )
}
