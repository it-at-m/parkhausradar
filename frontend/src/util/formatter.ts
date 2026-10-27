export function toFirstLetterUppercase(text: string): string {
  return text ? text[0]?.toUpperCase() + text.slice(1).toLowerCase() : "";
}

export function toDateString(date: Date): string {
  return date ? date.toLocaleDateString() : "";
}

export function toTimeString(date: Date): string {
  return date ? date.toLocaleTimeString() : "";
}

export function toDateAndTimeString(date: Date): string {
  return date ? date.toLocaleString() : "";
}

export function toPercentString(share: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(share);
}

/**
 * Describes how long ago a date was, e.g. "vor 2 Min." in German.
 * Dates in the future count as now, they are caused by clocks that differ slightly.
 */
export function toRelativeTimeString(
  date: Date,
  now: Date,
  locale: string
): string {
  const format = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
    style: "short",
  });
  const minutes = Math.min(
    0,
    Math.round((date.getTime() - now.getTime()) / 60_000)
  );
  if (Math.abs(minutes) < 60) {
    return format.format(minutes, "minute");
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return format.format(hours, "hour");
  }
  return format.format(Math.round(hours / 24), "day");
}
