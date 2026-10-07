export type Role = "user" | "admin";

export type Badge = "founder" | "verified" | "clan_leader" | "early_adopter";

export interface User {
  _id: string;
  name: string;
  username: string;
  email?: string;
  bio: string;
  profilePic: string;
  followers: string[];
  following: string[];
  clans: string[];
  isFrozen: boolean;
  role: Role;
  badges: Badge[];
  createdAt: string;
}

export interface CompactUser {
  _id: string;
  name: string;
  username: string;
  profilePic: string;
  bio?: string;
  followersCount?: number;
}

export type MediaType = "image" | "video" | "none";

export interface Reply {
  _id: string;
  user: CompactUser;
  text: string;
  createdAt: string;
}

export interface Post {
  _id: string;
  text: string;
  mediaUrl: string;
  mediaType: MediaType;
  postedBy: CompactUser;
  tags: CompactUser[];
  hashtags: string[];
  likes: string[];
  bookmarks: string[];
  replies: Reply[];
  likesCount: number;
  repliesCount: number;
  bookmarksCount: number;
  createdAt: string;
}

export interface Story {
  _id: string;
  user: CompactUser;
  mediaUrl: string;
  mediaType: "image" | "video";
  viewers: CompactUser[];
  likes: string[];
  seenByMe: boolean;
  likesCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface StoryGroup {
  user: CompactUser;
  stories: Story[];
}

export interface StoriesResponse {
  mine: Story[];
  groups: StoryGroup[];
}

export interface Conversation {
  _id: string;
  participants: User[];
  otherUser: CompactUser;
  lastMessage?: { text: string; sender: string; seen: boolean; createdAt: string };
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  sender: CompactUser;
  text: string;
  imageUrl: string;
  seen: boolean;
  createdAt: string;
}

export interface Clan {
  _id: string;
  name: string;
  description: string;
  motto: string;
  clanProfile: string;
  members: CompactUser[];
  leader: CompactUser;
  memberCount: number;
  createdAt: string;
}

export type NotificationType = "like" | "reply" | "follow" | "tag" | "story" | "clan" | "system";

export interface Notification {
  _id: string;
  recipient: string;
  sender: CompactUser;
  type: NotificationType;
  message: string;
  post?: string | { _id: string };
  seen: boolean;
  createdAt: string;
}

export interface GameStat {
  _id: string;
  userId: string;
  gameName: string;
  inGameName: string;
  score: string;
  level: number;
}

/** One row of `GET /api/stats/leaderboard`. */
export interface LeaderboardEntry {
  user: CompactUser;
  totalScore: number;
  /** Number of stat entries summed into the score. */
  entries: number;
  bestLevel: number;
  /** Distinct game titles the player has logged. */
  games: string[];
}

export interface Review {
  _id: string;
  rating: number;
  message: string;
  user: CompactUser;
  createdAt: string;
}

export interface HashtagTrend {
  tag: string;
  count: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: { code: string; message: string; details?: Record<string, string> };
}

export interface QueryParams {
  page?: number;
  limit?: number;
  q?: string;
  [key: string]: string | number | boolean | undefined;
}
