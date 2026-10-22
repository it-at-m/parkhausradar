import type { GarageStatus } from "@/util/garageStatus";

export const enum STATUS_INDICATORS {
  SUCCESS = "success",
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
}

// Language independent symbol for parking, so it is not translated
export const PARKING_SYMBOL = "P";

interface GarageStatusColors {
  /** Fill of the marker and the progress bar */
  background: string;
  /** Text on the background */
  foreground: string;
  /** Parking symbol on the white circle of the marker */
  symbol: string;
  /** Text on light and dark surfaces */
  textLight: string;
  textDark: string;
}

// Every text color has a contrast of at least 4.5:1 (WCAG AA) against its background
export const GARAGE_STATUS_COLORS: Record<GarageStatus, GarageStatusColors> = {
  free: {
    background: "#1a7f37",
    foreground: "#ffffff",
    symbol: "#1a7f37",
    textLight: "#1a7f37",
    textDark: "#57c27a",
  },
  limited: {
    background: "#f2b705",
    foreground: "#3d2e00",
    symbol: "#3d2e00",
    textLight: "#8a6100",
    textDark: "#f2b705",
  },
  full: {
    background: "#c62828",
    foreground: "#ffffff",
    symbol: "#c62828",
    textLight: "#c62828",
    textDark: "#ff6b6b",
  },
  unknown: {
    background: "#6b7280",
    foreground: "#ffffff",
    symbol: "#6b7280",
    textLight: "#5f6368",
    textDark: "#9aa0a6",
  },
};
