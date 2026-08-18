export function Watermark() {
  return (
    <div className="site-watermark" aria-hidden="true">
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="site-watermark-mark"
      >
        <circle cx="92" cy="96" r="62" stroke="currentColor" strokeWidth="3.2" />
        <g
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="square"
          transform="translate(64 72)"
        >
          <path d="M7 0 V28 M11 0 V28" />
          <path d="M4 6 H16 C20 6 20 13 16 13 H4 M4 13 H17 C22 13 22 22 16 22 H4" />
        </g>
        <g
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="square"
          transform="translate(100 70)"
        >
          <path d="M7 0 V28 M11 0 V28" />
          <path d="M4 6 H16 C20 6 20 13 16 13 H4 M4 13 H17 C22 13 22 22 16 22 H4" />
        </g>
        <path
          d="M58 118 C72 136 98 142 128 124"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="square"
        />
        <path
          d="M154 38 L138 72 H152 L132 118 L150 78 H134 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
