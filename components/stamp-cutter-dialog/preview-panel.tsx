"use client";

import { Slider } from "@/components/ui/slider";

interface PreviewPanelProps {
  previewWidth: number;
  previewHeight: number;
  isDragging: boolean;
  zoom: number;
  onZoomChange: (value: number) => void;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchEnd: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function PreviewPanel({
  previewWidth,
  previewHeight,
  isDragging,
  zoom,
  onZoomChange,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  canvasRef,
}: PreviewPanelProps) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={previewWidth}
        height={previewHeight}
        className={`${isDragging ? "cursor-grabbing" : "cursor-grab"} rounded-sm active:cursor-grabbing`}
        style={{
          touchAction: "none",
          width: "100%",
          maxWidth: previewWidth,
          height: "auto",
          aspectRatio: `${previewWidth}/${previewHeight}`,
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
      <div className="flex w-full max-w-[260px] items-center gap-3 px-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Zoom
        </span>
        <Slider
          value={[zoom]}
          onValueChange={(v) => onZoomChange(v[0])}
          min={1}
          max={3}
          step={0.05}
          className="flex-1"
        />
      </div>
    </div>
  );
}
