export interface ExportPalette {
  bg: string;
  bgAlt: string;
  gridLine: string;
  title: string;
  subtitle: string;
  dayLabel: string;
  dayNum: string;
  dayNumCurrent: string;
  todayBg: string;
  todayBorder: string;
  todayText: string;
  stampShadow: string;
  watermark: string;
  fadedDay: string;
  cellBg: string;
}

export function buildExportPalette(isDark: boolean): ExportPalette {
  if (isDark) {
    return {
      bg: "#1C1C1E",
      bgAlt: "#2C2C2E",
      gridLine: "rgba(255,255,255,0.03)",
      title: "#F5F5F5",
      subtitle: "#888888",
      dayLabel: "#666666",
      dayNum: "#555555",
      dayNumCurrent: "#777777",
      todayBg: "rgba(100,200,130,0.08)",
      todayBorder: "rgba(100,200,130,0.18)",
      todayText: "rgba(110,220,140,0.78)",
      stampShadow: "rgba(0,0,0,0.42)",
      watermark: "rgba(255,255,255,0.045)",
      fadedDay: "#3A3A3A",
      cellBg: "rgba(255,255,255,0.02)",
    };
  }

  return {
    bg: "#FAFAFA",
    bgAlt: "#FFFFFF",
    gridLine: "rgba(0,0,0,0.02)",
    title: "#1A1A1A",
    subtitle: "#AAAAAA",
    dayLabel: "#BBBBBB",
    dayNum: "#CCCCCC",
    dayNumCurrent: "#BBBBBB",
    todayBg: "rgba(80,160,100,0.06)",
    todayBorder: "rgba(80,160,100,0.16)",
    todayText: "rgba(60,130,80,0.68)",
    stampShadow: "rgba(0,0,0,0.18)",
    watermark: "rgba(0,0,0,0.04)",
    fadedDay: "#E0E0E0",
    cellBg: "rgba(0,0,0,0.01)",
  };
}
