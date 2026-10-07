import type { Request, Response } from "express";
import { destroyPublic, fetchDurationSeconds, publicIdFromUrl } from "../../config/cloudinary.js";
import { ApiError } from "../../lib/errors.js";
import { toId } from "../../lib/format.js";
import { created, ok } from "../../lib/response.js";
import {
  STORY_POPULATE,
  Story,
  toStoryJson,
  STORY_TTL_MS,
  type StoryJson,
} from "../../models/story.js";
import { toSafeUser } from "../../models/user.js";
import { notify } from "../notifications/service.js";

export const MAX_STORY_VIDEO_SECONDS = 30;

interface CreateStoryInput {
  mediaUrl: string;
  mediaType: "image" | "video";
}

/** Active stories for me + grouped stories for the people I follow. */
export async function listStories(req: Request, res: Response): Promise<void> {
  const now = new Date();
  const meId = req.user._id;
  const following = (req.user.following ?? []).map((id: unknown) => String(id));

  const [mine, followed] = await Promise.all([
    Story.find({ user: meId, expiresAt: { $gt: now } })
      .populate(STORY_POPULATE)
      .sort({ createdAt: -1 }),
    Story.find({ user: { $in: following }, expiresAt: { $gt: now } })
      .populate(STORY_POPULATE)
      .sort({ createdAt: 1 }),
  ]);

  const grouped = new Map<string, { user: unknown; stories: StoryJson[] }>();
  for (const story of followed) {
    const raw = story as unknown as { user?: unknown };
    const author = raw.user;
    const authorId = toId(author);
    if (!authorId) continue;
    const bucket = grouped.get(authorId) ?? { user: author, stories: [] };
    bucket.stories.push(toStoryJson(story, meId));
    grouped.set(authorId, bucket);
  }

  ok(res, {
    mine: mine.map((story) => toStoryJson(story, meId)),
    groups: [...grouped.values()].map((group) => ({
      user: toSafeUser(group.user),
      stories: group.stories,
    })),
  });
}

export async function createStory(req: Request, res: Response): Promise<void> {
  const { mediaUrl, mediaType } = req.body as CreateStoryInput;
  const meId = String(req.user._id);
  const type: "image" | "video" = mediaType === "video" ? "video" : "image";
  const publicId = publicIdFromUrl(mediaUrl);

  if (type === "video" && publicId) {
    const duration = await fetchDurationSeconds(publicId, "video");
    if (duration !== null && duration > MAX_STORY_VIDEO_SECONDS) {
      await destroyPublic(publicId, "video");
      throw ApiError.validation(
        `Story videos must be ${MAX_STORY_VIDEO_SECONDS} seconds or shorter`,
      );
    }
  }

  const story = await Story.create({
    user: meId,
    mediaUrl,
    mediaType: type,
    mediaPublicId: publicId ?? "",
    expiresAt: new Date(Date.now() + STORY_TTL_MS),
  });
  await story.populate(STORY_POPULATE);

  created(res, toStoryJson(story, meId));
}

/** Idempotent: adding the same viewer twice is a no-op. */
export async function viewStory(req: Request, res: Response): Promise<void> {
  const story = await Story.findOneAndUpdate(
    { _id: req.params.id },
    { $addToSet: { viewers: req.user._id } },
    { new: true },
  ).select("viewers");
  if (!story) throw ApiError.notFound("Story not found");

  ok(res, { ok: true, viewersCount: story.viewers.length });
}

export async function toggleStoryLike(req: Request, res: Response): Promise<void> {
  const meId = String(req.user._id);

  const liked = await Story.findOneAndUpdate(
    { _id: req.params.id, likes: { $ne: meId } },
    { $addToSet: { likes: meId } },
    { new: true },
  ).select("user likes");

  if (liked) {
    await notify({
      recipient: toId(liked.user),
      sender: meId,
      type: "story",
      message: `${req.user.username} liked your story`,
    });
    ok(res, { liked: true, likesCount: liked.likes.length });
    return;
  }

  const unliked = await Story.findByIdAndUpdate(
    req.params.id,
    { $pull: { likes: meId } },
    { new: true },
  ).select("likes user");
  if (!unliked) throw ApiError.notFound("Story not found");
  ok(res, { liked: false, likesCount: unliked.likes.length });
}

export async function deleteStory(req: Request, res: Response): Promise<void> {
  const story = await Story.findById(req.params.id).select("user mediaUrl mediaPublicId mediaType");
  if (!story) throw ApiError.notFound("Story not found");

  if (toId(story.user) !== String(req.user._id)) {
    throw ApiError.forbidden("You can only delete your own stories");
  }

  await destroyPublic(
    story.mediaPublicId || publicIdFromUrl(story.mediaUrl),
    story.mediaType === "video" ? "video" : "image",
  );
  await Story.deleteOne({ _id: story._id });

  ok(res, { ok: true });
}
