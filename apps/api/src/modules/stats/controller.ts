import type { Request, Response } from "express";
import { ApiError } from "../../lib/errors.js";
import { parsePagination } from "../../lib/pagination.js";
import { created, ok, paginated } from "../../lib/response.js";
import { STAT_POPULATE, Stat, toStatJson, type LeaderboardRowJson } from "../../models/stat.js";
import { SAFE_USER_PROJECT, toSafeUser, User } from "../../models/user.js";

interface CreateStatInput {
  gameName: string;
  inGameName: string;
  score: number;
  level: number;
}

export async function getUserStats(req: Request, res: Response): Promise<void> {
  const filter = { userId: req.params.userId };
  const userExists = await User.exists({ _id: req.params.userId });
  if (!userExists) throw ApiError.notFound("User not found");

  const { page, limit, skip } = parsePagination(req);
  const [total, stats] = await Promise.all([
    Stat.countDocuments(filter),
    Stat.find(filter).populate(STAT_POPULATE).sort({ score: -1 }).skip(skip).limit(limit),
  ]);

  paginated(
    res,
    stats.map((stat) => toStatJson(stat)),
    total,
    page,
    limit,
  );
}

export async function createStat(req: Request, res: Response): Promise<void> {
  const { gameName, inGameName, score, level } = req.body as CreateStatInput;

  const stat = await Stat.create({
    userId: req.user._id,
    gameName,
    inGameName,
    score,
    level,
  });
  await stat.populate(STAT_POPULATE);

  created(res, toStatJson(stat));
}

export async function updateStat(req: Request, res: Response): Promise<void> {
  const patch = req.body as Partial<CreateStatInput>;

  const stat = await Stat.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: patch },
    { new: true, runValidators: true },
  ).populate(STAT_POPULATE);

  if (!stat) {
    const exists = await Stat.exists({ _id: req.params.id });
    if (exists) throw ApiError.forbidden("You can only edit your own stats");
    throw ApiError.notFound("Stat not found");
  }

  ok(res, toStatJson(stat));
}

export async function deleteStat(req: Request, res: Response): Promise<void> {
  const stat = await Stat.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!stat) {
    const exists = await Stat.exists({ _id: req.params.id });
    if (exists) throw ApiError.forbidden("You can only delete your own stats");
    throw ApiError.notFound("Stat not found");
  }

  ok(res, { ok: true });
}

/** Players ranked by the sum of their scores, paginated. */
export async function leaderboard(req: Request, res: Response): Promise<void> {
  const { page, limit, skip } = parsePagination(req);

  const rows = await Stat.aggregate([
    {
      $group: {
        _id: "$userId",
        totalScore: { $sum: "$score" },
        entries: { $sum: 1 },
        bestLevel: { $max: "$level" },
        games: { $addToSet: "$gameName" },
      },
    },
    { $sort: { totalScore: -1, entries: -1, _id: 1 } },
    { $skip: skip },
    { $limit: limit },
    // Join a *projected* user doc — aggregations never see password/OTP fields.
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "userDoc" } },
    { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        totalScore: 1,
        entries: 1,
        bestLevel: 1,
        games: 1,
        userDoc: SAFE_USER_PROJECT,
      },
    },
  ]);

  const total = await Stat.distinct("userId").then((ids) => ids.length);

  const payload: LeaderboardRowJson[] = rows.map((row) => ({
    user: toSafeUser(row.userDoc),
    totalScore: row.totalScore,
    entries: row.entries,
    bestLevel: row.bestLevel,
    games: row.games,
  }));

  paginated(res, payload, total, page, limit);
}
