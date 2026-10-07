import type { Request, Response } from "express";
import { destroyPublic, publicIdFromUrl } from "../../config/cloudinary.js";
import { ApiError } from "../../lib/errors.js";
import { toId } from "../../lib/format.js";
import { parsePagination } from "../../lib/pagination.js";
import { escapeRegExp } from "../../lib/regex.js";
import { created, ok, paginated } from "../../lib/response.js";
import { CLAN_POPULATE, Clan, MAX_CLAN_MEMBERS, toClanJson } from "../../models/clan.js";
import { User } from "../../models/user.js";
import { notify } from "../notifications/service.js";
import type { CreateClanInput, UpdateClanInput } from "./schemas.js";

function isMember(clan: { members?: unknown[] }, userId: unknown): boolean {
  return (clan.members ?? []).some((member) => toId(member) === String(userId));
}

function assertLeader(clan: { leader?: unknown }, userId: unknown): void {
  if (toId(clan.leader) !== String(userId)) {
    throw ApiError.forbidden("Only the clan leader can do that");
  }
}

/** Keeps the `clan_leader` badge in sync with actual leadership. */
async function syncLeaderBadge(userId: unknown): Promise<void> {
  const stillLeader = await Clan.exists({ leader: userId });
  await User.updateOne(
    { _id: userId },
    stillLeader ? { $addToSet: { badges: "clan_leader" } } : { $pull: { badges: "clan_leader" } },
  );
}

export async function browseClans(req: Request, res: Response): Promise<void> {
  const { page, limit, skip } = parsePagination(req);
  const query = String(req.query.q ?? "").trim();

  const filter = query
    ? {
        $or: [
          { name: new RegExp(escapeRegExp(query), "i") },
          { description: new RegExp(escapeRegExp(query), "i") },
          { motto: new RegExp(escapeRegExp(query), "i") },
        ],
      }
    : {};

  const [total, clans] = await Promise.all([
    Clan.countDocuments(filter),
    Clan.find(filter).populate(CLAN_POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  paginated(
    res,
    clans.map((clan) => toClanJson(clan)),
    total,
    page,
    limit,
  );
}

export async function createClan(req: Request, res: Response): Promise<void> {
  const { name, description, motto, clanProfile } = req.body as CreateClanInput;
  const meId = String(req.user._id);

  const existing = await Clan.findOne({ $or: [{ members: meId }, { leader: meId }] }).select("_id");
  if (existing) throw ApiError.conflict("You already belong to a clan");

  const clan = await Clan.create({
    name,
    description,
    motto,
    clanProfile: clanProfile ?? "",
    clanProfilePublicId: publicIdFromUrl(clanProfile) ?? "",
    leader: meId,
    members: [meId],
  });

  await User.updateOne({ _id: meId }, { $addToSet: { clans: clan._id, badges: "clan_leader" } });
  await clan.populate(CLAN_POPULATE);

  created(res, toClanJson(clan));
}

export async function getClan(req: Request, res: Response): Promise<void> {
  const clan = await Clan.findById(req.params.id).populate(CLAN_POPULATE);
  if (!clan) throw ApiError.notFound("Clan not found");
  ok(res, toClanJson(clan));
}

export async function updateClan(req: Request, res: Response): Promise<void> {
  const patch = req.body as UpdateClanInput;
  const clan = await Clan.findById(req.params.id);
  if (!clan) throw ApiError.notFound("Clan not found");
  assertLeader(clan, req.user._id);

  if (patch.name !== undefined) clan.name = patch.name;
  if (patch.description !== undefined) clan.description = patch.description;
  if (patch.motto !== undefined) clan.motto = patch.motto;
  if (patch.clanProfile !== undefined && patch.clanProfile !== clan.clanProfile) {
    if (clan.clanProfile)
      await destroyPublic(clan.clanProfilePublicId || publicIdFromUrl(clan.clanProfile), "image");
    clan.clanProfile = patch.clanProfile;
    clan.clanProfilePublicId = publicIdFromUrl(patch.clanProfile) ?? "";
  }

  await clan.save();
  await clan.populate(CLAN_POPULATE);
  ok(res, toClanJson(clan));
}

export async function deleteClan(req: Request, res: Response): Promise<void> {
  const clan = await Clan.findById(req.params.id).select(
    "leader members clanProfile clanProfilePublicId",
  );
  if (!clan) throw ApiError.notFound("Clan not found");
  assertLeader(clan, req.user._id);

  await User.updateMany({ _id: { $in: clan.members } }, { $pull: { clans: clan._id } });
  await syncLeaderBadge(clan.leader);
  if (clan.clanProfile) {
    await destroyPublic(clan.clanProfilePublicId || publicIdFromUrl(clan.clanProfile), "image");
  }
  await Clan.deleteOne({ _id: clan._id });

  ok(res, { ok: true });
}

export async function joinClan(req: Request, res: Response): Promise<void> {
  const clanId = req.params.id;
  const meId = String(req.user._id);

  const otherClan = await Clan.findOne({
    $or: [{ members: meId }, { leader: meId }],
    _id: { $ne: clanId },
  }).select("_id");
  if (otherClan) throw ApiError.conflict("You already belong to a clan");

  const clan = await Clan.findById(clanId).select("_id members");
  if (!clan) throw ApiError.notFound("Clan not found");

  // Atomic guard: not already a member AND still below the 50 member cap.
  const joined = await Clan.findOneAndUpdate(
    {
      _id: clanId,
      members: { $ne: meId },
      $expr: { $lt: [{ $size: "$members" }, MAX_CLAN_MEMBERS] },
    },
    { $addToSet: { members: meId } },
    { new: true },
  ).populate(CLAN_POPULATE);

  if (!joined) {
    if (isMember(clan, meId)) {
      await User.updateOne({ _id: meId }, { $addToSet: { clans: clan._id } });
      ok(res, toClanJson(await Clan.findById(clanId).populate(CLAN_POPULATE)));
      return;
    }
    throw ApiError.conflict("This clan is full");
  }

  await User.updateOne({ _id: meId }, { $addToSet: { clans: joined._id } });
  await notify({
    recipient: toId(joined.leader),
    sender: meId,
    type: "clan",
    message: `${req.user.username} joined your clan`,
  });

  ok(res, toClanJson(joined));
}

export async function leaveClan(req: Request, res: Response): Promise<void> {
  const clanId = req.params.id;
  const meId = String(req.user._id);

  const clan = await Clan.findById(clanId).select("leader members");
  if (!clan) throw ApiError.notFound("Clan not found");
  if (!isMember(clan, meId)) throw ApiError.forbidden("You are not a member of this clan");
  if (toId(clan.leader) === meId) {
    throw ApiError.conflict("Transfer leadership or delete the clan before leaving");
  }

  await Clan.updateOne({ _id: clan._id }, { $pull: { members: meId } });
  await User.updateOne({ _id: meId }, { $pull: { clans: clan._id } });
  await syncLeaderBadge(meId);

  ok(res, { ok: true });
}

export async function kickMember(req: Request, res: Response): Promise<void> {
  const clanId = req.params.id;
  const memberId = String(req.params.memberId);
  const meId = String(req.user._id);

  const clan = await Clan.findById(clanId).select("leader members name");
  if (!clan) throw ApiError.notFound("Clan not found");
  assertLeader(clan, meId);

  if (toId(clan.leader) === memberId) throw ApiError.validation("The leader cannot be kicked");
  if (!isMember(clan, memberId)) throw ApiError.notFound("Member not found in this clan");

  await Clan.updateOne({ _id: clan._id }, { $pull: { members: memberId } });
  await User.updateOne({ _id: memberId }, { $pull: { clans: clan._id } });

  await notify({
    recipient: memberId,
    sender: meId,
    type: "clan",
    message: `You were removed from ${String(clan.name ?? "a clan")}`,
  });

  ok(res, { ok: true });
}
