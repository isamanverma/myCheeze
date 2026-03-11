"use client";

import { useMemo } from "react";
import { StampCell } from "./stamp-cell";

export type ViewMode = "month" | "week";

interface CalendarGridProps {
  year: number;
  month: number;
  stamps: Map<string, string>;
  onDateClick: (dateStr: string) => void;
  onStampLoadError: (dateStr: string) => void;
  exportMode: boolean;
  viewMode: ViewMode;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getMonthCells(year: number, month: number) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const result: Array<{
    day: number;
    dateStr: string;
    isCurrentMonth: boolean;
  }> = [];

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    result.push({
      day: d,
      dateStr: toDateStr(prevYear, prevMonth, d),
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    result.push({
      day: d,
      dateStr: toDateStr(year, month, d),
      isCurrentMonth: true,
    });
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const totalNeeded = Math.ceil(result.length / 7) * 7;
  const remaining = totalNeeded - result.length;
  for (let d = 1; d <= remaining; d++) {
    result.push({
      day: d,
      dateStr: toDateStr(nextYear, nextMonth, d),
      isCurrentMonth: false,
    });
  }

  return result;
}

function getCurrentWeekCells(
  allCells: Array<{ day: number; dateStr: string; isCurrentMonth: boolean }>,
  todayStr: string,
) {
  const rows: (typeof allCells)[] = [];
  for (let i = 0; i < allCells.length; i += 7) {
    rows.push(allCells.slice(i, i + 7));
  }

  const todayRow = rows.find((row) =>
    row.some((cell) => cell.dateStr === todayStr),
  );
  if (todayRow) return todayRow;

  const firstCurrentRow = rows.find((row) =>
    row.some((cell) => cell.isCurrentMonth),
  );
  return firstCurrentRow || rows[0] || [];
}

export function CalendarGrid({
  year,
  month,
  stamps,
  onDateClick,
  onStampLoadError,
  exportMode,
  viewMode,
}: CalendarGridProps) {
  const today = new Date();
  const todayStr = toDateStr(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );

  const allCells = useMemo(() => getMonthCells(year, month), [year, month]);
  const weekCells = useMemo(
    () => getCurrentWeekCells(allCells, todayStr),
    [allCells, todayStr],
  );

  const rowCount = Math.ceil(allCells.length / 7);

  const dayLabelRow = (
    <div className="grid shrink-0 grid-cols-7">
      {DAY_LABELS.map((label) => (
        <div
          key={label}
          className="flex items-center justify-center py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 sm:py-1.5 sm:text-xs"
        >
          {label}
        </div>
      ))}
    </div>
  );

  if (viewMode === "week") {
    return (
      <div className="w-full">
        {dayLabelRow}
        <div className="grid grid-cols-7 gap-1">
          {weekCells.map((cell) => (
            <StampCell
              key={cell.dateStr}
              day={cell.day}
              dateStr={cell.dateStr}
              stampUrl={stamps.get(cell.dateStr)}
              isToday={cell.dateStr === todayStr}
              isCurrentMonth={cell.isCurrentMonth}
              onClick={() => onDateClick(cell.dateStr)}
              onStampLoadError={onStampLoadError}
              exportMode={exportMode}
              variant="strip"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      {dayLabelRow}
      {/*
        Use inline grid-template-rows so that all rows (5 or 6) share
        the available height equally.  No cell uses aspect-square —
        each cell simply fills whatever height the row provides.
      */}
      <div
        className="grid min-h-0 flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
      >
        {allCells.map((cell) => (
          <StampCell
            key={cell.dateStr}
            day={cell.day}
            dateStr={cell.dateStr}
            stampUrl={stamps.get(cell.dateStr)}
            isToday={cell.dateStr === todayStr}
            isCurrentMonth={cell.isCurrentMonth}
            onClick={() => onDateClick(cell.dateStr)}
            onStampLoadError={onStampLoadError}
            exportMode={exportMode}
            variant="grid"
          />
        ))}
      </div>
    </div>
  );
}
