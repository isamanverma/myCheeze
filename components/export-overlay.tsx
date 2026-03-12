"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { configureCanvasQuality } from "./export-overlay/canvas-utils";
import {
  DAY_LABELS,
  MONTH_NAMES,
  MONTH_PRESETS,
  WEEK_PRESETS,
} from "./export-overlay/constants";
import {
  buildMonthCells,
  formatDateRange,
  getCurrentWeekCells,
  toDateStr,
} from "./export-overlay/date-utils";
import { ExportControls } from "./export-overlay/export-controls";
import { renderMonthlyExport } from "./export-overlay/monthly-renderer";
import { buildExportPalette } from "./export-overlay/palette";
import type { ExportOverlayProps, ExportView } from "./export-overlay/types";
import { renderWeeklyExport } from "./export-overlay/weekly-renderer";

export function ExportOverlay({
  open,
  onOpenChange,
  year,
  month,
  stamps,
  isDark,
}: ExportOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [rendering, setRendering] = useState(false);
  const [rendered, setRendered] = useState(false);

  const [exportView, setExportView] = useState<ExportView>("month");
  const [presetIndex, setPresetIndex] = useState(0);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);

  const activePresets = exportView === "month" ? MONTH_PRESETS : WEEK_PRESETS;
  const preset = activePresets[presetIndex] ?? activePresets[0];

  const monthCells = useMemo(() => buildMonthCells(year, month), [year, month]);

  const todayStr = useMemo(() => {
    const t = new Date();
    return toDateStr(t.getFullYear(), t.getMonth() + 1, t.getDate());
  }, []);

  const weekCells = useMemo(
    () => getCurrentWeekCells(monthCells, todayStr),
    [monthCells, todayStr],
  );

  const weekRangeLabel = useMemo(() => {
    if (!weekCells.length) return "";
    return formatDateRange(
      weekCells[0].dateStr,
      weekCells[weekCells.length - 1].dateStr,
    );
  }, [weekCells]);

  const palette = useMemo(() => buildExportPalette(isDark), [isDark]);

  const renderExport = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !preset) return;

    setRendering(true);

    const width = preset.width;
    const height = preset.height;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setRendering(false);
      return;
    }

    configureCanvasQuality(ctx);

    if (exportView === "week") {
      await renderWeeklyExport({
        ctx,
        width,
        height,
        palette,
        weekCells,
        stamps,
        todayStr,
        weekRangeLabel,
        month,
        year,
      });
    } else {
      await renderMonthlyExport({
        ctx,
        width,
        height,
        palette,
        month,
        year,
        monthCells,
        stamps,
        todayStr,
      });
    }

    setRendering(false);
    setRendered(true);
  }, [
    preset,
    exportView,
    palette,
    weekCells,
    stamps,
    todayStr,
    weekRangeLabel,
    month,
    year,
    monthCells,
  ]);

  useEffect(() => {
    if (!open) return;
    setRendered(false);
    const t = setTimeout(() => {
      void renderExport();
    }, 120);
    return () => clearTimeout(t);
  }, [open, renderExport]);

  useEffect(() => {
    if (!sizeMenuOpen) return;
    const handleClick = () => setSizeMenuOpen(false);
    window.addEventListener("click", handleClick, { capture: true });
    return () =>
      window.removeEventListener("click", handleClick, { capture: true });
  }, [sizeMenuOpen]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preset) return;

    const suffix =
      exportView === "week"
        ? `week-${weekCells[0]?.dateStr ?? `${year}-${String(month).padStart(2, "0")}`}`
        : `${year}-${String(month).padStart(2, "0")}`;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stamp-diary-${suffix}-${preset.width}x${preset.height}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [exportView, preset, weekCells, year, month]);

  const handlePresetChange = useCallback((index: number) => {
    setPresetIndex(index);
    setRendered(false);
    setSizeMenuOpen(false);
  }, []);

  const handleExportViewChange = useCallback((next: ExportView) => {
    setExportView(next);
    setPresetIndex(0);
    setRendered(false);
    setSizeMenuOpen(false);
  }, []);

  const dialogDescription =
    exportView === "week"
      ? `Choose a weekly format and download a high-quality PNG (${DAY_LABELS.length} day strip).`
      : `Choose a monthly format and download a high-quality PNG for ${MONTH_NAMES[month - 1]} ${year}.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export for sharing</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          <ExportControls
            exportView={exportView}
            activePresets={activePresets}
            preset={preset}
            presetIndex={presetIndex}
            sizeMenuOpen={sizeMenuOpen}
            onToggleSizeMenu={() => setSizeMenuOpen((v) => !v)}
            onExportViewChange={handleExportViewChange}
            onPresetChange={handlePresetChange}
          />

          <div
            className="relative w-full overflow-hidden rounded-lg border border-border bg-muted"
            style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
          >
            <canvas
              ref={canvasRef}
              className="h-auto w-full"
              style={{ display: "block" }}
            />
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Rendering...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="default"
            size="default"
            onClick={handleDownload}
            disabled={!rendered}
            className="gap-1.5"
          >
            <DownloadSimpleIcon size={16} weight="bold" />
            Download PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
