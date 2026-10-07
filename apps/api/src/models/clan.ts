import mongoose from "mongoose";
import { isoDate, toId } from "../lib/format.js";
import { SAFE_USER_FIELDS, toSafeUser, toUserRef, type SafeUser } from "./user.js";

export const MAX_CLAN_MEMBERS = 50;

const clanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 40, index: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    motto: { type: String, required: true, trim: true, maxlength: 150 },
    clanProfile: { type: String, default: "" },
    clanProfilePublicId: { type: String, default: "" },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    leader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

clanSchema.index({ members: 1 });
clanSchema.index({ name: "text", description: "text", motto: "text" });

export const CLAN_POPULATE = { path: "members", select: SAFE_USER_FIELDS };

export const Clan: mongoose.Model<any> = mongoose.models.Clan || mongoose.model("Clan", clanSchema);

export interface ClanJson {
  _id: string;
  name: string;
  description: string;
  motto: string;
  clanProfile: string;
  leader: string;
  members: Array<SafeUser | { _id: string }>;
  memberCount: number;
  createdAt: string;
  updatedAt?: string;
}

export function toClanJson(clan: unknown): ClanJson {
  const raw = (
    typeof (clan as { toObject?: unknown }).toObject === "function"
      ? (clan as { toObject: () => Record<string, unknown> }).toObject()
      : clan
  ) as Record<string, unknown>;

  const members = Array.isArray(raw.members) ? raw.members : [];

  return {
    _id: toId(raw._id),
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    motto: String(raw.motto ?? ""),
    clanProfile: String(raw.clanProfile ?? ""),
    leader: toId(raw.leader),
    members: members.map((member) => toSafeUser(member) ?? toUserRef(member)),
    memberCount: members.length,
    createdAt: isoDate(raw.createdAt),
    updatedAt: raw.updatedAt ? isoDate(raw.updatedAt) : undefined,
  };
}
