/**
 * The site mark: an open mushaf with a bookmark ribbon.
 * Pure geometry, no text, so it stays sharp at any size and needs no font.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* the two open pages */}
      <path
        d="M16 8.6C13.6 6.9 10.7 6 7.6 6H4.8C4.36 6 4 6.36 4 6.8v17.1c0 .44.36.8.8.8h2.8c3.1 0 6 .9 8.4 2.6 2.4-1.7 5.3-2.6 8.4-2.6h2.8c.44 0 .8-.36.8-.8V6.8c0-.44-.36-.8-.8-.8h-2.8c-3.1 0-6 .9-8.4 2.6Z"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path
        d="M16 8.6C13.6 6.9 10.7 6 7.6 6H4.8C4.36 6 4 6.36 4 6.8v17.1c0 .44.36.8.8.8h2.8c3.1 0 6 .9 8.4 2.6m0-18.7c2.4-1.7 5.3-2.6 8.4-2.6h2.8c.44 0 .8.36.8.8v17.1c0 .44-.36.8-.8.8h-2.8c-3.1 0-6 .9-8.4 2.6m0-18.7v18.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* the bookmark ribbon, in the gold accent */}
      <path
        d="M19.6 2.5h4.2v6.4l-2.1-1.6-2.1 1.6V2.5Z"
        className="fill-gold-500"
      />
    </svg>
  )
}
