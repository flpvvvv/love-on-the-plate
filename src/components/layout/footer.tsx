"use client"

const TICKER_ITEMS = ["Love on the Plate", "Happy wife, happy life", "Made with love"]

function TickerSet({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <span className="ticker-set" aria-hidden={ariaHidden || undefined}>
      {TICKER_ITEMS.map((item) => (
        <span key={item}>
          {item} <i>·</i>{" "}
        </span>
      ))}
    </span>
  )
}

export function Footer() {
  return (
    <footer className="mt-auto mb-16 md:mb-0">
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          <TickerSet />
          <TickerSet ariaHidden />
        </div>
      </div>

      <div className="container mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <span className="text-[0.72rem] font-bold uppercase tracking-[0.06em]">
          Love on the Plate
        </span>
        <span className="inline-flex items-center gap-2 mono text-[0.72rem]">
          With love
          <svg
            className="w-[15px] h-[15px] text-tomato-ink"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </span>
        <span className="mono muted text-[0.68rem]">
          &copy; <span suppressHydrationWarning>{new Date().getFullYear()}</span> Love on the Plate
        </span>
      </div>
    </footer>
  )
}
