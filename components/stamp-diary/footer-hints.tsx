"use client";

import { KeyHint, WaveDivider } from "@/components/illustrations";

interface FooterHintsProps {
  dailyLimitBytes: number;
  className?: string;
}

export function FooterHints({ dailyLimitBytes, className }: FooterHintsProps) {
  const kbPerDay = Math.round(dailyLimitBytes / 1024);

  return (
    <div
      className={`mt-1.5 hidden flex-col items-center gap-1 sm:mt-2 sm:flex ${
        className ?? ""
      }`}
    >
      <WaveDivider className="text-foreground" />
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/50">
          <KeyHint>←</KeyHint>
          <KeyHint>→</KeyHint>
          navigate
        </span>
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/50">
          <KeyHint>T</KeyHint>
          today
        </span>
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/50">
          <KeyHint>D</KeyHint>
          theme
        </span>
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/50">
          <KeyHint>W</KeyHint>/<KeyHint>M</KeyHint>
          week/month
        </span>
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/50">
          <KeyHint>?</KeyHint>
          shortcuts
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">
          · click a date to add · {kbPerDay}
          KB/day/stamp
        </span>
      </div>
    </div>
  );
}
