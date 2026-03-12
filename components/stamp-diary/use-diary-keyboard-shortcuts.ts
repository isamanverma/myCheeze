"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { ViewMode } from "@/hooks/use-stamps";

interface UseDiaryKeyboardShortcutsParams {
  dialogOpen: boolean;
  exportOpen: boolean;
  peelOpen: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onToggleTheme: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenShortcuts: () => void;
  onCloseShortcuts: () => void;
}

function fmtDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getDate()} ${d.toLocaleString("en-US", { month: "long" })}, ${d.getFullYear()}`;
}

export function useDiaryKeyboardShortcuts({
  dialogOpen,
  exportOpen,
  peelOpen,
  onPrevMonth,
  onNextMonth,
  onToday,
  onToggleTheme,
  onViewModeChange,
  onOpenShortcuts,
  onCloseShortcuts,
}: UseDiaryKeyboardShortcutsParams) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") {
        onCloseShortcuts();
        return;
      }

      const modalOpen = dialogOpen || exportOpen || peelOpen;

      // While any modal is open, allow only opening shortcuts help.
      if (modalOpen) {
        if (e.key === "?") {
          e.preventDefault();
          onOpenShortcuts();
        }
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          onPrevMonth();
          break;
        case "ArrowRight":
          e.preventDefault();
          onNextMonth();
          break;
        case "t":
        case "T":
          e.preventDefault();
          onToday();
          toast("Jumped to today", {
            description: fmtDate(new Date().toISOString().slice(0, 10)),
          });
          break;
        case "d":
        case "D":
          e.preventDefault();
          onToggleTheme();
          break;
        case "w":
        case "W":
          e.preventDefault();
          onViewModeChange("week");
          break;
        case "m":
        case "M":
          e.preventDefault();
          onViewModeChange("month");
          break;
        case "?":
          e.preventDefault();
          onOpenShortcuts();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    dialogOpen,
    exportOpen,
    peelOpen,
    onPrevMonth,
    onNextMonth,
    onToday,
    onToggleTheme,
    onViewModeChange,
    onOpenShortcuts,
    onCloseShortcuts,
  ]);
}
