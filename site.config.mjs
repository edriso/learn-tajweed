/**
 * Where the site lives. The one place that knows it.
 *
 * The guide is published twice, from this one repository:
 *
 *   dartajweed.com                    the address to give people
 *   edriso.github.io/learn-tajweed/   the same build, always reachable
 *
 * The second exists because GitHub Pages 301s a repository's own Pages URL to
 * its custom domain and offers no way to turn that off — so once the domain was
 * attached, the github.io address stopped being a fallback and became a
 * signpost to the domain. If the domain ever lapses, both would go dark
 * together. A second repository serving the same output is the only way to have
 * an address that does not depend on the domain being paid for.
 *
 * `deploy.yml` therefore builds twice: once for each. The mirror repository
 * (edriso/dartajweed) holds no source, only the built site, force-pushed on
 * every deploy — see the `mirror` job there.
 *
 * Two different things are needed and they are not the same thing:
 *
 * - `base` and `SITE_URL` are where a build is *served* from. Assets, the
 *   router's basename and the fonts all resolve against these, so they must
 *   describe the actual address or nothing loads.
 * - `CANONICAL_URL` is the address the guide *claims*, and it is dartajweed.com
 *   for both builds. Two sites serving identical text would otherwise compete
 *   in search, and Google would pick one — possibly the ugly one. Pointing the
 *   mirror's canonicals at the domain makes it a working fallback that does not
 *   split the ranking of the address people are actually given.
 *
 * `base` is a path, always with both slashes ('/' or '/repo/'), because Vite
 * requires that and everything downstream concatenates rather than joins.
 */

/** The published address of the guide. Every canonical claims this one. */
const CANONICAL = 'https://dartajweed.com/'

const TARGETS = {
  /** The custom domain, served from the edriso/dartajweed mirror. */
  domain: { origin: 'https://dartajweed.com', base: '/' },
  /** This repository's own Pages site, which the domain cannot take down. */
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

/** Path this build is served under, leading and trailing slash. `/` */
export const BASE = target.base

/** Absolute address this build is served at, with its slash. Assets use this. */
export const SITE_URL = `${target.origin}${target.base}`

/** Absolute address the guide claims, with its slash. Canonicals use this. */
export const CANONICAL_URL = CANONICAL

/**
 * True when this build is the one the canonicals point at. The mirror uses it
 * to hold back things only the primary address should advertise — a sitemap
 * naming URLs that live somewhere else would be asking to be misread.
 */
export const IS_CANONICAL = SITE_URL === CANONICAL_URL

/**
 * The published address for a human to read: no scheme, no trailing slash.
 * This is what goes on the share card, where `https://` is noise. It is the
 * canonical address in both builds, because it is the one worth memorising.
 */
export const SITE_LABEL = CANONICAL_URL.replace(/^https:\/\//, '').replace(/\/$/, '')
