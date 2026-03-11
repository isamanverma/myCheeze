"use client";

import { useEffect, useState } from "react";
import { Info, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { isFileSystemAccessSupported } from "@/lib/folder-storage";

const DISMISSED_KEY = "stamp-diary-browser-notice-dismissed";

export function BrowserNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if File System Access API is not supported
    if (isFileSystemAccessSupported()) return;

    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed === "true") return;
    } catch {
      // localStorage may be unavailable
    }

    setVisible(true);
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // silent
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-6">
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/15 bg-blue-500/5 px-4 py-3 text-sm dark:border-blue-400/10 dark:bg-blue-400/5">
        <Info
          size={18}
          weight="fill"
          className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400"
        />
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-blue-900/80 dark:text-blue-200/80">
            Your stamps are saved in this browser automatically. For{" "}
            <span className="font-medium">folder sync</span> (saving stamps as
            files on disk), use Chrome or Edge.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDismiss}
          aria-label="Dismiss notice"
          className="shrink-0 text-blue-700 hover:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-400/10"
        >
          <X size={14} weight="bold" />
        </Button>
      </div>
    </div>
  );
}
