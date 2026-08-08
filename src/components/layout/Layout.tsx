import { Outlet, ScrollRestoration } from 'react-router'
import { BackToTop } from './BackToTop'
import { Footer } from './Footer'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:right-3 focus:z-50 focus:rounded-full focus:bg-green-600 focus:px-4 focus:py-2 focus:text-white"
      >
        تخطَّ إلى المحتوى
      </a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-12">
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
      <ScrollRestoration />
    </div>
  )
}
