import mongoose from "mongoose";
import { isoDate, toId } from "../lib/format.js";

export type Badge = "founder" | "verified" | "clan_leader" | "early_adopter";
export type UserRole = "user" | "admin";

const BADGES: Badge[] = ["founder", "verified", "clan_leader", "early_adopter"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_.]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // Never selected implicitly — login/reset opt in with `.select("+password")`.
    password: { type: String, required: true, minlength: 6, select: false },
    profilePic: { type: String, default: "" },
    profilePicPublicId: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 300 },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    clans: [{ type: mongoose.Schema.Types.ObjectId, ref: "Clan" }],
    isFrozen: { type: Boolean, default: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    badges: { type: [{ type: String, enum: BADGES }], default: [] },

    // Password reset OTP — hashed at rest, 10 min expiry, capped attempts.
    resetpassotp: { type: String, select: false },
    resetpassexpiry: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });
userSchema.index({ username: "text", name: "text" });

export const SAFE_USER_FIELDS =
  "name username email bio profilePic followers following clans isFrozen role badges createdAt";

/** Inclusion projection used by aggregations — never password/OTP fields. */
export const SAFE_USER_PROJECT: Record<string, 1> = {
  // Required when this projection is nested (e.g. `$project: { userDoc: … }`):
  // MongoDB drops `_id` from projected *sub*-documents by default.
  _id: 1,
  name: 1,
  username: 1,
  email: 1,
  bio: 1,
  profilePic: 1,
  followers: 1,
  following: 1,
  clans: 1,
  isFrozen: 1,
  role: 1,
  badges: 1,
  createdAt: 1,
};

export const User: mongoose.Model<any> = mongoose.models.User || mongoose.model("User", userSchema);

export interface SafeUser {
  _id: string;
  name: string;
  username: string;
  email: string;
  bio: string;
  profilePic: string;
  followers: string[];
  following: string[];
  clans: string[];
  isFrozen: boolean;
  role: UserRole;
  badges: Badge[];
  createdAt: string;
}

/**
 * The ONLY way user data leaves the process. `password`, `resetpassotp`,
 * `resetpassexpiry` and `otpAttempts` are structurally impossible to leak here,
 * no matter which query produced the document.
 */
export function toSafeUser(input: unknown): SafeUser | null {
  if (!input) return null;
  const raw = (
    typeof (input as { toObject?: unknown }).toObject === "function"
      ? (input as { toObject: () => Record<string, unknown> }).toObject()
      : input
  ) as Record<string, unknown>;

  const id = toId(raw._id ?? raw.id);
  if (!id) return null;

  const idsOf = (value: unknown): string[] =>
    Array.isArray(value) ? value.map((entry) => toId(entry)).filter(Boolean) : [];

  return {
    _id: id,
    name: String(raw.name ?? ""),
    username: String(raw.username ?? ""),
    email: String(raw.email ?? ""),
    bio: String(raw.bio ?? ""),
    profilePic: String(raw.profilePic ?? ""),
    followers: idsOf(raw.followers),
    following: idsOf(raw.following),
    clans: idsOf(raw.clans),
    isFrozen: Boolean(raw.isFrozen),
    role: (raw.role === "admin" ? "admin" : "user") as UserRole,
    badges: Array.isArray(raw.badges)
      ? (raw.badges.filter((b) => BADGES.includes(b as Badge)) as Badge[])
      : [],
    createdAt: isoDate(raw.createdAt),
  };
}

/** Minimal author shape for docs where a full user was not populated. */
export function toUserRef(value: unknown): { _id: string } | null {
  const id = toId(value);
  return id ? { _id: id } : null;
}
