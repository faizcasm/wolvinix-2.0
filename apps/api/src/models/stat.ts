import mongoose from "mongoose";
import { isoDate, toId } from "../lib/format.js";
import { SAFE_USER_FIELDS, toSafeUser, type SafeUser } from "./user.js";

const statSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    gameName: { type: String, required: true, trim: true, maxlength: 80 },
    inGameName: { type: String, required: true, trim: true, maxlength: 80 },
    score: { type: Number, required: true, min: 0 },
    level: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

statSchema.index({ userId: 1, createdAt: -1 });
statSchema.index({ score: -1 });

export const STAT_POPULATE = { path: "userId", select: SAFE_USER_FIELDS };

export const Stat: mongoose.Model<any> = mongoose.models.Stat || mongoose.model("Stat", statSchema);

export interface StatJson {
  _id: string;
  userId: SafeUser | { _id: string } | null;
  gameName: string;
  inGameName: string;
  score: number;
  level: number;
  createdAt: string;
}

export function toStatJson(stat: unknown): StatJson {
  const raw = (
    typeof (stat as { toObject?: unknown }).toObject === "function"
      ? (stat as { toObject: () => Record<string, unknown> }).toObject()
      : stat
  ) as Record<string, unknown>;

  return {
    _id: toId(raw._id),
    userId: toSafeUser(raw.userId) ?? (raw.userId ? { _id: toId(raw.userId) } : null),
    gameName: String(raw.gameName ?? ""),
    inGameName: String(raw.inGameName ?? ""),
    score: Number(raw.score ?? 0),
    level: Number(raw.level ?? 0),
    createdAt: isoDate(raw.createdAt),
  };
}

export interface LeaderboardRowJson {
  user: SafeUser | null;
  totalScore: number;
  entries: number;
  bestLevel: number;
  games: string[];
}
