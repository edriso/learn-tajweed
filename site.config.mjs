/**
 * Where the site lives. The one place that knows it.
 *
 * Five things need this and used to hardcode it separately: `base` in
 * vite.config.ts, the icon and manifest links in index.html, the canonical /
 * Open Graph / JSON-LD / sitemap / robots URLs in scripts/prerender-routes.mjs,
 * the URL printed on the share card in scripts/build-og-image.mjs, and
 * public/manifest.webmanifest. Getting one of them wrong does not fail the
 * build — it ships a site whose canonical points somewhere the reader is not.
 *
 * `base` is a path, always with both slashes ('/' or '/repo/'), because Vite
 * requires that and everything downstream concatenates rather than joins.
 *
 * The GitHub Pages entry is not dead code. It is the way back if the domain
 * ever lapses, and it is exercisable today:
 *
 *   SITE_TARGET=pages npm run build
 *
 * Build that occasionally and the escape hatch is known to work before it is
 * needed, rather than discovered to be broken during an outage. To actually
 * fall back: remove the custom domain in Settings → Pages, then set
 * SITE_TARGET=pages on the build step in .github/workflows/deploy.yml.
 */
const TARGETS = {
  domain: { origin: 'https://dartajweed.com', base: '/' },
  pages: { origin: 'https://edriso.github.io', base: '/learn-tajweed/' },
}

const name = process.env.SITE_TARGET ?? 'domain'
const target = TARGETS[name]

if (!target) {
  throw new Error(
    `site.config: SITE_TARGET=«${name}» غير معروف. ` +
      `المتاح: ${Object.keys(TARGETS).join('، ')}.`,
  )
}

/** Scheme and host, no trailing slash. `https://dartajweed.com` */
export const ORIGIN = target.origin

/** Path the site is served under, leading and trailing slash. `/` */
export const BASE = target.base

/** Absolute home page URL, with its trailing slash. `https://dartajweed.com/` */
export const SITE_URL = `${ORIGIN}${BASE}`

/**
 * The same thing for a human to read: no scheme, no trailing slash. This is
 * what goes on the share card, where `https://` is noise.
 */
export const SITE_LABEL = SITE_URL.replace(/^https:\/\//, '').replace(/\/$/, '')
