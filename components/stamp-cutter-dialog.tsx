"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  processStampImage,
  STAMP_ASPECT_W,
  STAMP_ASPECT_H,
  type CropArea,
} from "@/lib/image-processor";
import { UploadSimple, Stamp as StampIcon } from "@phosphor-icons/react";

interface StampCutterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string | null;
  onStick: (dateStr: string, blobUrl: string, blob: Blob) => void;
}

// Preview canvas dimensions — 26:37 portrait ratio
const PREVIEW_W = 260;
const PREVIEW_H = 370;

export function StampCutterDialog({
  open,
  onOpenChange,
  selectedDate,
  onStick,
}: StampCutterDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgNatW, setImgNatW] = useState(0);
  const [imgNatH, setImgNatH] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setImgSrc(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setProcessing(false);
    }
  }, [open]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFile(f);
      const url = URL.createObjectURL(f);
      setImgSrc(url);
      setZoom(1);
      setPan({ x: 0, y: 0 });

      const img = new Image();
      img.onload = () => {
        setImgNatW(img.naturalWidth);
        setImgNatH(img.naturalHeight);
      };
      img.src = url;
    },
    [],
  );

  // Draw preview on canvas
  useEffect(() => {
    if (!imgSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);

      // Background
      drawStampOutline(ctx, PREVIEW_W, PREVIEW_H);
      ctx.save();
      drawStampClip(ctx, PREVIEW_W, PREVIEW_H);
      ctx.clip();

      // Scale image to cover the preview area
      const baseScale = Math.max(
        PREVIEW_W / img.naturalWidth,
        PREVIEW_H / img.naturalHeight,
      );
      const scale = baseScale * zoom;
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const drawX = (PREVIEW_W - drawW) / 2 + pan.x;
      const drawY = (PREVIEW_H - drawH) / 2 + pan.y;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      drawStampBorder(ctx, PREVIEW_W, PREVIEW_H);
    };
    img.src = imgSrc;
  }, [imgSrc, zoom, pan]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleStick = useCallback(async () => {
    if (!file || !selectedDate) return;
    setProcessing(true);

    try {
      const baseScale = Math.max(PREVIEW_W / imgNatW, PREVIEW_H / imgNatH);
      const scale = baseScale * zoom;
      const drawW = imgNatW * scale;
      const drawH = imgNatH * scale;
      const drawX = (PREVIEW_W - drawW) / 2 + pan.x;
      const drawY = (PREVIEW_H - drawH) / 2 + pan.y;

      const cropX = Math.max(0, -drawX / scale);
      const cropY = Math.max(0, -drawY / scale);
      const cropW = Math.min(imgNatW - cropX, PREVIEW_W / scale);
      const cropH = Math.min(imgNatH - cropY, PREVIEW_H / scale);

      const crop: CropArea = {
        x: cropX,
        y: cropY,
        width: cropW,
        height: cropH,
      };

      const { blobUrl, blob } = await processStampImage(file, crop);
      onStick(selectedDate, blobUrl, blob);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to process stamp:", err);
    } finally {
      setProcessing(false);
    }
  }, [file, selectedDate, imgNatW, imgNatH, zoom, pan, onStick, onOpenChange]);

  const formattedDate = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">
            Stamp for {formattedDate}
          </DialogTitle>
          <DialogDescription>
            Upload a photo, position it, then stick your stamp.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {!imgSrc ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-[260px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-muted-foreground/30 hover:bg-muted"
              style={{ height: `${PREVIEW_H}px` }}
            >
              <UploadSimple
                size={32}
                weight="light"
                className="text-muted-foreground/50"
              />
              <span className="text-sm text-muted-foreground">
                Click to upload a photo
              </span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <canvas
                ref={canvasRef}
                width={PREVIEW_W}
                height={PREVIEW_H}
                className="cursor-grab rounded-sm active:cursor-grabbing"
                style={{
                  touchAction: "none",
                  width: PREVIEW_W,
                  height: PREVIEW_H,
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              <div className="flex w-full items-center gap-3 px-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Zoom
                </span>
                <Slider
                  value={[zoom]}
                  onValueChange={(v) => setZoom(v[0])}
                  min={1}
                  max={3}
                  step={0.05}
                  className="flex-1"
                />
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          {imgSrc && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFile(null);
                setImgSrc(null);
                setZoom(1);
                setPan({ x: 0, y: 0 });
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-muted-foreground"
            >
              Change photo
            </Button>
          )}
          <Button
            variant="ghost"
            size="default"
            onClick={handleStick}
            disabled={!imgSrc || processing}
            className="ml-auto gap-1.5 font-medium"
          >
            <StampIcon size={16} weight="bold" />
            {processing ? "Sticking..." : "Stick"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -- Canvas drawing helpers for 26:37 stamp shape --

function drawStampClip(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const base = Math.min(w, h);
  const scallop = base * 0.03;
  const spacing = base * 0.075;
  const margin = base * 0.02;

  ctx.beginPath();
  ctx.moveTo(margin, margin);

  const topCount = Math.floor((w - 2 * margin) / spacing);
  const topOff = (w - 2 * margin - topCount * spacing) / 2;
  for (let i = 0; i <= topCount; i++) {
    ctx.arc(margin + topOff + i * spacing, margin, scallop, Math.PI, 0, true);
  }
  ctx.lineTo(w - margin, margin);

  const rightCount = Math.floor((h - 2 * margin) / spacing);
  const rightOff = (h - 2 * margin - rightCount * spacing) / 2;
  for (let i = 0; i <= rightCount; i++) {
    ctx.arc(
      w - margin,
      margin + rightOff + i * spacing,
      scallop,
      -Math.PI / 2,
      Math.PI / 2,
      true,
    );
  }
  ctx.lineTo(w - margin, h - margin);

  const bottomCount = Math.floor((w - 2 * margin) / spacing);
  const bottomOff = (w - 2 * margin - bottomCount * spacing) / 2;
  for (let i = bottomCount; i >= 0; i--) {
    ctx.arc(
      margin + bottomOff + i * spacing,
      h - margin,
      scallop,
      0,
      Math.PI,
      true,
    );
  }
  ctx.lineTo(margin, h - margin);

  const leftCount = Math.floor((h - 2 * margin) / spacing);
  const leftOff = (h - 2 * margin - leftCount * spacing) / 2;
  for (let i = leftCount; i >= 0; i--) {
    ctx.arc(
      margin,
      margin + leftOff + i * spacing,
      scallop,
      Math.PI / 2,
      -Math.PI / 2,
      true,
    );
  }
  ctx.closePath();
}

function drawStampOutline(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#F0F0F0";
  ctx.fillRect(0, 0, w, h);
}

function drawStampBorder(ctx: CanvasRenderingContext2D, w: number, h: number) {
  drawStampClip(ctx, w, h);
  ctx.strokeStyle = "rgba(128,128,128,0.2)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
