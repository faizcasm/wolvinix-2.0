import type { NextFunction, Request, RequestHandler, Response } from "express";
import multer from "multer";
import { resourceTypeFromMime, uploadBuffer } from "../../config/cloudinary.js";
import { ApiError } from "../../lib/errors.js";
import { created } from "../../lib/response.js";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(
        ApiError.validation("Unsupported file type", {
          file: `Allowed: ${[...ALLOWED_MIME_TYPES].join(", ")}`,
        }),
      );
      return;
    }
    callback(null, true);
  },
});

/** multipart/form-data with field `file`; errors flow into the error handler. */
export const uploadSingle: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }
    next();
  });
};

export async function uploadMedia(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file)
    throw ApiError.validation("Attach a file using the `file` field", { file: "Required" });

  const resourceType = resourceTypeFromMime(file.mimetype);
  if (!resourceType)
    throw ApiError.validation("Unsupported file type", { file: "Unsupported media type" });

  const asset = await uploadBuffer(file.buffer, { folder: "wolvinix", resourceType });

  created(res, {
    url: asset.url,
    publicId: asset.publicId,
    resourceType: asset.resourceType,
  });
}
