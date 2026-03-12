import { drawStampClipPath } from "@/lib/image-processor";
import { seededRotation } from "./date-utils";
import type { CalendarCell } from "./types";

export function configureCanvasQuality(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

export async function loadStampImages(
  cells: Array<Pick<CalendarCell, "dateStr">>,
  stamps: Map<string, string>,
): Promise<Map<string, HTMLImageElement>> {
  const imageCache = new Map<string, HTMLImageElement>();
  const loadPromises: Promise<void>[] = [];

  for (const cell of cells) {
    const url = stamps.get(cell.dateStr);
    if (!url || imageCache.has(cell.dateStr)) continue;

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

  await Promise.all(loadPromises);
  return imageCache;
}

export function drawStampWithShadow(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dateStr: string,
  x: number,
  y: number,
  w: number,
  h: number,
  shadowColor: string,
  scale: number,
) {
  if (w <= 1 || h <= 1) return;

  const offW = Math.max(2, Math.ceil(w));
  const offH = Math.max(2, Math.ceil(h));
  const offscreen = document.createElement("canvas");
  offscreen.width = offW;
  offscreen.height = offH;

  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;

  configureCanvasQuality(offCtx);
  drawStampClipPath(offCtx, 0, 0, offW, offH);
  offCtx.clip();
  offCtx.drawImage(img, 0, 0, offW, offH);

  const rot = seededRotation(dateStr);

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.translate(-(x + w / 2), -(y + h / 2));

  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = 9 * scale;
  ctx.shadowOffsetX = 1 * scale;
  ctx.shadowOffsetY = 3 * scale;
  ctx.drawImage(offscreen, x, y, w, h);

  ctx.restore();
}
