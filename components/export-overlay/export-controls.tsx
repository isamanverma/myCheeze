"use client";

import { CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { ExportPreset, ExportView } from "./types";

interface ExportControlsProps {
  exportView: ExportView;
  activePresets: ExportPreset[];
  preset: ExportPreset;
  presetIndex: number;
  sizeMenuOpen: boolean;
  onToggleSizeMenu: () => void;
  onExportViewChange: (view: ExportView) => void;
  onPresetChange: (index: number) => void;
}

export function ExportControls({
  exportView,
  activePresets,
  preset,
  presetIndex,
  sizeMenuOpen,
  onToggleSizeMenu,
  onExportViewChange,
  onPresetChange,
}: ExportControlsProps) {
  return (
    <>
      {/* View mode selector */}
      <div className="flex w-full items-center rounded-xl bg-muted p-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onExportViewChange("month")}
          className={`flex-1 ${
            exportView === "month"
              ? "bg-card shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:bg-transparent"
          }`}
        >
          Monthly
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onExportViewChange("week")}
          className={`flex-1 ${
            exportView === "week"
              ? "bg-card shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:bg-transparent"
          }`}
        >
          Weekly
        </Button>
      </div>

      {/* Size selector */}
      <div className="relative w-full">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSizeMenu();
          }}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
        >
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{preset.label}</span>
            <span className="text-xs text-muted-foreground">
              {preset.description}
            </span>
          </div>
          <CaretDownIcon
            size={16}
            weight="bold"
            className={`shrink-0 text-muted-foreground transition-transform ${
              sizeMenuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {sizeMenuOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            {activePresets.map((p, idx) => (
              <button
                key={`${exportView}-${p.label}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPresetChange(idx);
                }}
                className={`flex w-full flex-col px-3 py-2.5 text-left transition-colors hover:bg-muted ${
                  idx === presetIndex ? "bg-muted/60" : ""
                } ${idx > 0 ? "border-t border-border/50" : ""}`}
              >
                <span
                  className={`text-sm font-medium ${
                    idx === presetIndex ? "text-primary" : "text-foreground"
                  }`}
                >
                  {p.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {p.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
