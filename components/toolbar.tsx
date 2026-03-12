"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Export,
  Moon,
  Rows,
  Sun,
} from "@phosphor-icons/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export type ViewMode = "month" | "week";

interface ToolbarProps {
  year: number;
  month: number;
  viewMode: ViewMode;
  isDark: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onExport: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleTheme: () => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function Toolbar({
  year,
  month,
  viewMode,
  isDark,
  onPrevMonth,
  onNextMonth,
  onToday,
  onExport,
  onViewModeChange,
  onToggleTheme,
}: ToolbarProps) {
  const now = new Date();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="relative flex w-full items-center justify-between py-2.5 sm:py-3">
      {/* Left: Month navigation */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrevMonth}
          aria-label="Previous month (Left arrow)"
        >
          <CaretLeft size={20} weight="bold" />
        </Button>

        <button
          type="button"
          onClick={onToday}
          className="flex items-baseline gap-1 rounded-xl px-2 py-1 transition-colors hover:bg-muted sm:gap-2.5 sm:px-4 sm:py-1.5"
        >
          <span className="text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
            {MONTH_NAMES[month - 1]}
          </span>
          <span className="text-sm font-normal text-muted-foreground sm:text-base">
            {year}
          </span>
        </button>

        <Button
          variant="outline"
          size="icon"
          onClick={onNextMonth}
          aria-label="Next month (Right arrow)"
        >
          <CaretRight size={20} weight="bold" />
        </Button>

        {!isCurrentMonth && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToday}
            className="ml-1 hidden text-xs text-muted-foreground sm:inline-flex"
          >
            Today
          </Button>
        )}
      </div>

      {/* Center: Logo + Wordmark — hidden on mobile to avoid overlap */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden items-center gap-2 sm:flex">
        <Image
          src="/icon.png"
          alt="Cheeze logo"
          width={28}
          height={28}
          className="h-7 w-7 rounded-lg object-contain"
          priority
        />
        <span className="text-base font-semibold tracking-tight text-foreground">
          Cheeze
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* View toggle */}
        <div className="flex items-center rounded-xl bg-muted p-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onViewModeChange("month")}
            aria-label="Monthly view"
            className={
              viewMode === "month"
                ? "bg-card shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:bg-transparent"
            }
          >
            <CalendarBlank
              size={16}
              weight={viewMode === "month" ? "fill" : "regular"}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onViewModeChange("week")}
            aria-label="Weekly view"
            className={
              viewMode === "week"
                ? "bg-card shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:bg-transparent"
            }
          >
            <Rows size={16} weight={viewMode === "week" ? "fill" : "regular"} />
          </Button>
        </div>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleTheme}
          aria-label={
            isDark ? "Switch to light mode (D)" : "Switch to dark mode (D)"
          }
        >
          {isDark ? (
            <Sun size={16} weight="bold" />
          ) : (
            <Moon size={16} weight="bold" />
          )}
        </Button>

        {/* Export — hidden on mobile */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="hidden gap-1.5 sm:inline-flex"
        >
          <Export size={16} weight="bold" />
          <span className="hidden sm:inline">Export</span>
        </Button>

        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button variant="outline" size="sm">
              Sign in
            </Button>
          </SignInButton>
        </Show>

        <Show when="signed-in">
          <div className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-1 ring-border">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          </div>
        </Show>
      </div>
    </div>
  );
}
