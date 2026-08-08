import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

/**
 * Appears once the reader is about two screens down, pinned to the inline end
 * so it never sits over the start of a line of Arabic. A real button with a
 * label, not an icon-only mystery.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let ticking = false
    function onScroll() {
      // requestAnimationFrame keeps this to one measurement per frame.
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setVisible(window.scrollY > window.innerHeight * 2)
        ticking = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function scrollToTop() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
    // This button hides itself once the page is back at the top, so hand focus
    // to the content first. Otherwise focus is stranded inside an aria-hidden
    // element and the next Tab restarts from the beginning of the document.
    document.getElementById('main')?.focus()
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`fixed bottom-5 end-5 z-20 inline-flex items-center gap-1.5 rounded-full border border-ink-500 bg-ink-50/90 px-4 py-2.5 text-sm font-semibold text-ink-700 shadow-soft backdrop-blur transition hover:border-green-400 hover:text-green-700 dark:border-ink-500 dark:bg-ink-900/90 dark:text-ink-300 dark:hover:text-green-300 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      <ArrowUp size={16} />
      لأعلى
    </button>
  )
}
