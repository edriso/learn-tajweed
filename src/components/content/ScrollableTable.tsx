import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A lesson table that scrolls sideways when it does not fit.
 *
 * Two things have to be true for that to be usable:
 *
 * - **It must be reachable by keyboard.** A region that scrolls but cannot be
 *   focused is unreachable for anyone not using a pointer, which fails WCAG
 *   2.1.1. So when the table overflows, the wrapper becomes a focusable
 *   `region` with a name; when it fits, it stays out of the tab order rather
 *   than adding a stop that does nothing.
 * - **It must look scrollable.** The shadow at each edge is painted by CSS
 *   gradients that are anchored to the content rather than the box, so an edge
 *   shadow appears only while there is more table in that direction.
 */
export function ScrollableTable({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setOverflows(el.scrollWidth > el.clientWidth + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    // The table itself can change width without the wrapper doing so.
    const table = el.querySelector('table')
    if (table) observer.observe(table)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="table-scroll"
      {...(overflows
        ? { tabIndex: 0, role: 'region', 'aria-label': 'جدول قابل للتمرير أفقيًّا' }
        : {})}
    >
      {children}
    </div>
  )
}
