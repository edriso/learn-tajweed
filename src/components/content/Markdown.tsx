import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parse } from 'yaml'
import { AyahCard, type AyahSpec } from './AyahCard'
import { Callout, type CalloutKind } from './Callout'
import { Compare, type CompareSpec } from './Compare'
import { ExampleGrid, type ExampleGridSpec } from './ExampleGrid'
import { LetterSet, type LetterSetSpec } from './LetterSet'
import { MistakeCard, type MistakeSpec } from './MistakeCard'
import { Quiz } from './Quiz'
import { ScrollableTable } from './ScrollableTable'
import { parseQuiz } from '@/lib/quiz'

/**
 * Renders a lesson.
 *
 * Lessons are plain Markdown, plus a few fenced blocks that turn into real
 * components. Writing `​```ayah` with a `ref:` inside is how a lesson shows a
 * verse; the verse text itself is never typed into the file. Every block type
 * is documented in docs/writing-lessons.md.
 */

const CALLOUTS: Record<string, CalloutKind> = {
  rule: 'rule',
  tip: 'tip',
  note: 'note',
  warning: 'warning',
}

/** Pull the language and the raw text out of react-markdown's <code> child. */
function readCodeBlock(children: ReactNode): { lang?: string; source: string } | null {
  const only = Children.toArray(children)[0]
  if (!isValidElement(only)) return null
  const props = (only as ReactElement<{ className?: string; children?: ReactNode }>).props
  const lang = /language-([\w-]+)/.exec(props.className ?? '')?.[1]
  return { lang, source: String(props.children ?? '') }
}

export function Markdown({ children, slug }: { children: string; slug: string }) {
  // Quiz blocks need a stable index so their question ids stay unique.
  let quizBlock = 0

  return (
    <article className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ node: _node, href, children, ...props }) {
            const external = href?.startsWith('http')
            // A link whose text is all ASCII is a domain or a product name.
            // Marking it lang="en" stops an Arabic voice reading it phonetically.
            const latin = typeof children === 'string' && /^[\x20-\x7E]+$/.test(children)
            return (
              <a
                href={href}
                {...(latin ? { lang: 'en' } : {})}
                {...props}
                {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                {children}
                {external && <span className="sr-only"> (يفتح في صفحةٍ جديدة)</span>}
              </a>
            )
          },

          // Wide comparison tables scroll inside their own box instead of
          // pushing the whole page sideways on a phone.
          table({ node: _node, children, ...props }) {
            return (
              <ScrollableTable>
                <table {...props}>{children}</table>
              </ScrollableTable>
            )
          },

          // Custom blocks replace the whole <pre>, so no invalid markup is
          // produced by putting a <div> inside it.
          pre({ children, ...props }) {
            const block = readCodeBlock(children)
            if (!block?.lang) return <pre {...props}>{children}</pre>

            const { lang, source } = block

            if (lang in CALLOUTS) {
              // Callout bodies are Markdown, so they can hold lists and links.
              return (
                <Callout kind={CALLOUTS[lang]}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{source.trim()}</ReactMarkdown>
                </Callout>
              )
            }

            switch (lang) {
              case 'ayah':
                return <AyahCard spec={parse(source) as AyahSpec} />
              case 'examples':
                return <ExampleGrid spec={parse(source) as ExampleGridSpec} />
              case 'letters':
                return <LetterSet spec={parse(source) as LetterSetSpec} />
              case 'mistake':
                return <MistakeCard spec={parse(source) as MistakeSpec} />
              case 'compare':
                return <Compare spec={parse(source) as CompareSpec} />
              case 'quiz': {
                const { title, questions } = parseQuiz(source, slug, quizBlock++)
                return <Quiz questions={questions} title={title} />
              }
              default:
                return <pre {...props}>{children}</pre>
            }
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </article>
  )
}
