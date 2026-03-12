"use client";

import { KeyHint } from "@/components/illustrations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick reference for all available shortcuts.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              Navigation
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <KeyHint>←</KeyHint>
              <KeyHint>→</KeyHint>
              <span>Previous / Next month</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              Today
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <KeyHint>T</KeyHint>
              <span>Jump to today</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              Theme
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <KeyHint>D</KeyHint>
              <span>Toggle dark / light</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              View
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <KeyHint>W</KeyHint>
              <span>Weekly view</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-foreground">
              <KeyHint>M</KeyHint>
              <span>Monthly view</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 sm:col-span-2">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              Help
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <KeyHint>?</KeyHint>
              <span>Show shortcuts</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
