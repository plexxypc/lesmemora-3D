/**
 * Format an ISO date (YYYY-MM-DD) for exhibit captions.
 * Parsed as UTC so the calendar day does not shift with the timezone.
 *
 * @param iso_date - Calendar date in `YYYY-MM-DD` form.
 * @returns A long English date, or the original string when it is not ISO.
 */
export function format_exhibit_date(iso_date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso_date);
  if (!match) {
    return iso_date;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
