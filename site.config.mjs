/**
 * Where this build is served, and which address it claims to be.
 *
 * Nothing here is hardcoded to one person's site. Fork this repository, enable
 * GitHub Pages, push — and it builds correctly for *your* address with no
 * configuration at all, because the default is worked out from the repository
 * name at build time.
 *
 * Two optional environment variables, both full URLs ending in a slash:
 *
 *   SITE_URL        Where this build is actually served from. Assets, the
 *                   router and the fonts all resolve against it, so if it is
 *                   wrong the page loads and then nothing else does.
 *                   Default: https://<owner>.github.io/<repo>/
 *
 *   SITE_CANONICAL  The address this build claims in its canonical tags,
 *                   sitemap and JSON-LD. Only differs from SITE_URL when the
 *                   same site is published at two addresses and one of them is
 *                   the address people should be given.
 *                   Default: the same as SITE_URL.
 *
 * This repository publishes twice, which is why the second one exists at all.
 * GitHub Pages sends a 301 from a repository's own Pages URL to its custom
 * domain and gives you no way to switch that off — so once dartajweed.com was
 * attached, edriso.github.io/learn-tajweed/ stopped being a fallback and became
 * a sign pointing at the domain. If the domain ever expired, both addresses
 * would break at once. A second repository serving the same files is the only
 * way to keep an address that does not depend on the domain being paid for.
 *
 * Both builds therefore claim dartajweed.com, so two copies of identical text
 * never compete with each other in Google. See the `mirror` job in
 * .github/workflows/deploy.yml, and the deployment section of README.md.
 */

/** Split a full URL into the origin and the path Vite needs as `base`. */
function split(url, label) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(
      `site.config: ${label}=«${url}» ليس رابطًا صالحًا. ` +
        `المتوقَّع رابطٌ كاملٌ ينتهي بشرطةٍ مائلة، مثل https://example.com/`,
    )
  }
  // Vite requires both slashes on `base`, and everything downstream joins by
  // concatenating rather than by resolving, so the trailing one is not optional.
  const base = parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`
  return { origin: parsed.origin, base, href: `${parsed.origin}${base}` }
}

/**
 * This repository's own GitHub Pages address, worked out from the repository
 * itself. GITHUB_REPOSITORY is `owner/repo` and is set for every workflow run,
 * so a fork gets its own correct address without editing anything.
 *
 * Outside CI there is no published address to know, so it falls back to
 * localhost. That gives `base: '/'`, which is what the dev server needs, and it
 * makes a local build obviously local rather than quietly claiming to be
 * somebody's live site.
 */
function ownPagesUrl() {
  const slug = process.env.GITHUB_REPOSITORY
  if (!slug) return 'http://localhost:4173/'

  const [owner, repo] = slug.split('/')
  const host = `${owner.toLowerCase()}.github.io`
  // A repository named <owner>.github.io is served at the host root, not under
  // a path — the one case where the repository name is not part of the URL.
  return repo.toLowerCase() === host ? `https://${host}/` : `https://${host}/${repo}/`
}

const served = split(process.env.SITE_URL || ownPagesUrl(), 'SITE_URL')
const claimed = split(process.env.SITE_CANONICAL || served.href, 'SITE_CANONICAL')

/** Path this build is served under, leading and trailing slash. `/` */
export const BASE = served.base

/** Full address this build is served at. Assets and og:image use this. */
export const SITE_URL = served.href

/** Full address this build claims. Canonicals, sitemap and JSON-LD use this. */
export const CANONICAL_URL = claimed.href

/**
 * True when this build is the one the canonicals point at. A second copy uses
 * it to hold back what only the real address should advertise — a sitemap
 * naming URLs that live on another host is asking to be misread.
 */
export const IS_CANONICAL = SITE_URL === CANONICAL_URL

/** True when this is a local build, so nothing publishable is made from it. */
export const IS_LOCAL = new URL(CANONICAL_URL).hostname === 'localhost'

/**
 * The claimed address written for a person to read: no scheme, no trailing
 * slash. This goes on the share card, where `https://` is noise.
 */
export const SITE_LABEL = CANONICAL_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')
