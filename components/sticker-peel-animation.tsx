"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "radix-ui";
import { Trash } from "@phosphor-icons/react";

interface StickerPeelAnimationProps {
  open: boolean;
  stampUrl: string | undefined;
  dateStr: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StickerPeelAnimation({
  open,
  stampUrl,
  dateStr,
  onConfirm,
  onCancel,
}: StickerPeelAnimationProps) {
  const label = dateStr
    ? new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-xs p-6">
        <VisuallyHidden.Root>
          <DialogTitle>Remove stamp for {label}</DialogTitle>
        </VisuallyHidden.Root>

        <div className="flex flex-col items-center gap-5">
          {/* Stamp preview */}
          {stampUrl && (
            <div className="relative">
              <img
                src={stampUrl}
                alt="Stamp"
                className="h-auto w-28 rounded opacity-70"
                style={{ filter: "grayscale(0.3)" }}
              />
              <div className="absolute inset-0 rounded bg-destructive/10 ring-1 ring-destructive/20" />
            </div>
          )}

          {/* Message */}
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              Remove this stamp?
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>

          {/* Actions */}
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
            >
              <Trash size={14} weight="bold" />
              Remove
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
