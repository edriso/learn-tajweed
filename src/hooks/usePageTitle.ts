import { useEffect } from 'react'
import { SITE_NAME } from '@/lib/site'

/**
 * Sets the tab title for a route.
 *
 * The site is a single page app, so nothing changes `document.title` on its own.
 * Without this, `/practice` and `/glossary` announce and bookmark under the same
 * name as the home page, which fails WCAG 2.4.2 and makes the browser history
 * useless.
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title
      ? `${title} · ${SITE_NAME}`
      : `${SITE_NAME} · دليلٌ عمليٌّ لأحكام تلاوة القرآن`
  }, [title])
}
