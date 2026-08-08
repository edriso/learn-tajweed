import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

export function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl" aria-hidden="true">
        🧭
      </p>
      <h1 className="mt-6 text-3xl font-extrabold text-ink-900 dark:text-ink-50">
        هذه الصفحة غير موجودة
      </h1>
      <p className="mt-3 text-ink-600 dark:text-ink-400">
        ربّما تغيَّر الرابط، أو حُذفت الصفحة. عُد إلى قائمة الدروس وابدأ من هناك.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-green-700 px-6 py-3 font-bold text-white transition hover:bg-green-800 dark:bg-green-600 dark:hover:bg-green-500"
      >
        <ArrowRight size={18} aria-hidden="true" />
        كلّ الدروس
      </Link>
    </div>
  )
}
