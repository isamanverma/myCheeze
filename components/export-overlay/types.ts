export type ExportView = "month" | "week";

export interface ExportPreset {
  label: string;
  description: string;
  width: number;
  height: number;
}

export interface CalendarCell {
  day: number;
  dateStr: string;
  isCurrentMonth: boolean;
}

export interface ExportOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  stamps: Map<string, string>;
  isDark: boolean;
}
