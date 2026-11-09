/**
 * Catch-all for URLs that match no route.
 * Wire it up last in App.tsx:  <Route path="*" element={<NotFound />} />
 */
export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-5xl rounded-2xl border border-dashed border-line px-6 py-14 text-center sm:px-12">
      <style>{`
        @keyframes nf-wander {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-14px) rotate(-6deg); }
          75% { transform: translateX(14px) rotate(6deg); }
        }
        .nf-pin { transform-origin: 50% 100%; animation: nf-wander 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .nf-pin { animation: none; } }
      `}</style>

      <svg
        viewBox="0 0 200 110"
        className="mx-auto mb-8 w-full max-w-[14rem] text-muted"
        role="img"
        aria-label="A map pin hovering over a dashed path that leads nowhere"
      >
        <path
          d="M10 96c30-20 50 8 80-6s40-30 70-24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="5 6"
          strokeLinecap="round"
        />
        <g className="nf-pin">
          <path
            d="M100 74c-14-14-20-24-20-33a20 20 0 0 1 40 0c0 9-6 19-20 33z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="100" cy="41" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </g>
      </svg>

      <h2 className="text-lg font-semibold text-content">{title} page not found</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">
        This address doesn't match any page. It may have moved, or the link may have a typo.
      </p>
      <a
        href="/"
        className="mt-6 inline-block rounded-lg border border-line px-4 py-2 text-sm font-medium text-content hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Back to home
      </a>
    </div>
  );
}