/** One place for the values that appear in more than one component. */

export const SITE_NAME = 'تعلَّم التجويد'

/**
 * Where this copy's source lives. Worked out at build time from the repository
 * itself — never written down — so a fork's footer sends its readers to the
 * fork. Empty when it cannot be determined, and the footer then shows no link.
 * See `repoUrl()` in site.config.mjs and `define` in vite.config.ts.
 */
declare const __REPO_URL__: string
export const REPO_URL = __REPO_URL__

/**
 * The recitation this guide teaches.
 * Every rule, count and exception on this site is for this riwayah. Rules do
 * differ between riwayat, so the site says this on the home page and in «عن
 * الدليل» rather than leaving the reader to assume.
 */
export const RIWAYAH = 'رواية حفص عن عاصم من طريق الشاطبيّة'
