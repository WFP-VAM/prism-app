export function setNoon(date: string): string {
  return `${date.split("T")[0]}T12:00:00Z`;
}

export const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
