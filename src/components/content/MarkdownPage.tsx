import { useEffect } from 'react'
import { Markdown } from './Markdown'
import { getPage } from '@/lib/pages'
import { SITE_NAME } from '@/lib/site'
import { NotFound } from '@/pages/NotFound'

/** Renders one of the Markdown files in src/content/pages/. */
export function MarkdownPage({ slug }: { slug: string }) {
  const page = getPage(slug)

  useEffect(() => {
    document.title = page ? `${page.title} · ${SITE_NAME}` : SITE_NAME
    return () => {
      document.title = SITE_NAME
    }
  }, [page])

  if (!page) return <NotFound />

  return (
    <div>
      <header className="border-b border-ink-200 pb-8 dark:border-ink-800">
        <h1 className="flex flex-wrap items-center gap-3 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl dark:text-ink-50">
          <span aria-hidden="true">{page.emoji}</span>
          {page.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-600 dark:text-ink-400">
          {page.description}
        </p>
      </header>
      <Markdown slug={page.slug}>{page.content}</Markdown>
    </div>
  )
}
