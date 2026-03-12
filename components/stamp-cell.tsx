"use client";

import Image from "next/image";
import { useMemo } from "react";
import { generateStampSVG } from "@/lib/image-processor";

interface StampCellProps {
  day: number;
  dateStr: string;
  stampUrl: string | undefined;
  isToday: boolean;
  isCurrentMonth: boolean;
  onClick: () => void;
  onStampLoadError?: (dateStr: string) => void;
  exportMode: boolean;
  variant?: "grid" | "strip";
}

// Computed once at module load — all cells use the same 78×111 stamp mask
const STAMP_MASK = generateStampSVG(78, 111);

function seededRotation(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  // Range: -3 to 3 degrees for a natural "pasted" feel
  return (hash % 600) / 100 - 3;
}

export function StampCell({
  day,
  dateStr,
  stampUrl,
  isToday,
  isCurrentMonth,
  onClick,
  onStampLoadError,
  exportMode,
  variant = "grid",
}: StampCellProps) {
  const rotation = useMemo(() => seededRotation(dateStr), [dateStr]);

  const isStrip = variant === "strip";

  return (
    <button
      type="button"
      onClick={isCurrentMonth ? onClick : undefined}
      className={`
        relative flex flex-col items-center justify-center
        rounded-lg border border-border/70 transition-all duration-150
        ${isStrip ? "aspect-square" : "min-h-0"}
        ${!exportMode && isCurrentMonth ? "cursor-pointer hover:bg-muted/50 hover:border-border" : "cursor-default"}
        ${isCurrentMonth ? "" : "opacity-20"}
        ${isToday ? "bg-primary/6 ring-1 ring-primary/25 border-primary/30" : ""}
      `}
      disabled={exportMode || !isCurrentMonth}
    >
      {/* Stamp image — 26:37 portrait, centered in cell */}
      {stampUrl && (
        <div
          className={`absolute flex items-center justify-center ${isStrip ? "inset-1 sm:inset-1.5" : "inset-0.5 sm:inset-1"}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            filter:
              "drop-shadow(1px 2px 5px rgba(0,0,0,0.18)) drop-shadow(0 1px 2px rgba(0,0,0,0.1))",
          }}
        >
          <div className="relative h-full aspect-26/37">
            <Image
              src={stampUrl}
              alt={`Stamp for ${dateStr}`}
              fill
              sizes="(max-width: 640px) 64px, 96px"
              className="h-full w-full object-cover"
              style={{
                maskImage: `url("${STAMP_MASK}")`,
                WebkitMaskImage: `url("${STAMP_MASK}")`,
                maskSize: "100% 100%",
                WebkitMaskSize: "100% 100%",
              }}
              draggable={false}
              unoptimized
              onError={() => onStampLoadError?.(dateStr)}
            />
          </div>
        </div>
      )}

      {/* Day number — top-left */}
      <span
        className={`
          absolute z-10 leading-none select-none
          ${isStrip ? "top-1.5 left-2.5 text-sm" : "top-0.5 left-1 text-[10px] sm:top-1 sm:left-1.5 sm:text-xs"}
          ${isToday ? "font-bold text-primary" : "text-muted-foreground/60"}
          ${!isCurrentMonth ? "text-muted-foreground/25" : ""}
          ${stampUrl ? "mix-blend-multiply dark:mix-blend-screen" : ""}
        `}
      >
        {day}
      </span>

      {/* Today dot indicator — only when no stamp */}
      {isToday && !stampUrl && (
        <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary/50 sm:top-2 sm:right-2 sm:h-2 sm:w-2" />
      )}
    </button>
  );
}
