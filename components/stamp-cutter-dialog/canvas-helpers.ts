const SCALLOP_RATIO = 0.03;
const SPACING_RATIO = 0.075;
const MARGIN_RATIO = 0.02;

export interface StampPreviewSize {
  width: number;
  height: number;
}

export function drawStampClip(
  ctx: CanvasRenderingContext2D,
  size: StampPreviewSize,
): void {
  const { width: w, height: h } = size;
  const base = Math.min(w, h);
  const scallop = base * SCALLOP_RATIO;
  const spacing = base * SPACING_RATIO;
  const margin = base * MARGIN_RATIO;

  ctx.beginPath();
  ctx.moveTo(margin, margin);

  const topCount = Math.floor((w - 2 * margin) / spacing);
  const topOffset = (w - 2 * margin - topCount * spacing) / 2;
  for (let i = 0; i <= topCount; i++) {
    ctx.arc(
      margin + topOffset + i * spacing,
      margin,
      scallop,
      Math.PI,
      0,
      true,
    );
  }
  ctx.lineTo(w - margin, margin);

  const rightCount = Math.floor((h - 2 * margin) / spacing);
  const rightOffset = (h - 2 * margin - rightCount * spacing) / 2;
  for (let i = 0; i <= rightCount; i++) {
    ctx.arc(
      w - margin,
      margin + rightOffset + i * spacing,
      scallop,
      -Math.PI / 2,
      Math.PI / 2,
      true,
    );
  }
  ctx.lineTo(w - margin, h - margin);

  const bottomCount = Math.floor((w - 2 * margin) / spacing);
  const bottomOffset = (w - 2 * margin - bottomCount * spacing) / 2;
  for (let i = bottomCount; i >= 0; i--) {
    ctx.arc(
      margin + bottomOffset + i * spacing,
      h - margin,
      scallop,
      0,
      Math.PI,
      true,
    );
  }
  ctx.lineTo(margin, h - margin);

  const leftCount = Math.floor((h - 2 * margin) / spacing);
  const leftOffset = (h - 2 * margin - leftCount * spacing) / 2;
  for (let i = leftCount; i >= 0; i--) {
    ctx.arc(
      margin,
      margin + leftOffset + i * spacing,
      scallop,
      Math.PI / 2,
      -Math.PI / 2,
      true,
    );
  }

  ctx.closePath();
}

export function drawStampOutline(
  ctx: CanvasRenderingContext2D,
  size: StampPreviewSize,
): void {
  ctx.fillStyle = "#F0F0F0";
  ctx.fillRect(0, 0, size.width, size.height);
}

export function drawStampBorder(
  ctx: CanvasRenderingContext2D,
  size: StampPreviewSize,
): void {
  drawStampClip(ctx, size);
  ctx.strokeStyle = "rgba(128,128,128,0.2)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
