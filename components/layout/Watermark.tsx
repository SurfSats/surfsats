export function Watermark() {
  return (
    <div className="site-watermark" aria-hidden="true">
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="site-watermark-mark"
      >
        {/* Imperfect hand-cut circle — not a true ellipse */}
        <path
          d="M198 36
             C 248 32 304 52 338 96
             C 368 136 372 188 362 236
             C 350 292 310 338 254 356
             C 210 370 164 368 122 350
             C 74 328 44 286 38 232
             C 32 176 48 122 88 80
             C 120 48 158 38 198 36 Z"
          stroke="currentColor"
          strokeWidth="7.5"
          strokeLinejoin="round"
        />

        {/* Bitcoin B eyes — vertical bar through the B */}
        <g
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g transform="translate(112 132)">
            <path d="M18 -6 V62 M30 -6 V62" />
            <path d="M10 6 H42 C56 6 58 24 44 28 H10" />
            <path d="M10 28 H46 C62 28 62 54 44 54 H10" />
          </g>
          <g transform="translate(228 126) rotate(4)">
            <path d="M18 -6 V62 M30 -6 V62" />
            <path d="M10 6 H42 C56 6 58 24 44 28 H10" />
            <path d="M10 28 H46 C62 28 62 54 44 54 H10" />
          </g>
        </g>

        {/* Crooked smile + right-side tongue/lip flick */}
        <path
          d="M118 248
             C 148 278 186 294 228 286
             C 252 280 268 268 286 252
             C 292 262 298 276 292 292"
          stroke="currentColor"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
