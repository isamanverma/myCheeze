"use client";

import { UploadSimple } from "@phosphor-icons/react";

interface UploadPanelProps {
  previewWidth: number;
  previewHeight: number;
  onPickFile: () => void;
}

export function UploadPanel({
  previewWidth,
  previewHeight,
  onPickFile,
}: UploadPanelProps) {
  return (
    <button
      type="button"
      onClick={onPickFile}
      className="flex w-full max-w-[260px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-muted-foreground/30 hover:bg-muted"
      style={{ aspectRatio: `${previewWidth}/${previewHeight}` }}
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
  );
}
