"use client";

import { useClerk } from "@clerk/nextjs";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { ViewMode } from "@/hooks/use-stamps";
import { useStamps } from "@/hooks/use-stamps";
import { useTheme } from "@/hooks/use-theme";
import { CalendarGrid } from "./calendar-grid";
import { ExportOverlay } from "./export-overlay";
import { StampCutterDialog } from "./stamp-cutter-dialog";
import { FooterHints } from "./stamp-diary/footer-hints";
import { ShortcutsModal } from "./stamp-diary/shortcuts-modal";
import { useDiaryKeyboardShortcuts } from "./stamp-diary/use-diary-keyboard-shortcuts";
import { StickerPeelAnimation } from "./sticker-peel-animation";
import { Toolbar } from "./toolbar";

export interface StampDiaryProps {
  initialYear: number;
  initialMonth: number;
  initialUserId: string | null;
  initialStamps: Array<{ dateStr: string; url: string }>;
}

function fmtDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
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
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useDiaryKeyboardShortcuts({
    dialogOpen,
    exportOpen,
    peelOpen,
    onPrevMonth: goToPrevMonth,
    onNextMonth: goToNextMonth,
    onToday: goToToday,
    onToggleTheme: toggleTheme,
    onViewModeChange: setViewMode,
    onOpenShortcuts: () => setShortcutsOpen(true),
    onCloseShortcuts: () => setShortcutsOpen(false),
  });

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
    [stamps, userId, openSignIn],
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

  const handleExport = useCallback(() => {
    setExportOpen(true);
  }, []);

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
    },
    [setViewMode],
  );

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

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background font-sans">
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

      <div
        className={`mx-auto flex w-full max-w-6xl flex-col px-3 pb-2 sm:px-6 sm:pb-4 ${
          isWeek
            ? "flex-1 items-center justify-center gap-3"
            : "min-h-0 flex-1 overflow-hidden"
        }`}
      >
        <div
          className={`relative flex flex-col rounded-xl bg-card ring-1 ring-border ${
            isWeek ? "w-full shrink-0" : "flex-1 overflow-hidden"
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

        <FooterHints dailyLimitBytes={dailyLimitBytes} />
      </div>

      <StampCutterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedDate={selectedDate}
        onStick={handleStick}
      />

      <StickerPeelAnimation
        open={peelOpen}
        stampUrl={selectedDate ? stamps.get(selectedDate) : undefined}
        dateStr={selectedDate || ""}
        onConfirm={handlePeelConfirm}
        onCancel={() => setPeelOpen(false)}
      />

      <ExportOverlay
        open={exportOpen}
        onOpenChange={setExportOpen}
        year={year}
        month={month}
        stamps={stamps}
        isDark={isDark}
      />

      <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
