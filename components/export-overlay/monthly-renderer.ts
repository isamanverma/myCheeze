import { STAMP_RATIO } from "@/lib/image-processor";
import {
  configureCanvasQuality,
  drawStampWithShadow,
  loadStampImages,
} from "./canvas-utils";
import { DAY_LABELS, MONTH_NAMES } from "./constants";
import type { ExportPalette } from "./palette";
import type { CalendarCell } from "./types";

interface RenderMonthlyExportParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  palette: ExportPalette;
  month: number;
  year: number;
  monthCells: CalendarCell[];
  stamps: Map<string, string>;
  todayStr: string;
}

export async function renderMonthlyExport({
  ctx,
  width: W,
  height: H,
  palette,
  month,
  year,
  monthCells,
  stamps,
  todayStr,
}: RenderMonthlyExportParams): Promise<void> {
  configureCanvasQuality(ctx);

  const isLandscape = W > H;
  const scale = Math.min(W, H) / 1080;

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, W, H);

  const dotSpacing = Math.round(32 * scale);
  ctx.fillStyle = palette.gridLine;
  for (let x = 0; x < W; x += dotSpacing) {
    for (let y = 0; y < H; y += dotSpacing) {
      ctx.beginPath();
      ctx.arc(x, y, 0.8 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const padding = Math.round(48 * scale);
  let headerHeight: number;
  let gridLeft: number;
  let gridTop: number;
  let totalGridW: number;
  let totalGridH: number;

  if (isLandscape) {
    const leftPanelW = Math.round(W * 0.28);

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

    ctx.fillStyle = palette.watermark;
    ctx.font = `600 ${Math.round(11 * scale)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("STAMP DIARY", leftPanelW / 2, H - padding);

    gridLeft = leftPanelW;
    gridTop = padding;
    totalGridW = W - leftPanelW - padding;
    totalGridH = H - padding * 2;
    headerHeight = Math.round(24 * scale);
  } else {
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
    ctx.fillText(String(year), Math.round(58 * scale), Math.round(120 * scale));

    gridLeft = padding;
    gridTop = Math.round(162 * scale);
    totalGridW = W - padding * 2;
    totalGridH = H - gridTop - Math.round(72 * scale);
    headerHeight = Math.round(18 * scale);
  }

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

  const rowCount = Math.ceil(monthCells.length / 7);
  const cellAreaH = totalGridH - headerHeight;
  const cellH = (cellAreaH - cellGap * (rowCount - 1)) / rowCount;
  const cellStartY = gridTop + headerHeight;

  const imageCache = await loadStampImages(monthCells, stamps);

  for (let i = 0; i < monthCells.length; i++) {
    const cell = monthCells[i];
    const col = i % 7;
    const row = Math.floor(i / 7);
    const cx = gridLeft + col * (cellW + cellGap);
    const cy = cellStartY + row * (cellH + cellGap);

    ctx.fillStyle = palette.cellBg;
    ctx.beginPath();
    ctx.roundRect(cx, cy, cellW, cellH, 5 * scale);
    ctx.fill();

    if (cell.dateStr === todayStr) {
      ctx.fillStyle = palette.todayBg;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cellW, cellH, 5 * scale);
      ctx.fill();
      ctx.strokeStyle = palette.todayBorder;
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();
    }

    const img = imageCache.get(cell.dateStr);
    if (img) {
      const stampPadding = cellW * 0.1;
      const availW = cellW - stampPadding * 2;
      const availH = cellH - stampPadding * 2 - 16 * scale;
      const stampH = Math.min(availH, availW / STAMP_RATIO);
      const stampW = stampH * STAMP_RATIO;
      const stampX = cx + (cellW - stampW) / 2;
      const stampY = cy + stampPadding;

      drawStampWithShadow(
        ctx,
        img,
        cell.dateStr,
        stampX,
        stampY,
        stampW,
        stampH,
        palette.stampShadow,
        scale,
      );
    }

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

  if (!isLandscape) {
    ctx.fillStyle = palette.watermark;
    ctx.font = `600 ${Math.round(12 * scale)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("STAMP DIARY", W / 2, H - Math.round(28 * scale));
  }
}
