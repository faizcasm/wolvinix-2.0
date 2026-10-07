import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { destroyPublic, publicIdFromUrl } from "../../config/cloudinary.js";
import { getEnv } from "../../config/env.js";
import { ApiError } from "../../lib/errors.js";
import { isMailConfigured, sendMail } from "../../lib/mail.js";
import { parsePagination } from "../../lib/pagination.js";
import { escapeRegExp } from "../../lib/regex.js";
import { ok, paginated } from "../../lib/response.js";
import { clearAuthCookie } from "../../lib/token.js";
import { Clan, toClanJson } from "../../models/clan.js";
import { Conversation } from "../../models/conversation.js";
import { Message } from "../../models/message.js";
import { Notification } from "../../models/notification.js";
import { Post } from "../../models/post.js";
import { Review } from "../../models/review.js";
import { Stat } from "../../models/stat.js";
import { Story } from "../../models/story.js";
import { SAFE_USER_FIELDS, SAFE_USER_PROJECT, toSafeUser, User } from "../../models/user.js";
import { notify } from "../notifications/service.js";
import type { ContactInput, UpdateMeInput } from "./schemas.js";

const BCRYPT_ROUNDS = 10;

export async function getMe(req: Request, res: Response): Promise<void> {
  ok(res, { user: toSafeUser(req.user) });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const patch = req.body as UpdateMeInput;
  const user = await User.findById(req.user._id).select("+password");
  if (!user) throw ApiError.unauthorized("Your session is no longer valid");

  if (patch.username && patch.username !== user.username) {
    const taken = await User.findOne({ username: patch.username }).select("_id");
    if (taken) throw ApiError.conflict("That username is already taken");
  }

  if (patch.password) {
    user.password = await bcrypt.hash(patch.password, BCRYPT_ROUNDS);
  }
  if (patch.name !== undefined) user.name = patch.name;
  if (patch.username !== undefined) user.username = patch.username;
  if (patch.bio !== undefined) user.bio = patch.bio;
  if (patch.profilePic !== undefined && patch.profilePic !== user.profilePic) {
    if (user.profilePicPublicId) await destroyPublic(user.profilePicPublicId, "image");
    user.profilePic = patch.profilePic;
    user.profilePicPublicId = publicIdFromUrl(patch.profilePic) ?? "";
  }

  await user.save();
  ok(res, { user: toSafeUser(user) });
}

/**
 * Cascading self-delete: posts (+ their media), stories, replies, likes,
 * bookmarks, tags, messages, conversations, notifications, stats, reviews,
 * clan memberships, follow graph — then the account itself and the cookie.
 */
export async function deleteMe(req: Request, res: Response): Promise<void> {
  const userId = req.user._id;
  const mediaCleanup: Array<Promise<void>> = [];

  const posts = await Post.find({ postedBy: userId })
    .select("mediaUrl mediaPublicId mediaType")
    .lean();
  for (const post of posts) {
    if (post.mediaUrl || post.mediaPublicId) {
      mediaCleanup.push(
        destroyPublic(
          post.mediaPublicId || publicIdFromUrl(post.mediaUrl),
          post.mediaType === "video" ? "video" : "image",
        ),
      );
    }
  }
  await Post.deleteMany({ postedBy: userId });
  await Post.updateMany({ "replies.user": userId }, { $pull: { replies: { user: userId } } });
  await Post.updateMany({ likes: userId }, { $pull: { likes: userId } });
  await Post.updateMany({ bookmarks: userId }, { $pull: { bookmarks: userId } });
  await Post.updateMany({ tags: userId }, { $pull: { tags: userId } });

  const stories = await Story.find({ user: userId })
    .select("mediaUrl mediaPublicId mediaType")
    .lean();
  for (const story of stories) {
    mediaCleanup.push(
      destroyPublic(
        story.mediaPublicId || publicIdFromUrl(story.mediaUrl),
        story.mediaType === "video" ? "video" : "image",
      ),
    );
  }
  await Story.deleteMany({ user: userId });

  const conversations = await Conversation.find({ participants: userId }).select("_id").lean();
  const conversationIds = conversations.map((conversation) => conversation._id);
  if (conversationIds.length) {
    await Message.deleteMany({ conversationId: { $in: conversationIds } });
    await Conversation.deleteMany({ _id: { $in: conversationIds } });
  }

  await Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] });
  await Stat.deleteMany({ userId });
  await Review.deleteMany({ user: userId });

  const myClans = await Clan.find({ members: userId }).select("members leader").lean();
  for (const clan of myClans) {
    const memberIds = clan.members.map((member) => String(member));
    const isLeader = String(clan.leader) === String(userId);
    if (isLeader && memberIds.length > 1) {
      const nextLeader = memberIds.find((id) => id !== String(userId));
      if (nextLeader) await Clan.updateOne({ _id: clan._id }, { $set: { leader: nextLeader } });
    } else if (isLeader) {
      await Clan.deleteOne({ _id: clan._id });
      continue;
    }
    await Clan.updateOne({ _id: clan._id }, { $pull: { members: userId } });
  }

  await User.updateMany({ followers: userId }, { $pull: { followers: userId } });
  await User.updateMany({ following: userId }, { $pull: { following: userId } });

  const me = await User.findById(userId).select("profilePic profilePicPublicId");
  if (me?.profilePic)
    mediaCleanup.push(
      destroyPublic(me.profilePicPublicId || publicIdFromUrl(me.profilePic), "image"),
    );

  await User.deleteOne({ _id: userId });
  await Promise.allSettled(mediaCleanup);

  clearAuthCookie(res);
  ok(res, { ok: true });
}

export async function toggleFreeze(req: Request, res: Response): Promise<void> {
  const { frozen } = req.body as { frozen: boolean };
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { isFrozen: frozen } },
    { new: true },
  ).select(SAFE_USER_FIELDS);
  if (!user) throw ApiError.unauthorized("Your session is no longer valid");
  ok(res, { frozen: user.isFrozen, user: toSafeUser(user) });
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  const username = String(req.params.username).toLowerCase();
  const user = await User.findOne({ username }).select(SAFE_USER_FIELDS);
  if (!user) throw ApiError.notFound("User not found");

  const postCount = await Post.countDocuments({ postedBy: user._id });
  const isFollowing = (req.user?.following ?? []).some(
    (id: unknown) => String(id) === String(user._id),
  );

  ok(res, { user: toSafeUser(user), postCount, isFollowing });
}

async function listConnections(
  req: Request,
  res: Response,
  field: "followers" | "following",
): Promise<void> {
  const target = await User.findById(req.params.id).select("followers following");
  if (!target) throw ApiError.notFound("User not found");

  const ids = (target[field] ?? []).map((id: unknown) => String(id));
  const { page, limit, skip } = parsePagination(req);
  const filter = { _id: { $in: ids } };

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).select(SAFE_USER_FIELDS).sort({ username: 1 }).skip(skip).limit(limit),
  ]);

  paginated(
    res,
    users.map((user) => toSafeUser(user)),
    total,
    page,
    limit,
  );
}

export async function getFollowers(req: Request, res: Response): Promise<void> {
  await listConnections(req, res, "followers");
}

export async function getFollowing(req: Request, res: Response): Promise<void> {
  await listConnections(req, res, "following");
}

/** Atomic follow/unfollow: `$addToSet` / `$pull`, never read-modify-write. */
export async function toggleFollow(req: Request, res: Response): Promise<void> {
  const targetId = String(req.params.id);
  const meId = String(req.user._id);

  if (targetId === meId) throw ApiError.validation("You cannot follow yourself");

  const target = await User.findById(targetId).select("_id");
  if (!target) throw ApiError.notFound("User not found");

  const followed = await User.findOneAndUpdate(
    { _id: targetId, followers: { $ne: meId } },
    { $addToSet: { followers: meId } },
    { new: true },
  ).select("followers");

  if (followed) {
    await User.updateOne({ _id: meId }, { $addToSet: { following: targetId } });
    await notify({
      recipient: targetId,
      sender: meId,
      type: "follow",
      message: `${req.user.username} started following you`,
    });
    ok(res, { following: true, followersCount: followed.followers.length });
    return;
  }

  await User.updateOne({ _id: targetId }, { $pull: { followers: meId } });
  await User.updateOne({ _id: meId }, { $pull: { following: targetId } });
  const updated = await User.findById(targetId).select("followers");
  ok(res, { following: false, followersCount: updated?.followers.length ?? 0 });
}

export async function suggested(req: Request, res: Response): Promise<void> {
  const meId = req.user._id;
  const excluded = [String(meId), ...(req.user.following ?? []).map((id: unknown) => String(id))];

  // Aggregations bypass `.select()`, so the pipeline projects only safe fields.
  const users = await User.aggregate([
    { $match: { _id: { $nin: excluded }, followers: { $ne: meId } } },
    { $sample: { size: 8 } },
    { $project: SAFE_USER_PROJECT },
  ]);

  ok(
    res,
    users.map((user) => toSafeUser(user)),
  );
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const query = String(req.query.q ?? "").trim();
  if (!query) throw ApiError.validation("Search query is required", { q: "Required" });

  // Escape user input — raw regex here was the old ReDoS hole.
  const pattern = new RegExp(escapeRegExp(query), "i");
  const filter = { $or: [{ username: pattern }, { name: pattern }] };
  const { page, limit, skip } = parsePagination(req);

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).select(SAFE_USER_FIELDS).sort({ username: 1 }).skip(skip).limit(limit),
  ]);

  paginated(
    res,
    users.map((user) => toSafeUser(user)),
    total,
    page,
    limit,
  );
}

export async function getUserClans(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.params.userId).select("clans");
  if (!user) throw ApiError.notFound("User not found");

  const clans = await Clan.find({ _id: { $in: user.clans ?? [] } }).populate(
    "members",
    SAFE_USER_FIELDS,
  );
  ok(res, { clans: clans.map((clan) => toClanJson(clan)) });
}

export async function contact(req: Request, res: Response): Promise<void> {
  const { name, email, message } = req.body as ContactInput;
  const env = getEnv();
  const inbox = env.MAIL_TO || env.MAIL_USER;

  if (!inbox || !isMailConfigured()) throw ApiError.internal("Contact mail is not configured");

  await sendMail({
    to: inbox,
    replyTo: email,
    subject: `Wolvinix contact form — ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
  });

  ok(res, { ok: true });
}
