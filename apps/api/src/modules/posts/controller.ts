import type { Request, Response } from "express";
import { publicIdFromUrl, destroyPublic } from "../../config/cloudinary.js";
import { ApiError } from "../../lib/errors.js";
import { extractHashtags, normalizeHashtag } from "../../lib/hashtags.js";
import { parsePagination } from "../../lib/pagination.js";
import { created, ok, paginated } from "../../lib/response.js";
import { toId } from "../../lib/format.js";
import { POST_POPULATE, Post, toPostJson } from "../../models/post.js";
import { User } from "../../models/user.js";
import { notify } from "../notifications/service.js";
import type { CreatePostInput, UpdatePostInput } from "./schemas.js";

const EXPLORE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function loadPost(id: string) {
  const post = await Post.findById(id).populate(POST_POPULATE);
  if (!post) throw ApiError.notFound("Post not found");
  return post;
}

function assertOwner(ownerId: unknown, userId: unknown, action: "edit" | "delete"): void {
  if (toId(ownerId) !== toId(userId)) {
    throw ApiError.forbidden(`You can only ${action} your own posts`);
  }
}

async function listPaginated(
  req: Request,
  res: Response,
  filter: Record<string, unknown>,
): Promise<void> {
  const { page, limit, skip } = parsePagination(req);
  const [total, posts] = await Promise.all([
    Post.countDocuments(filter),
    Post.find(filter).populate(POST_POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);
  paginated(
    res,
    posts.map((post) => toPostJson(post)),
    total,
    page,
    limit,
  );
}

// ---------------------------------------------------------------- reads

export async function feed(req: Request, res: Response): Promise<void> {
  const following = (req.user.following ?? []).map((id: unknown) => String(id));
  const authors = [String(req.user._id), ...following];
  await listPaginated(req, res, { postedBy: { $in: authors } });
}

/**
 * Explore ranking — `likes + 2 * replies` decayed by age, mirrored from
 * `lib/scoring.ts#computeEngagementScore`.
 */
export async function explore(req: Request, res: Response): Promise<void> {
  const { page, limit, skip } = parsePagination(req);
  const now = Date.now();
  const cutoff = new Date(now - EXPLORE_WINDOW_MS);

  const [rows, total] = await Promise.all([
    Post.aggregate([
      { $match: { createdAt: { $gte: cutoff } } },
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ["$likes", []] } },
          repliesCount: { $size: { $ifNull: ["$replies", []] } },
          // `now` must be a Date — a JS number makes Mongo refuse
          // `$subtract` ("can't $subtract date from double").
          ageHours: {
            $max: [0, { $divide: [{ $subtract: [new Date(now), "$createdAt"] }, 3_600_000] }],
          },
        },
      },
      {
        $addFields: {
          engagement: { $add: ["$likesCount", { $multiply: [2, "$repliesCount"] }] },
          decay: { $pow: [{ $add: ["$ageHours", 2] }, 1.4] },
        },
      },
      { $addFields: { score: { $divide: ["$engagement", "$decay"] } } },
      { $sort: { score: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]),
    Post.countDocuments({ createdAt: { $gte: cutoff } }),
  ]);

  await Post.populate(rows, POST_POPULATE);
  paginated(
    res,
    rows.map((row) => toPostJson(row)),
    total,
    page,
    limit,
  );
}

export async function bookmarks(req: Request, res: Response): Promise<void> {
  await listPaginated(req, res, { bookmarks: req.user._id });
}

export async function byHashtag(req: Request, res: Response): Promise<void> {
  const tag = normalizeHashtag(req.params.tag);
  if (!tag) throw ApiError.validation("Invalid hashtag", { tag: "Not a valid hashtag" });
  await listPaginated(req, res, { hashtags: tag });
}

export async function trendingHashtags(req: Request, res: Response): Promise<void> {
  const { page, limit, skip } = parsePagination(req);
  const [result] = await Post.aggregate([
    { $match: { hashtags: { $exists: true, $ne: [] } } },
    { $unwind: "$hashtags" },
    { $group: { _id: "$hashtags", count: { $sum: 1 }, lastAt: { $max: "$createdAt" } } },
    {
      $facet: {
        rows: [
          { $sort: { count: -1, lastAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: { _id: 0, tag: "$_id", count: 1 } },
        ],
        total: [{ $count: "value" }],
      },
    },
  ]);

  const tags = result?.rows ?? [];
  const total = result?.total?.[0]?.value ?? 0;
  paginated(res, tags, total, page, limit);
}

async function userPosts(
  req: Request,
  res: Response,
  filterName: "postedBy" | "tags",
): Promise<void> {
  const username = String(req.params.username).toLowerCase();
  const user = await User.findOne({ username }).select("_id");
  if (!user) throw ApiError.notFound("User not found");
  await listPaginated(req, res, { [filterName]: user._id });
}

export async function postsByUser(req: Request, res: Response): Promise<void> {
  await userPosts(req, res, "postedBy");
}

export async function postsTaggedIn(req: Request, res: Response): Promise<void> {
  await userPosts(req, res, "tags");
}

export async function getPost(req: Request, res: Response): Promise<void> {
  const post = await loadPost(req.params.id);
  ok(res, toPostJson(post));
}

// --------------------------------------------------------------- writes

export async function createPost(req: Request, res: Response): Promise<void> {
  const { text, mediaUrl, mediaType, tags } = req.body as CreatePostInput;
  const meId = String(req.user._id);

  const hashtags = extractHashtags(text);

  let validTags: string[] = [];
  if (tags?.length) {
    const found = await User.find({ _id: { $in: tags } }).select("_id");
    validTags = found.map((user) => String(user._id)).filter((id) => id !== meId);
  }

  const post = await Post.create({
    postedBy: meId,
    text,
    mediaUrl: mediaUrl ?? "",
    mediaType: mediaUrl ? (mediaType === "video" ? "video" : "image") : "none",
    mediaPublicId: publicIdFromUrl(mediaUrl) ?? "",
    tags: validTags,
    hashtags,
  });

  await post.populate(POST_POPULATE);

  for (const tagId of validTags) {
    await notify({
      recipient: tagId,
      sender: meId,
      type: "tag",
      message: `${req.user.username} tagged you in a post`,
      post: String(post._id),
    });
  }

  created(res, toPostJson(post));
}

export async function updatePost(req: Request, res: Response): Promise<void> {
  const patch = req.body as UpdatePostInput;
  const post = await loadPost(req.params.id);
  assertOwner(post.postedBy, req.user._id, "edit");

  if (patch.text !== undefined) {
    post.text = patch.text;
    post.hashtags = extractHashtags(patch.text);
  }
  if (patch.mediaUrl !== undefined) {
    if (post.mediaUrl && post.mediaUrl !== patch.mediaUrl) {
      await destroyPublic(
        post.mediaPublicId || publicIdFromUrl(post.mediaUrl),
        post.mediaType === "video" ? "video" : "image",
      );
    }
    post.mediaUrl = patch.mediaUrl;
    post.mediaPublicId = publicIdFromUrl(patch.mediaUrl) ?? "";
    post.mediaType = patch.mediaType === "video" ? "video" : patch.mediaUrl ? "image" : "none";
  }

  await post.save();
  await post.populate(POST_POPULATE);
  ok(res, toPostJson(post));
}

export async function deletePost(req: Request, res: Response): Promise<void> {
  const post = await Post.findById(req.params.id).select(
    "postedBy mediaUrl mediaPublicId mediaType",
  );
  if (!post) throw ApiError.notFound("Post not found");
  assertOwner(post.postedBy, req.user._id, "delete");

  // Destroy the Cloudinary asset BEFORE dropping the row that points at it.
  if (post.mediaUrl || post.mediaPublicId) {
    await destroyPublic(
      post.mediaPublicId || publicIdFromUrl(post.mediaUrl),
      post.mediaType === "video" ? "video" : "image",
    );
  }

  await Post.deleteOne({ _id: post._id });
  ok(res, { ok: true });
}

export async function toggleLike(req: Request, res: Response): Promise<void> {
  const meId = String(req.user._id);

  const liked = await Post.findOneAndUpdate(
    { _id: req.params.id, likes: { $ne: meId } },
    { $addToSet: { likes: meId } },
    { new: true },
  ).select("postedBy likes");

  if (liked) {
    await notify({
      recipient: toId(liked.postedBy),
      sender: meId,
      type: "like",
      message: `${req.user.username} liked your post`,
      post: String(liked._id),
    });
    ok(res, { liked: true, likesCount: liked.likes.length });
    return;
  }

  const unliked = await Post.findByIdAndUpdate(
    req.params.id,
    { $pull: { likes: meId } },
    { new: true },
  ).select("likes");
  if (!unliked) throw ApiError.notFound("Post not found");
  ok(res, { liked: false, likesCount: unliked.likes.length });
}

export async function toggleBookmark(req: Request, res: Response): Promise<void> {
  const meId = String(req.user._id);

  const saved = await Post.findOneAndUpdate(
    { _id: req.params.id, bookmarks: { $ne: meId } },
    { $addToSet: { bookmarks: meId } },
    { new: true },
  ).select("bookmarks");

  if (saved) {
    ok(res, { bookmarked: true, bookmarksCount: saved.bookmarks.length });
    return;
  }

  const removed = await Post.findByIdAndUpdate(
    req.params.id,
    { $pull: { bookmarks: meId } },
    { new: true },
  ).select("bookmarks");
  if (!removed) throw ApiError.notFound("Post not found");
  ok(res, { bookmarked: false, bookmarksCount: removed.bookmarks.length });
}

// -------------------------------------------------------------- replies

function replyJson(reply: any): { _id: string; user: unknown; text: string; createdAt: string } {
  return {
    _id: String(reply._id),
    user: reply.user,
    text: String(reply.text ?? ""),
    createdAt: new Date(reply.createdAt).toISOString(),
  };
}

export async function addReply(req: Request, res: Response): Promise<void> {
  const { text } = req.body as { text: string };
  const post = await loadPost(req.params.id);

  post.replies.push({ user: req.user._id, text });
  await post.save();
  await post.populate(POST_POPULATE);

  const replies = post.replies as any[];
  const reply = replies[replies.length - 1];

  await notify({
    recipient: toId(post.postedBy),
    sender: String(req.user._id),
    type: "reply",
    message: `${req.user.username} replied to your post`,
    post: String(post._id),
  });

  created(res, replyJson(reply));
}

async function loadOwnedReply(req: Request) {
  const post = await Post.findById(req.params.id);
  if (!post) throw ApiError.notFound("Post not found");

  const reply = (post.replies as any[]).find(
    (entry) => String(entry._id) === String(req.params.replyId),
  );
  if (!reply) throw ApiError.notFound("Reply not found");
  if (String(reply.user) !== String(req.user._id)) {
    throw ApiError.forbidden("You can only edit your own replies");
  }
  return { post, reply };
}

export async function updateReply(req: Request, res: Response): Promise<void> {
  const { text } = req.body as { text: string };
  const { post, reply } = await loadOwnedReply(req);

  reply.text = text;
  await post.save();
  await post.populate(POST_POPULATE);

  const replies = post.replies as any[];
  const updated = replies.find((entry) => String(entry._id) === String(reply._id));
  ok(res, replyJson(updated ?? reply));
}

export async function deleteReply(req: Request, res: Response): Promise<void> {
  const { post, reply } = await loadOwnedReply(req);
  post.replies.pull(reply._id);
  await post.save();
  ok(res, { ok: true });
}
