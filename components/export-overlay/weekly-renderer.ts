import { STAMP_RATIO } from "@/lib/image-processor";
import { drawStampWithShadow, loadStampImages } from "./canvas-utils";
import { DAY_LABELS, MONTH_NAMES } from "./constants";
import type { ExportPalette } from "./palette";
import type { CalendarCell } from "./types";

interface RenderWeeklyExportParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  palette: ExportPalette;
  weekCells: CalendarCell[];
  stamps: Map<string, string>;
  todayStr: string;
  weekRangeLabel: string;
  month: number;
  year: number;
}

export async function renderWeeklyExport({
  ctx,
  width: W,
  height: H,
  palette,
  weekCells,
  stamps,
  todayStr,
  weekRangeLabel,
  month,
  year,
}: RenderWeeklyExportParams): Promise<void> {
  const scale = H / 560;
  const paddingX = Math.round(Math.max(24, W * 0.035));
  const topPad = Math.round(Math.max(22, H * 0.06));
  const bottomPad = Math.round(Math.max(20, H * 0.06));
  const headerH = Math.round(Math.max(90, H * 0.24));

  const gridTop = topPad + headerH;
  const gridH = H - gridTop - bottomPad;
  const gap = Math.round(Math.max(6, W * 0.0045));
  const gridW = W - paddingX * 2;
  const cellW = (gridW - gap * 6) / 7;
  const cellH = gridH;

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, W, H);

  const dotSpacing = Math.round(34 * scale);
  ctx.fillStyle = palette.gridLine;
  for (let x = 0; x < W; x += dotSpacing) {
    for (let y = 0; y < H; y += dotSpacing) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.8, 0.8 * scale), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = palette.title;
  ctx.textAlign = "left";
  ctx.font = `700 ${Math.round(48 * scale)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText("Weekly", paddingX, topPad + Math.round(42 * scale));

  ctx.fillStyle = palette.subtitle;
  ctx.font = `400 ${Math.round(22 * scale)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(
    weekRangeLabel || `${MONTH_NAMES[month - 1]} ${year}`,
    paddingX,
    topPad + Math.round(76 * scale),
  );

  ctx.fillStyle = palette.watermark;
  ctx.textAlign = "right";
  ctx.font = `600 ${Math.round(12 * scale)}px system-ui, -apple-system, sans-serif`;
  ctx.fillText("STAMP DIARY", W - paddingX, topPad + Math.round(20 * scale));

  const imageCache = await loadStampImages(weekCells, stamps);

  for (let i = 0; i < weekCells.length; i++) {
    const cell = weekCells[i];
    const cx = paddingX + i * (cellW + gap);
    const cy = gridTop;

    ctx.fillStyle = palette.cellBg;
    ctx.beginPath();
    ctx.roundRect(cx, cy, cellW, cellH, Math.max(8, 10 * scale));
    ctx.fill();

    if (cell.dateStr === todayStr) {
      ctx.fillStyle = palette.todayBg;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cellW, cellH, Math.max(8, 10 * scale));
      ctx.fill();
      ctx.strokeStyle = palette.todayBorder;
      ctx.lineWidth = Math.max(1.4, 1.8 * scale);
      ctx.stroke();
    }

    const dayLabelY = cy + Math.round(Math.max(22, 28 * scale));
    const dateLabelY = dayLabelY + Math.round(Math.max(16, 20 * scale));

    ctx.textAlign = "center";
    ctx.fillStyle = cell.isCurrentMonth
      ? palette.dayNumCurrent
      : palette.fadedDay;
    ctx.font = `600 ${Math.round(Math.max(11, 12 * scale))}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(DAY_LABELS[i], cx + cellW / 2, dayLabelY);

    ctx.fillStyle =
      cell.dateStr === todayStr
        ? palette.todayText
        : cell.isCurrentMonth
          ? palette.dayNumCurrent
          : palette.fadedDay;

    ctx.font =
      cell.dateStr === todayStr
        ? `700 ${Math.round(Math.max(18, 20 * scale))}px system-ui, -apple-system, sans-serif`
        : `500 ${Math.round(Math.max(16, 18 * scale))}px system-ui, -apple-system, sans-serif`;

    ctx.fillText(String(cell.day), cx + cellW / 2, dateLabelY);

    const img = imageCache.get(cell.dateStr);
    if (!img) continue;

    const topContentPad = Math.round(Math.max(52, 64 * scale));
    const sidePad = Math.round(Math.max(10, cellW * 0.08));
    const bottomTextPad = Math.round(Math.max(18, 22 * scale));

    const availW = cellW - sidePad * 2;
    const availH = cellH - topContentPad - bottomTextPad;
    const stampH = Math.min(availH, availW / STAMP_RATIO);
    const stampW = stampH * STAMP_RATIO;
    const stampX = cx + (cellW - stampW) / 2;
    const stampY = cy + topContentPad + (availH - stampH) / 2;

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
}
