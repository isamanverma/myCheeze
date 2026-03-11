// cheeze/lib/image-processor.ts

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Stamp aspect ratio: 26 wide × 37 tall (real postage stamp proportions)
export const STAMP_ASPECT_W = 26;
export const STAMP_ASPECT_H = 37;
export const STAMP_RATIO = STAMP_ASPECT_W / STAMP_ASPECT_H; // ~0.7027

const MAX_HEIGHT = 400;
const TARGET_MAX_BYTES = 10 * 1024; // 10 KB

// ─── Single source of truth for stamp perforation geometry ───────────────────
// All rendering paths (CSS mask in calendar, canvas clip in export) must use
// these proportions so the stamp looks identical everywhere.
export const STAMP_MASK_PARAMS = {
  scallopRatio: 0.03, // scallop radius = baseUnit * scallopRatio
  spacingRatio: 0.075, // perforation spacing = baseUnit * spacingRatio
  marginRatio: 0.02, // inset from edge = baseUnit * marginRatio
} as const;

/**
 * Draws a postage-stamp perforation clip path onto a canvas context.
 * x, y, w, h describe the rectangle to clip within (for export where
 * the stamp is not at the canvas origin). For full-canvas use, pass
 * x=0, y=0, w=canvas.width, h=canvas.height.
 */
export function drawStampClipPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const base = Math.min(w, h);
  const scallop = base * STAMP_MASK_PARAMS.scallopRatio;
  const spacing = base * STAMP_MASK_PARAMS.spacingRatio;
  const margin = base * STAMP_MASK_PARAMS.marginRatio;

  ctx.beginPath();
  ctx.moveTo(x + margin, y + margin);

  // Top edge: left → right
  const topCount = Math.floor((w - 2 * margin) / spacing);
  const topOff = (w - 2 * margin - topCount * spacing) / 2;
  for (let i = 0; i <= topCount; i++) {
    ctx.arc(
      x + margin + topOff + i * spacing,
      y + margin,
      scallop,
      Math.PI,
      0,
      true,
    );
  }
  ctx.lineTo(x + w - margin, y + margin);

  // Right edge: top → bottom
  const rightCount = Math.floor((h - 2 * margin) / spacing);
  const rightOff = (h - 2 * margin - rightCount * spacing) / 2;
  for (let i = 0; i <= rightCount; i++) {
    ctx.arc(
      x + w - margin,
      y + margin + rightOff + i * spacing,
      scallop,
      -Math.PI / 2,
      Math.PI / 2,
      true,
    );
  }
  ctx.lineTo(x + w - margin, y + h - margin);

  // Bottom edge: right → left
  const bottomCount = Math.floor((w - 2 * margin) / spacing);
  const bottomOff = (w - 2 * margin - bottomCount * spacing) / 2;
  for (let i = bottomCount; i >= 0; i--) {
    ctx.arc(
      x + margin + bottomOff + i * spacing,
      y + h - margin,
      scallop,
      0,
      Math.PI,
      true,
    );
  }
  ctx.lineTo(x + margin, y + h - margin);

  // Left edge: bottom → top
  const leftCount = Math.floor((h - 2 * margin) / spacing);
  const leftOff = (h - 2 * margin - leftCount * spacing) / 2;
  for (let i = leftCount; i >= 0; i--) {
    ctx.arc(
      x + margin,
      y + margin + leftOff + i * spacing,
      scallop,
      Math.PI / 2,
      -Math.PI / 2,
      true,
    );
  }

  ctx.closePath();
}

/**
 * Generate a stamp-shaped SVG data URL for use as a CSS mask-image.
 * w and h are the intrinsic dimensions of the SVG (it will be stretched
 * to 100% × 100% of the masked element via maskSize).
 * Uses STAMP_MASK_PARAMS so the shape is identical to the canvas clip.
 */
export function generateStampSVG(w: number, h: number): string {
  const base = Math.min(w, h);
  const scallop = base * STAMP_MASK_PARAMS.scallopRatio;
  const spacing = base * STAMP_MASK_PARAMS.spacingRatio;
  const margin = base * STAMP_MASK_PARAMS.marginRatio;

  let path = `M ${margin},${margin} `;

  // Top edge
  const topCount = Math.floor((w - 2 * margin) / spacing);
  const topOff = (w - 2 * margin - topCount * spacing) / 2;
  for (let i = 0; i <= topCount; i++) {
    const cx = margin + topOff + i * spacing;
    path += `A ${scallop} ${scallop} 0 0 0 ${cx + scallop * 2} ${margin} `;
  }
  path += `L ${w - margin},${margin} `;

  // Right edge
  const rightCount = Math.floor((h - 2 * margin) / spacing);
  const rightOff = (h - 2 * margin - rightCount * spacing) / 2;
  for (let i = 0; i <= rightCount; i++) {
    const cy = margin + rightOff + i * spacing;
    path += `A ${scallop} ${scallop} 0 0 0 ${w - margin} ${cy + scallop * 2} `;
  }
  path += `L ${w - margin},${h - margin} `;

  // Bottom edge
  const bottomCount = Math.floor((w - 2 * margin) / spacing);
  const bottomOff = (w - 2 * margin - bottomCount * spacing) / 2;
  for (let i = bottomCount; i >= 0; i--) {
    const cx = margin + bottomOff + i * spacing;
    path += `A ${scallop} ${scallop} 0 0 0 ${cx - scallop * 2} ${h - margin} `;
  }
  path += `L ${margin},${h - margin} `;

  // Left edge
  const leftCount = Math.floor((h - 2 * margin) / spacing);
  const leftOff = (h - 2 * margin - leftCount * spacing) / 2;
  for (let i = leftCount; i >= 0; i--) {
    const cy = margin + leftOff + i * spacing;
    path += `A ${scallop} ${scallop} 0 0 0 ${margin} ${cy - scallop * 2} `;
  }

  path += "Z";

  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><path d="${path}" fill="black"/></svg>`,
  )}`;
}

/**
 * Process an image: crop to 26:37 ratio and compress to WebP ≤ 10 KB.
 *
 * The stamp shape is NOT baked into the stored file — it is applied purely
 * at display time via CSS mask-image (calendar) and canvas clip (export).
 * This means the file in storage is a plain rectangular WebP that matches
 * what the user cropped, with no double-masking artefacts.
 */
export async function processStampImage(
  file: File,
  crop: CropArea,
): Promise<{ blobUrl: string; blob: Blob }> {
  const img = await loadImage(file);

  // Output dimensions in 26:37 ratio, capped at MAX_HEIGHT
  const outH = Math.min(Math.round(crop.height), MAX_HEIGHT);
  const outW = Math.round(outH * STAMP_RATIO);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;

  // Adjust source rect to exactly match the 26:37 output ratio
  let srcX = crop.x;
  let srcY = crop.y;
  let srcW = crop.width;
  let srcH = crop.height;

  const srcRatio = srcW / srcH;
  if (srcRatio > STAMP_RATIO) {
    // Source is wider than 26:37 — trim the sides
    const newSrcW = srcH * STAMP_RATIO;
    srcX += (srcW - newSrcW) / 2;
    srcW = newSrcW;
  } else {
    // Source is taller than 26:37 — trim top and bottom
    const newSrcH = srcW / STAMP_RATIO;
    srcY += (srcH - newSrcH) / 2;
    srcH = newSrcH;
  }

  // Draw the plain rectangular crop — no clip, no mask.
  // The stamp perforation shape is handled entirely at render time.
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

  // Compress to WebP, iteratively reducing quality to hit ≤ 10 KB
  let quality = 0.6;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > TARGET_MAX_BYTES && quality > 0.05) {
    quality -= 0.05;
    blob = await canvasToBlob(canvas, quality);
  }

  // If still too large at minimum quality, downscale the canvas
  if (blob.size > TARGET_MAX_BYTES) {
    const reductionFactor = Math.sqrt(TARGET_MAX_BYTES / blob.size);
    const newW = Math.round(outW * reductionFactor);
    const newH = Math.round(outH * reductionFactor);

    const smallCanvas = document.createElement("canvas");
    smallCanvas.width = newW;
    smallCanvas.height = newH;
    const smallCtx = smallCanvas.getContext("2d")!;
    smallCtx.drawImage(canvas, 0, 0, newW, newH);

    quality = 0.5;
    blob = await canvasToBlob(smallCanvas, quality);
    while (blob.size > TARGET_MAX_BYTES && quality > 0.05) {
      quality -= 0.05;
      blob = await canvasToBlob(smallCanvas, quality);
    }

    // Extra safety: keep shrinking until we're under the limit
    let workCanvas = smallCanvas;
    while (blob.size > TARGET_MAX_BYTES && workCanvas.width > 40) {
      const nextW = Math.max(40, Math.round(workCanvas.width * 0.9));
      const nextH = Math.max(40, Math.round(workCanvas.height * 0.9));

      const nextCanvas = document.createElement("canvas");
      nextCanvas.width = nextW;
      nextCanvas.height = nextH;
      nextCanvas.getContext("2d")!.drawImage(workCanvas, 0, 0, nextW, nextH);

      workCanvas = nextCanvas;
      blob = await canvasToBlob(workCanvas, 0.45);
    }
  }

  return { blobUrl: URL.createObjectURL(blob), blob };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
      "image/webp",
      quality,
    );
  });
}
