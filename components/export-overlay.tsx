"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CaretDownIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { STAMP_RATIO, drawStampClipPath } from "@/lib/image-processor";

interface ExportOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  stamps: Map<string, string>;
  isDark: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface ExportPreset {
  label: string;
  description: string;
  width: number;
  height: number;
}

const EXPORT_PRESETS: ExportPreset[] = [
  {
    label: "Square",
    description: "1080 × 1080 · Instagram / Twitter",
    width: 1080,
    height: 1080,
  },
  {
    label: "OG Landscape",
    description: "1200 × 630 · Open Graph / Link previews",
    width: 1200,
    height: 630,
  },
  {
    label: "Large Square",
    description: "2048 × 2048 · High resolution",
    width: 2048,
    height: 2048,
  },
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function seededRotation(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return (hash % 600) / 100 - 3;
}

function buildCells(year: number, month: number) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const cells: Array<{
    day: number;
    dateStr: string;
    isCurrentMonth: boolean;
  }> = [];

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrev = getDaysInMonth(prevYear, prevMonth);
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    cells.push({
      day: d,
      dateStr: toDateStr(prevYear, prevMonth, d),
      isCurrentMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      dateStr: toDateStr(year, month, d),
      isCurrentMonth: true,
    });
  }
  const nextMo = month === 12 ? 1 : month + 1;
  const nextYr = month === 12 ? year + 1 : year;
  while (cells.length % 7 !== 0) {
    const d = cells.length - (daysInMonth + firstDay) + 1;
    cells.push({
      day: d,
      dateStr: toDateStr(nextYr, nextMo, d),
      isCurrentMonth: false,
    });
  }

  return cells;
}

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
  const [presetIndex, setPresetIndex] = useState(0);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);

  const preset = EXPORT_PRESETS[presetIndex];

  // Theme palette — memoized so renderExport doesn't rebuild on every render
  const palette = useMemo(
    () =>
      isDark
        ? {
            bg: "#1C1C1E",
            bgAlt: "#2C2C2E",
            gridLine: "rgba(255,255,255,0.03)",
            title: "#F5F5F5",
            subtitle: "#888888",
            dayLabel: "#666666",
            dayNum: "#555555",
            dayNumCurrent: "#777777",
            todayBg: "rgba(100,200,130,0.08)",
            todayBorder: "rgba(100,200,130,0.15)",
            todayText: "rgba(100,200,130,0.7)",
            stampShadow: "rgba(0,0,0,0.35)",
            watermark: "rgba(255,255,255,0.04)",
            fadedDay: "#3A3A3A",
            cellBg: "rgba(255,255,255,0.02)",
          }
        : {
            bg: "#FAFAFA",
            bgAlt: "#FFFFFF",
            gridLine: "rgba(0,0,0,0.02)",
            title: "#1A1A1A",
            subtitle: "#AAAAAA",
            dayLabel: "#BBBBBB",
            dayNum: "#CCCCCC",
            dayNumCurrent: "#BBBBBB",
            todayBg: "rgba(80,160,100,0.06)",
            todayBorder: "rgba(80,160,100,0.12)",
            todayText: "rgba(60,130,80,0.6)",
            stampShadow: "rgba(0,0,0,0.12)",
            watermark: "rgba(0,0,0,0.04)",
            fadedDay: "#E0E0E0",
            cellBg: "rgba(0,0,0,0.01)",
          },
    [isDark],
  );

  const renderExport = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);
    const ctx = canvas.getContext("2d")!;
    const W = preset.width;
    const H = preset.height;
    canvas.width = W;
    canvas.height = H;

    const isLandscape = W > H;
    const scale = Math.min(W, H) / 1080; // normalize relative to 1080

    // Background
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle dot grid
    const dotSpacing = Math.round(32 * scale);
    ctx.fillStyle = palette.gridLine;
    for (let x = 0; x < W; x += dotSpacing) {
      for (let y = 0; y < H; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Layout calculations
    const padding = Math.round(48 * scale);
    let headerHeight: number;
    let gridLeft: number;
    let gridTop: number;
    let totalGridW: number;
    let totalGridH: number;

    if (isLandscape) {
      // Landscape: title on the left side, grid on the right
      const leftPanelW = Math.round(W * 0.28);

      // Title in left panel
      ctx.fillStyle = palette.title;
      ctx.font = `700 ${Math.round(44 * scale)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(
        MONTH_NAMES[month - 1],
        padding,
        padding + Math.round(52 * scale),
      );

      ctx.fillStyle = palette.subtitle;
      ctx.font = `300 ${Math.round(24 * scale)}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(String(year), padding, padding + Math.round(86 * scale));

      // Watermark in bottom of left panel
      ctx.fillStyle = palette.watermark;
      ctx.font = `600 ${Math.round(11 * scale)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.letterSpacing = `${Math.round(4 * scale)}px`;
      ctx.fillText("STAMP DIARY", leftPanelW / 2, H - padding);
      ctx.letterSpacing = "0px";

      gridLeft = leftPanelW;
      gridTop = padding;
      totalGridW = W - leftPanelW - padding;
      totalGridH = H - padding * 2;
      headerHeight = Math.round(24 * scale);
    } else {
      // Square / portrait: title on top, grid below
      ctx.fillStyle = palette.title;
      ctx.font = `700 ${Math.round(52 * scale)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(
        MONTH_NAMES[month - 1],
        Math.round(56 * scale),
        Math.round(86 * scale),
      );

      ctx.fillStyle = palette.subtitle;
      ctx.font = `300 ${Math.round(28 * scale)}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(
        String(year),
        Math.round(58 * scale),
        Math.round(120 * scale),
      );

      gridLeft = padding;
      gridTop = Math.round(162 * scale);
      totalGridW = W - padding * 2;
      totalGridH = H - gridTop - Math.round(72 * scale);
      headerHeight = Math.round(18 * scale);
    }

    // Day labels
    const cellGap = Math.round(5 * scale);
    const cellW = (totalGridW - cellGap * 6) / 7;

    ctx.fillStyle = palette.dayLabel;
    ctx.font = `600 ${Math.round(13 * scale)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    for (let c = 0; c < 7; c++) {
      ctx.fillText(
        DAY_LABELS[c],
        gridLeft + c * (cellW + cellGap) + cellW / 2,
        gridTop + Math.round(12 * scale),
      );
    }

    // Build cell data
    const cells = buildCells(year, month);
    const rowCount = Math.ceil(cells.length / 7);
    const cellAreaH = totalGridH - headerHeight;
    const cellH = (cellAreaH - cellGap * (rowCount - 1)) / rowCount;

    // Load stamp images
    const imageCache = new Map<string, HTMLImageElement>();
    const loadPromises: Promise<void>[] = [];
    for (const cell of cells) {
      const url = stamps.get(cell.dateStr);
      if (url && !imageCache.has(cell.dateStr)) {
        loadPromises.push(
          new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              imageCache.set(cell.dateStr, img);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = url;
          }),
        );
      }
    }
    await Promise.all(loadPromises);

    const todayNow = new Date();
    const todayStr = toDateStr(
      todayNow.getFullYear(),
      todayNow.getMonth() + 1,
      todayNow.getDate(),
    );

    const cellStartY = gridTop + headerHeight;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const col = i % 7;
      const row = Math.floor(i / 7);
      const cx = gridLeft + col * (cellW + cellGap);
      const cy = cellStartY + row * (cellH + cellGap);

      // Cell background
      ctx.fillStyle = palette.cellBg;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cellW, cellH, 5 * scale);
      ctx.fill();

      // Today highlight
      if (cell.dateStr === todayStr) {
        ctx.fillStyle = palette.todayBg;
        ctx.beginPath();
        ctx.roundRect(cx, cy, cellW, cellH, 5 * scale);
        ctx.fill();
        ctx.strokeStyle = palette.todayBorder;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();
      }

      // Stamp image — 26:37 portrait, centered
      const img = imageCache.get(cell.dateStr);
      if (img) {
        const stampPadding = cellW * 0.1;
        const availW = cellW - stampPadding * 2;
        const availH = cellH - stampPadding * 2 - 16 * scale;
        // Fit 26:37 into available space
        const stampH = Math.min(availH, availW / STAMP_RATIO);
        const stampW = stampH * STAMP_RATIO;
        const stampX = cx + (cellW - stampW) / 2;
        const stampY = cy + stampPadding;

        const rot = seededRotation(cell.dateStr);
        ctx.save();
        ctx.translate(stampX + stampW / 2, stampY + stampH / 2);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.translate(-(stampX + stampW / 2), -(stampY + stampH / 2));

        ctx.shadowColor = palette.stampShadow;
        ctx.shadowBlur = 8 * scale;
        ctx.shadowOffsetX = 1 * scale;
        ctx.shadowOffsetY = 3 * scale;

        drawStampClipPath(ctx, stampX, stampY, stampW, stampH);
        ctx.clip();
        ctx.drawImage(img, stampX, stampY, stampW, stampH);
        ctx.restore();
      }

      // Day number
      ctx.fillStyle = cell.isCurrentMonth
        ? cell.dateStr === todayStr
          ? palette.todayText
          : palette.dayNumCurrent
        : palette.fadedDay;
      ctx.font =
        cell.dateStr === todayStr
          ? `700 ${Math.round(12 * scale)}px system-ui, -apple-system, sans-serif`
          : `400 ${Math.round(11 * scale)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "left";
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillText(String(cell.day), cx + 5 * scale, cy + cellH - 5 * scale);
    }

    // Watermark (only for non-landscape — landscape puts it in left panel)
    if (!isLandscape) {
      ctx.fillStyle = palette.watermark;
      ctx.font = `600 ${Math.round(12 * scale)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.letterSpacing = `${Math.round(4 * scale)}px`;
      ctx.fillText("STAMP DIARY", W / 2, H - Math.round(28 * scale));
      ctx.letterSpacing = "0px";
    }

    setRendering(false);
    setRendered(true);
  }, [year, month, stamps, palette, preset]);

  useEffect(() => {
    if (open) {
      setRendered(false);
      const t = setTimeout(() => renderExport(), 200);
      return () => clearTimeout(t);
    }
  }, [open, renderExport]);

  // Close the size menu when clicking outside
  useEffect(() => {
    if (!sizeMenuOpen) return;
    const handleClick = () => setSizeMenuOpen(false);
    window.addEventListener("click", handleClick, { capture: true });
    return () =>
      window.removeEventListener("click", handleClick, { capture: true });
  }, [sizeMenuOpen]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stamp-diary-${year}-${String(month).padStart(2, "0")}-${preset.width}x${preset.height}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [year, month, preset]);

  const handlePresetChange = useCallback((index: number) => {
    setPresetIndex(index);
    setSizeMenuOpen(false);
    setRendered(false);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export for sharing</DialogTitle>
          <DialogDescription>
            Render your calendar as an image — choose a size preset below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          {/* Size selector */}
          <div className="relative w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSizeMenuOpen((v) => !v);
              }}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              <div className="flex flex-col">
                <span className="font-medium text-foreground">
                  {preset.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {preset.description}
                </span>
              </div>
              <CaretDownIcon
                size={16}
                weight="bold"
                className={`shrink-0 text-muted-foreground transition-transform ${sizeMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {sizeMenuOpen && (
              <div className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                {EXPORT_PRESETS.map((p, idx) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePresetChange(idx);
                    }}
                    className={`flex w-full flex-col px-3 py-2.5 text-left transition-colors hover:bg-muted ${
                      idx === presetIndex ? "bg-muted/60" : ""
                    } ${idx > 0 ? "border-t border-border/50" : ""}`}
                  >
                    <span
                      className={`text-sm font-medium ${idx === presetIndex ? "text-primary" : "text-foreground"}`}
                    >
                      {p.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Canvas preview */}
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
