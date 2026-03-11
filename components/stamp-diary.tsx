"use client";

import { KeyHint, WaveDivider } from "./illustrations";
import { useCallback, useEffect, useState } from "react";

import { CalendarGrid } from "./calendar-grid";
import { ExportOverlay } from "./export-overlay";
import { StampCutterDialog } from "./stamp-cutter-dialog";
import { StickerPeelAnimation } from "./sticker-peel-animation";
import { Toolbar } from "./toolbar";
import type { ViewMode } from "@/hooks/use-stamps";
import { toast } from "sonner";
import { useClerk } from "@clerk/nextjs";
import { useStamps } from "@/hooks/use-stamps";
import { useTheme } from "@/hooks/use-theme";

export interface StampDiaryProps {
  initialYear: number;
  initialMonth: number;
  initialUserId: string | null;
  initialStamps: Array<{ dateStr: string; url: string }>;
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${d.toLocaleString("en-US", { month: "long" })}, ${d.getFullYear()}`;
}

export function StampDiary({
  initialYear,
  initialMonth,
  initialUserId,
  initialStamps,
}: StampDiaryProps) {
  const {
    year,
    month,
    viewMode,
    stamps,
    userId,
    authLoading,
    loading,
    setViewMode,
    addStamp,
    removeStamp,
    evictBrokenStamp,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    dailyLimitBytes,
  } = useStamps({ initialYear, initialMonth, initialUserId, initialStamps });
  const { openSignIn } = useClerk();

  const { isDark, toggleTheme } = useTheme();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [peelOpen, setPeelOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't interfere when a dialog is open or an input is focused
      if (dialogOpen || exportOpen) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goToPrevMonth();
          break;
        case "ArrowRight":
          e.preventDefault();
          goToNextMonth();
          break;
        case "t":
        case "T":
          e.preventDefault();
          goToToday();
          toast("Jumped to today", {
            description: fmtDate(new Date().toISOString().slice(0, 10)),
          });
          break;
        case "d":
        case "D":
          e.preventDefault();
          toggleTheme();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    dialogOpen,
    exportOpen,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    toggleTheme,
  ]);

  // ── Date click ──────────────────────────────────────────────────────
  const handleDateClick = useCallback(
    (dateStr: string) => {
      if (!userId) {
        toast("Sign in required", {
          description: "Sign in to stick stamps to your diary.",
        });
        openSignIn();
        return;
      }

      if (stamps.has(dateStr)) {
        setSelectedDate(dateStr);
        setPeelOpen(true);
        return;
      }

      setSelectedDate(dateStr);
      setDialogOpen(true);
    },
    [stamps, userId],
  );

  const handlePeelConfirm = useCallback(() => {
    if (!selectedDate) return;
    setPeelOpen(false);
    removeStamp(selectedDate)
      .then(() => {
        toast("Stamp removed", { description: fmtDate(selectedDate) });
      })
      .catch((err) => {
        toast.error("Failed to remove stamp", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      });
  }, [selectedDate, removeStamp]);

  // ── Stick handler ───────────────────────────────────────────────────
  const handleStick = useCallback(
    async (dateStr: string, blobUrl: string, blob: Blob) => {
      try {
        await addStamp(dateStr, blobUrl, blob);
        toast("Stamp stuck!", {
          description: `${fmtDate(dateStr)} — ${(blob.size / 1024).toFixed(1)} KB`,
        });
      } catch (err) {
        URL.revokeObjectURL(blobUrl);
        toast.error("Failed to save stamp", {
          description:
            err instanceof Error
              ? err.message
              : "Could not save to Supabase. Please try again.",
        });
      }
    },
    [addStamp],
  );

  // ── Export ──────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    setExportOpen(true);
  }, []);

  // ── View mode ──────────────────────────────────────────────────────
  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
    },
    [setViewMode],
  );

  // ── Loading / hydration state ──────────────────────────────────────
  if (loading || authLoading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  const isWeek = viewMode === "week";

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background font-sans">
      {/* Toolbar — fixed at top */}
      <div className="mx-auto w-full max-w-6xl shrink-0 px-3 sm:px-6">
        <Toolbar
          year={year}
          month={month}
          viewMode={viewMode}
          isDark={isDark}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
          onToday={goToToday}
          onExport={handleExport}
          onViewModeChange={handleViewModeChange}
          onToggleTheme={toggleTheme}
        />
      </div>

      {/* Calendar — fills remaining space in month view, shrinks in week view */}
      <div
        className={`mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-3 pb-2 sm:px-6 sm:pb-4 ${
          isWeek ? "shrink-0" : "flex-1 overflow-hidden"
        }`}
      >
        <div
          className={`relative flex flex-col rounded-xl bg-card ring-1 ring-border ${
            isWeek ? "shrink-0" : "flex-1 overflow-hidden"
          }`}
        >
          <div
            className={`relative z-10 w-full ${
              isWeek
                ? "px-4 py-4 sm:px-8 sm:py-5"
                : "flex-1 overflow-hidden px-2 py-1.5 sm:px-4 sm:py-2"
            }`}
          >
            <CalendarGrid
              year={year}
              month={month}
              stamps={stamps}
              onDateClick={handleDateClick}
              onStampLoadError={evictBrokenStamp}
              exportMode={false}
              viewMode={viewMode}
            />
          </div>
        </div>

        {/* Footer hints */}
        <div className="mt-1.5 flex flex-col items-center gap-1 sm:mt-2">
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
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">
              · click a date to add · {Math.round(dailyLimitBytes / 1024)}
              KB/day/stamp
            </span>
          </div>
        </div>
      </div>

      {/* Stamp Cutter Dialog */}
      <StampCutterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedDate={selectedDate}
        onStick={handleStick}
      />

      {/* Sticker Peel Animation */}
      <StickerPeelAnimation
        open={peelOpen}
        stampUrl={selectedDate ? stamps.get(selectedDate) : undefined}
        dateStr={selectedDate || ""}
        onConfirm={handlePeelConfirm}
        onCancel={() => setPeelOpen(false)}
      />

      {/* Export Overlay */}
      <ExportOverlay
        open={exportOpen}
        onOpenChange={setExportOpen}
        year={year}
        month={month}
        stamps={stamps}
        isDark={isDark}
      />
    </div>
  );
}
