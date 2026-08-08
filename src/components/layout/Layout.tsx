import { useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { BackToTop } from './BackToTop'
import { Footer } from './Footer'
import { Header } from './Header'

export function Layout() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

  /*
   * Move focus into the main region after a client-side navigation.
   *
   * A single page app swaps the content without the browser doing anything to
   * focus, so a keyboard or screen-reader user who follows a link stays parked
   * on the old, now-removed element and the next Tab restarts from the top of
   * the page. Focusing `<main>` puts them at the start of the new content, the
   * way a full page load would. Skipped on first render so the entry point is
   * not stolen from the browser.
   *
   * `preventScroll` because this moves focus and nothing else — the viewport
   * belongs to <ScrollRestoration> below. Without it, focus() also scrolls the
   * element into view, and <main> is nearly as tall as the document, so from
   * the footer that scroll lands most of the way up the page: 352px on the
   * curriculum, and 3498px if the footer ever grows past one screen. Today
   * that is invisible only because restoration runs after this effect and
   * overwrites it, which is react-router's effect ordering rather than a
   * promise to us. The back-to-top button had the same line without the guard
   * and it was a real bug: one click moved the reader partway and stopped.
   */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        /* `fixed`, not `absolute`: absolute pins it to the top of the document,
           so Tabbing into the page after scrolling drags the viewport back up
           to reveal it. Fixed keeps it where the reader already is. */
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:rounded-full focus:bg-green-600 focus:px-4 focus:py-2 focus:text-white"
      >
        تخطَّ إلى المحتوى
      </a>
      <Header />
      {/* tabIndex -1 makes the skip link actually move focus, not just set the
          sequential navigation point. It never shows a ring: programmatic focus
          on a tabindex="-1" element does not match :focus-visible. */}
      <main
        ref={mainRef}
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 focus:outline-none sm:py-12"
      >
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
      {/*
       * The key has to carry the path, not just the history key.
       *
       * Saved positions live in sessionStorage, so they outlive the document,
       * and the first history entry of *every* document is keyed "default". A
       * reader who scrolled the curriculum and opened a lesson left 2600px
       * saved under "default"; the next full page load — a shared deep link, a
       * refresh, or the reload our stale-build boundary performs — read the
       * same key and dropped them into the middle of a page they had never
       * scrolled. Every cold load did it, on every route.
       *
       * Adding the path keeps the collision to one honest case: loading the
       * same page again, which is what a refresh is, and where keeping the
       * reader's place is the point. Keys are alphanumeric, so the colon can
       * only ever be the one we put there.
       */}
      <ScrollRestoration getKey={(location) => `${location.key}:${location.pathname}`} />
    </div>
  )
}
