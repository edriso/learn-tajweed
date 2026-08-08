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
   */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.focus()
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:start-3 focus:z-50 focus:rounded-full focus:bg-green-600 focus:px-4 focus:py-2 focus:text-white"
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
      <ScrollRestoration />
    </div>
  )
}
