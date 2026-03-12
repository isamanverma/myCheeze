"use client";

/**
 * Minimal SVG illustrations for empty states and decorative elements.
 * All illustrations use currentColor so they adapt to light/dark theme.
 */

export function StampIllustration({
  className = "",
  size = 120,
}: {
  className?: string;
  size?: number;
}) {
  const w = size;
  const h = Math.round(size * (37 / 26));

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 104 148"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Stamp body with perforated edges */}
      <path
        d="M8 4 a4 4 0 0 0 8 0 a4 4 0 0 0 8 0 a4 4 0 0 0 8 0 a4 4 0 0 0 8 0 a4 4 0 0 0 8 0 a4 4 0 0 0 8 0 a4 4 0 0 0 8 0 a4 4 0 0 0 8 0 a4 4 0 0 8 0 a4 4 0 0 0 8 0 a4 4 0 0 0 8 0 a4 4 0 0 0 8 0 a4 4 0 0 0 8 0
        L100 4
        a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8 a4 4 0 0 0 0 8
        L100 144
        a4 4 0 0 0 -8 0 a4 4 0 0 0 -8 0 a4 4 0 0 0 -8 0 a4 4 0 0 0 -8 0 a4 4 0 0 0 -8 0 a4 4 0 0 0 -8 0 a4 4 0 0 0 -8 0 a4 4 0 0 0 -8 0 a4 4 0 0 0 -8 0 a4 4 0 0 0 -8 0 a4 4 0 0 0 -8 0 a4 4 0 0 0 -8 0
        L4 144
        a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8 a4 4 0 0 0 0 -8
        Z"
        fill="currentColor"
        opacity="0.04"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.1"
      />
      {/* Mountain scene */}
      <path
        d="M20 108 L40 68 L52 88 L64 58 L84 108 Z"
        fill="currentColor"
        opacity="0.06"
      />
      {/* Sun */}
      <circle cx="74" cy="44" r="10" fill="currentColor" opacity="0.06" />
      {/* Small cloud */}
      <ellipse
        cx="36"
        cy="40"
        rx="12"
        ry="5"
        fill="currentColor"
        opacity="0.04"
      />
      {/* "STAMP" text placeholder */}
      <rect
        x="28"
        y="118"
        width="48"
        height="4"
        rx="2"
        fill="currentColor"
        opacity="0.06"
      />
      <rect
        x="36"
        y="126"
        width="32"
        height="3"
        rx="1.5"
        fill="currentColor"
        opacity="0.04"
      />
    </svg>
  );
}

export function EmptyCalendarIllustration({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      width="200"
      height="140"
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Calendar outline */}
      <rect
        x="30"
        y="20"
        width="140"
        height="100"
        rx="8"
        fill="currentColor"
        opacity="0.03"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.08"
      />
      {/* Header bar */}
      <rect
        x="30"
        y="20"
        width="140"
        height="20"
        rx="8"
        fill="currentColor"
        opacity="0.04"
      />
      <rect
        x="30"
        y="32"
        width="140"
        height="8"
        fill="currentColor"
        opacity="0.04"
      />
      {/* Calendar dots — 7x4 grid */}
      {Array.from({ length: 28 }, (_, i) => {
        const col = i % 7;
        const row = Math.floor(i / 7);
        const cx = 50 + col * 20;
        const cy = 54 + row * 18;
        return (
          <circle
            key={`dot-${col}-${row}`}
            cx={cx}
            cy={cy}
            r="2.5"
            fill="currentColor"
            opacity={0.05 + (i % 5) * 0.015}
          />
        );
      })}
      {/* Decorative tilted stamp — top right */}
      <g transform="translate(148, 10) rotate(8)">
        <rect
          width="28"
          height="40"
          rx="2"
          fill="currentColor"
          opacity="0.05"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeOpacity="0.08"
          strokeDasharray="2 2"
        />
      </g>
      {/* Decorative tilted stamp — bottom left */}
      <g transform="translate(14, 88) rotate(-6)">
        <rect
          width="24"
          height="34"
          rx="2"
          fill="currentColor"
          opacity="0.04"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeOpacity="0.06"
          strokeDasharray="2 2"
        />
      </g>
    </svg>
  );
}

export function FolderIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Folder back */}
      <path
        d="M6 14 L6 38 Q6 40 8 40 L40 40 Q42 40 42 38 L42 18 Q42 16 40 16 L22 16 L18 12 Q17 11 16 11 L8 11 Q6 11 6 14 Z"
        fill="currentColor"
        opacity="0.06"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.1"
      />
      {/* Folder front flap */}
      <path
        d="M4 20 Q4 18 6 18 L42 18 Q44 18 44 20 L44 38 Q44 40 42 40 L6 40 Q4 40 4 38 Z"
        fill="currentColor"
        opacity="0.04"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.08"
      />
      {/* Plus icon in center */}
      <line
        x1="24"
        y1="25"
        x2="24"
        y2="35"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.15"
      />
      <line
        x1="19"
        y1="30"
        x2="29"
        y2="30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.15"
      />
    </svg>
  );
}

export function KeyHint({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded border border-current/10 bg-current/[0.04] px-1 font-mono text-[10px] font-medium leading-none opacity-40 ${className}`}
    >
      {children}
    </kbd>
  );
}

export function WaveDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      width="120"
      height="8"
      viewBox="0 0 120 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M0 4 Q10 0, 20 4 T40 4 T60 4 T80 4 T100 4 T120 4"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.08"
        fill="none"
      />
    </svg>
  );
}
