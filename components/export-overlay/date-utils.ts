import type { CalendarCell } from "./types";

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function seededRotation(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return (hash % 600) / 100 - 3;
}

export function buildMonthCells(year: number, month: number): CalendarCell[] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const cells: CalendarCell[] = [];

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrev = getDaysInMonth(prevYear, prevMonth);

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    cells.push({
      day: d,
      dateStr: toDateStr(prevYear, prevMonth, d),
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      dateStr: toDateStr(year, month, d),
      isCurrentMonth: true,
    });
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  while (cells.length % 7 !== 0) {
    const d = cells.length - (daysInMonth + firstDay) + 1;
    cells.push({
      day: d,
      dateStr: toDateStr(nextYear, nextMonth, d),
      isCurrentMonth: false,
    });
  }

  return cells;
}

export function getCurrentWeekCells(
  monthCells: CalendarCell[],
  todayStr: string,
): CalendarCell[] {
  const rows: CalendarCell[][] = [];
  for (let i = 0; i < monthCells.length; i += 7) {
    rows.push(monthCells.slice(i, i + 7));
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

export function formatDateRange(
  startDateStr: string,
  endDateStr: string,
): string {
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);

  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${start.toLocaleString("en-US", { month: "long" })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
  }

  return `${start.toLocaleString("en-US", { month: "short" })} ${start.getDate()} – ${end.toLocaleString("en-US", { month: "short" })} ${end.getDate()}, ${end.getFullYear()}`;
}
