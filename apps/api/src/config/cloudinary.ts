import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { getEnv } from "./env.js";
import { ApiError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export interface UploadedAsset {
  url: string;
  publicId: string;
  resourceType: "image" | "video";
}

type UploadableResourceType = "image" | "video";

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  const env = getEnv();
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw ApiError.internal(
      "Cloudinary is not configured (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET)",
    );
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

export function resourceTypeFromMime(mime: string): UploadableResourceType | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return null;
}

/** Streams a raw buffer into the shared `wolvinix/` Cloudinary folder. */
export async function uploadBuffer(
  buffer: Buffer,
  options: { folder?: string; resourceType?: UploadableResourceType } = {},
): Promise<UploadedAsset> {
  ensureConfigured();
  const resourceType: UploadableResourceType = options.resourceType ?? "image";
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? "wolvinix",
        resource_type: resourceType,
        unique_filename: true,
        overwrite: false,
      },
      (error, uploaded) => {
        if (error || !uploaded) reject(error ?? new Error("Empty Cloudinary response"));
        else resolve(uploaded);
      },
    );
    stream.end(buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: (result.resource_type === "video" ? "video" : "image") as UploadableResourceType,
  };
}

/** Reads video metadata (duration in seconds); `null` when unavailable. */
export async function fetchDurationSeconds(
  publicId: string,
  resourceType: "image" | "video" = "video",
): Promise<number | null> {
  try {
    ensureConfigured();
    const resource = await cloudinary.api.resource(publicId, { resource_type: resourceType });
    return typeof resource.duration === "number" ? resource.duration : null;
  } catch (error) {
    logger.warn({ err: error, publicId }, "could not read cloudinary asset metadata");
    return null;
  }
}

/** Best-effort asset cleanup — failures are logged, never thrown. */ export async function destroyPublic(
  publicId: string | null | undefined,
  resourceType: UploadableResourceType = "image",
): Promise<void> {
  if (!publicId) return;
  try {
    ensureConfigured();
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    logger.debug({ publicId, result }, "cloudinary asset destroyed");
  } catch (error) {
    logger.warn({ err: error, publicId }, "failed to destroy cloudinary asset");
  }
}

/**
 * Derives a Cloudinary `public_id` from a delivery URL, e.g.
 * `https://res.cloudinary.com/x/image/upload/v1/wolvinix/abc.jpg` → `wolvinix/abc`.
 * Used as a fallback when a document predates the `*PublicId` columns.
 */
export function publicIdFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const marker = "/upload/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;

  const path = url
    .slice(markerIndex + marker.length)
    .split("?")[0]
    .split("#")[0];
  if (!path) return null;

  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  // drop the version segment (`v1712345678`)
  if (/^v\d+$/.test(segments[0])) segments.shift();
  // drop transformation segments (`w_200,h_200`, `c_fill`, ...)
  while (segments.length > 1 && /^[a-z]{1,3}_[^/]+$/.test(segments[0])) segments.shift();

  if (segments.length === 0) return null;

  const last = segments[segments.length - 1];
  const withoutExtension = last.replace(/\.[a-z0-9]+$/i, "");
  segments[segments.length - 1] = withoutExtension;

  const publicId = segments.join("/");
  return publicId || null;
}

/** Resolves the asset id to delete: explicit column first, URL fallback second. */
export function resolvePublicId(
  stored: string | undefined | null,
  url: string | undefined | null,
): string | null {
  return stored || publicIdFromUrl(url);
}

export function isCloudinaryConfigured(): boolean {
  try {
    const env = getEnv();
    return Boolean(
      env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
    );
  } catch {
    return false;
  }
}
