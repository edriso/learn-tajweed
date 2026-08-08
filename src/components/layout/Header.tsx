import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { GitHubIcon } from './GitHubIcon'
import { Logo } from './Logo'
import { SettingsMenu } from './SettingsMenu'
import { ThemeToggle } from './ThemeToggle'
import { REPO_URL } from '@/lib/site'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'الدروس', end: true },
  { to: '/practice', label: 'التمارين' },
  { to: '/cheatsheet', label: 'الخلاصة' },
  { to: '/glossary', label: 'المعجم' },
  { to: '/about', label: 'عن الدليل' },
]

function navClasses({ isActive }: { isActive: boolean }) {
  return cn(
    'rounded-full px-3 py-2.5 text-sm font-semibold transition',
    isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-50',
  )
}

export function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Close the mobile menu whenever the reader navigates somewhere.
  useEffect(() => setOpen(false), [pathname])

  // Escape closes it, matching the settings panel.
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-ink-50/85 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 font-extrabold text-ink-900 dark:text-ink-50"
        >
          <Logo className="size-8 text-green-600 dark:text-green-400" />
          <span className="text-lg">تعلَّم التجويد</span>
        </Link>

        <nav aria-label="التنقّل الرئيسي" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClasses}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            title="الشيفرة المصدرية"
            className="hidden rounded-full p-2.5 text-ink-600 transition hover:bg-ink-100 hover:text-ink-900 sm:block dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-50"
          >
            <GitHubIcon size={18} />
            <span className="sr-only">
              الشيفرة المصدرية على <span lang="en">GitHub</span>
            </span>
          </a>
          <SettingsMenu />
          <ThemeToggle />
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
            className="rounded-full p-2.5 text-ink-600 transition hover:bg-ink-100 hover:text-ink-900 md:hidden dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-50"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="التنقّل الرئيسي"
          className="border-t border-ink-200 px-4 py-3 md:hidden dark:border-ink-800"
        >
          <ul role="list" className="mx-auto flex max-w-4xl flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(navClasses({ isActive }), 'block')}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
