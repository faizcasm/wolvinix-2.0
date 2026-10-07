/** Small helpers shared by the three creator tools — all run on-device. */

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif";
export const PDF_ACCEPT = "application/pdf,.pdf";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Extension-less file name, lowercased, safe to build an output name from. */
export function baseName(name: string): string {
  const trimmed = name.trim().replace(/\.[^.]+$/, "");
  return trimmed || "wolvinix";
}

/** Guarantees a single trailing extension on a user-provided file name. */
export function withExtension(name: string, extension: string): string {
  const clean = name.trim().replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80) || "wolvinix";
  const pattern = new RegExp(`\\.${extension}$`, "i");
  return pattern.test(clean) ? clean : `${clean}.${extension}`;
}

/** Matches a file against an `accept` attribute value (types, wildcards, .ext). */
export function matchesAccept(file: File, accept?: string): boolean {
  if (!accept) return true;
  const tokens = accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) return file.name.toLowerCase().endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Couldn't read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image couldn't be decoded by your browser"));
    image.src = src;
  });
}

/** Draws an image through a canvas so any format becomes JPEG/PNG data. */
export function toJpegDataUrl(image: HTMLImageElement, quality = 0.92): string {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable in this browser");
  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

export async function copyText(value: string): Promise<boolean> {
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
