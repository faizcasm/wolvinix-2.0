import { format, isToday, isYesterday } from "date-fns";

/** Divider label shown between message groups. */
export function dayLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, d MMM yyyy");
}

/** Small clock label under a bubble. */
export function clockLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "HH:mm");
}

/** Compact timestamp used in the conversation list. */
export function previewTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yest.";
  return format(date, "d MMM");
}

/** "Photo" placeholder so image-only messages still read well in previews. */
export function previewText(text?: string, imageUrl?: string): string {
  if (text && text.trim()) return text;
  if (imageUrl) return "Sent a photo";
  return "";
}
