"use client";

import { Stamp as StampIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type CropArea, processStampImage } from "@/lib/image-processor";
import {
  drawStampBorder,
  drawStampClip,
  drawStampOutline,
} from "./stamp-cutter-dialog/canvas-helpers";
import { PreviewPanel } from "./stamp-cutter-dialog/preview-panel";
import { UploadPanel } from "./stamp-cutter-dialog/upload-panel";

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
    if (open) return;

    setFile(null);
    setImgSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setProcessing(false);
  }, [open]);

  const resetImageSelection = useCallback(() => {
    setFile(null);
    setImgSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImgNatW(0);
    setImgNatH(0);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = e.target.files?.[0];
      if (!nextFile) return;

      setFile(nextFile);
      const url = URL.createObjectURL(nextFile);

      // Revoke previous preview URL before replacing it.
      setImgSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });

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

  useEffect(() => {
    if (!imgSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;

      ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);

      drawStampOutline(ctx, { width: PREVIEW_W, height: PREVIEW_H });
      ctx.save();
      drawStampClip(ctx, { width: PREVIEW_W, height: PREVIEW_H });
      ctx.clip();

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

      drawStampBorder(ctx, { width: PREVIEW_W, height: PREVIEW_H });
    };

    img.src = imgSrc;

    return () => {
      cancelled = true;
    };
  }, [imgSrc, zoom, pan]);

  const getCanvasScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;

    const rect = canvas.getBoundingClientRect();
    return rect.width > 0 ? PREVIEW_W / rect.width : 1;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
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

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      const touch = e.touches[0];
      const scale = getCanvasScale();

      setIsDragging(true);
      setDragStart({
        x: touch.clientX / scale - pan.x,
        y: touch.clientY / scale - pan.y,
      });
    },
    [pan, getCanvasScale],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDragging) return;

      e.preventDefault();
      const touch = e.touches[0];
      const scale = getCanvasScale();

      setPan({
        x: touch.clientX / scale - dragStart.x,
        y: touch.clientY / scale - dragStart.y,
      });
    },
    [isDragging, dragStart, getCanvasScale],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleStick = useCallback(async () => {
    if (!file || !selectedDate || imgNatW <= 0 || imgNatH <= 0) return;

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
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
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
            <UploadPanel
              previewWidth={PREVIEW_W}
              previewHeight={PREVIEW_H}
              onPickFile={() => fileInputRef.current?.click()}
            />
          ) : (
            <PreviewPanel
              previewWidth={PREVIEW_W}
              previewHeight={PREVIEW_H}
              isDragging={isDragging}
              zoom={zoom}
              onZoomChange={setZoom}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              canvasRef={canvasRef}
            />
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
              onClick={resetImageSelection}
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
