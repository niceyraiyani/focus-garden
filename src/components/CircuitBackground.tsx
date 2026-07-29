/**
 * A subtle techy line-art motif for the "robot" vibe — circuit traces, nodes,
 * a tiny friendly bot and chips along the bottom. Decorative only (aria-hidden),
 * kept minimal like the flower meadow. Uses the accent color via currentColor.
 */
export function CircuitBackground() {
  return (
    <div className="meadow" aria-hidden="true">
      <svg
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* horizontal base traces */}
        <path d="M0 210 H1200" opacity="0.5" />
        <path d="M0 224 H1200" opacity="0.3" />

        {/* rising traces with right-angle bends + nodes */}
        <g>
          <path d="M120 210 V150 H180" />
          <circle cx="120" cy="210" r="3" fill="currentColor" stroke="none" />
          <circle cx="180" cy="150" r="3.4" />
        </g>
        <g>
          <path d="M300 210 V120 H260 V96" />
          <circle cx="260" cy="90" r="4" />
          <circle cx="300" cy="210" r="3" fill="currentColor" stroke="none" />
        </g>
        <g>
          <path d="M470 210 V168 H520 V132" />
          <circle cx="520" cy="126" r="3.4" />
        </g>
        <g>
          <path d="M690 210 V110 H650" />
          <circle cx="644" cy="110" r="3.4" />
          <circle cx="690" cy="210" r="3" fill="currentColor" stroke="none" />
        </g>
        <g>
          <path d="M980 210 V150 H1030 V118" />
          <circle cx="1030" cy="112" r="3.4" />
          <circle cx="980" cy="210" r="3" fill="currentColor" stroke="none" />
        </g>
        <g>
          <path d="M1130 210 V160" />
          <circle cx="1130" cy="154" r="3" />
        </g>

        {/* a chip */}
        <g transform="translate(360 150)">
          <rect x="0" y="0" width="52" height="42" rx="6" />
          <path d="M12 0 V-8 M26 0 V-8 M40 0 V-8 M12 42 V50 M26 42 V50 M40 42 V50 M0 12 H-8 M0 26 H-8 M52 12 H60 M52 26 H60" />
          <circle cx="26" cy="21" r="6" />
        </g>

        {/* a tiny friendly bot */}
        <g transform="translate(770 128)">
          <path d="M26 6 V-4" />
          <circle cx="26" cy="-8" r="3" fill="currentColor" stroke="none" />
          <rect x="4" y="6" width="44" height="34" rx="10" />
          <circle cx="18" cy="22" r="3.2" fill="currentColor" stroke="none" />
          <circle cx="34" cy="22" r="3.2" fill="currentColor" stroke="none" />
          <path d="M18 31 q8 5 16 0" />
          <path d="M14 40 V48 M38 40 V48" />
        </g>

        {/* blinking status dots (very slow via CSS .float, subtle) */}
        <circle className="float" cx="880" cy="188" r="2.6" fill="currentColor" stroke="none" opacity="0.7" />
        <circle cx="560" cy="196" r="2.2" fill="currentColor" stroke="none" opacity="0.5" />
        <circle cx="1080" cy="190" r="2.2" fill="currentColor" stroke="none" opacity="0.5" />
      </svg>
    </div>
  )
}
