# Wolvinix 2.0 — API Contract

Base URL: `/api` (proxied in dev, same-origin in production).

## Conventions

### Response envelope

Every JSON response uses a single envelope.

```jsonc
// success
{ "success": true, "data": <T> }

// success with pagination
{ "success": true, "data": <T>[], "meta": { "page": 1, "limit": 20, "total": 120, "totalPages": 6, "hasMore": true } }

// failure
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Human readable", "details": { "field": "reason" } } }
```

Error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403),
`NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL` (500).

### Auth

Session is a **httpOnly, SameSite cookie** named `jwt`. No tokens are ever
returned to JS. `GET /api/auth/me` restores the session on app boot.

### Pagination

`?page=1&limit=20` on all list endpoints. `limit` max 50.

---

## Health

| Method | Path          | Auth   | Description             |
| ------ | ------------- | ------ | ----------------------- |
| GET    | `/api/health` | public | Liveness + DB readiness |

---

## Auth — `/api/auth`

| Method | Path                        | Auth    | Body / Query                          | Response `data`                                         |
| ------ | --------------------------- | ------- | ------------------------------------- | ------------------------------------------------------- |
| POST   | `/api/auth/signup`          | public  | `{ name, username, email, password }` | `{ user, token }`                                       |
| POST   | `/api/auth/login`           | public  | `{ email, password }`                 | `{ user, token }`                                       |
| POST   | `/api/auth/logout`          | public  | —                                     | `{ ok: true }`                                          |
| GET    | `/api/auth/me`              | session | —                                     | `{ user }`                                              |
| POST   | `/api/auth/forgot-password` | public  | `{ email }`                           | `{ ok: true }` (never reveals whether the email exists) |
| POST   | `/api/auth/reset-password`  | public  | `{ email, otp, password }`            | `{ ok: true }`                                          |

`user` shape (safe subset, never includes `password` or OTP fields):

```ts
type User = {
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
  role: "user" | "admin";
  badges: ("founder" | "verified" | "clan_leader" | "early_adopter")[];
  createdAt: string;
};
```

Rate limits: signup/login 10/15min per IP; forgot-password 5/15min per IP;
reset-password 10/15min per IP. OTP is 6 digits, hashed at rest, expires in 10 min,
invalidated after use, max 5 attempts.

---

## Users — `/api/users`

| Method | Path                       | Auth    | Description                                                      |
| ------ | -------------------------- | ------- | ---------------------------------------------------------------- |
| GET    | `/api/users/me`            | session | Current user                                                     |
| PATCH  | `/api/users/me`            | session | Update `name, username, bio, profilePic, password?`              |
| DELETE | `/api/users/me`            | session | Cascading self-delete, clears cookie                             |
| POST   | `/api/users/me/freeze`     | session | Toggle freeze (`{ frozen: boolean }`)                            |
| GET    | `/api/users/:username`     | session | Public profile + `postCount`                                     |
| GET    | `/api/users/:id/followers` | session | Paginated                                                        |
| GET    | `/api/users/:id/following` | session | Paginated                                                        |
| POST   | `/api/users/:id/follow`    | session | Toggle follow → `{ following: boolean, followersCount: number }` |
| GET    | `/api/users/suggested`     | session | 8 users, excludes self + already-followed                        |
| GET    | `/api/users/search?q=`     | session | Regex-escaped search, paginated, never returns password          |
| GET    | `/api/users/clan/:userId`  | session | User's clan(s)                                                   |
| POST   | `/api/users/contact`       | public  | `{ name, email, message }`                                       |

---

## Posts — `/api/posts`

| Method | Path                              | Auth    | Description                                               |
| ------ | --------------------------------- | ------- | --------------------------------------------------------- |
| GET    | `/api/posts/feed`                 | session | Posts from followed users + self, newest first, paginated |
| GET    | `/api/posts/explore`              | session | Trending (scored by likes + replies + recency), paginated |
| GET    | `/api/posts/bookmarks`            | session | Current user's saved posts, paginated                     |
| GET    | `/api/posts/hashtags/:tag`        | session | Posts tagged `#tag`, paginated                            |
| GET    | `/api/posts/hashtags`             | session | Trending tags `[{ tag, count }]`                          |
| GET    | `/api/posts/user/:username`       | session | Author's posts, paginated                                 |
| GET    | `/api/posts/tagged/:username`     | session | Posts the user is tagged in                               |
| GET    | `/api/posts/:id`                  | session | Single post with author + replies populated               |
| POST   | `/api/posts`                      | session | `{ text, mediaUrl?, mediaType?, tags?: string[] }`        |
| PATCH  | `/api/posts/:id`                  | session | Owner only                                                |
| DELETE | `/api/posts/:id`                  | session | Owner only; destroys Cloudinary asset                     |
| PUT    | `/api/posts/:id/like`             | session | Toggle → `{ liked, likesCount }`                          |
| POST   | `/api/posts/:id/bookmark`         | session | Toggle → `{ bookmarked, bookmarksCount }`                 |
| POST   | `/api/posts/:id/replies`          | session | `{ text }` → reply                                        |
| PATCH  | `/api/posts/:id/replies/:replyId` | session | Owner only                                                |
| DELETE | `/api/posts/:id/replies/:replyId` | session | Owner only                                                |

Post shape:

```ts
type Post = {
  _id: string;
  text: string;
  mediaUrl: string;
  mediaType: "image" | "video" | "none";
  postedBy: User;
  tags: User[];
  hashtags: string[];
  likes: string[];
  bookmarks: string[];
  replies: { _id: string; user: User; text: string; createdAt: string }[];
  likesCount: number;
  repliesCount: number;
  bookmarksCount: number;
  createdAt: string;
};
```

---

## Stories — `/api/stories`

| Method | Path                    | Auth    | Description                                                         |
| ------ | ----------------------- | ------- | ------------------------------------------------------------------- |
| GET    | `/api/stories`          | session | `{ mine: Story[], groups: [{ user, stories }] }` for followed users |
| POST   | `/api/stories`          | session | `{ mediaUrl, mediaType }`, expires in 24h, video ≤ 30s              |
| POST   | `/api/stories/:id/view` | session | Records viewer (idempotent)                                         |
| PUT    | `/api/stories/:id/like` | session | Toggle like                                                         |
| DELETE | `/api/stories/:id`      | session | **Owner only**                                                      |

```ts
type Story = {
  _id: string;
  user: User;
  mediaUrl: string;
  mediaType: "image" | "video";
  viewers: User[];
  likes: string[];
  seenByMe: boolean;
  likesCount: number;
  createdAt: string;
  expiresAt: string;
};
```

---

## Messages — `/api/messages`

| Method | Path                                       | Auth    | Description                                                   |
| ------ | ------------------------------------------ | ------- | ------------------------------------------------------------- |
| GET    | `/api/messages/conversations`              | session | Sorted by last activity, each with `otherUser`, `unreadCount` |
| POST   | `/api/messages/conversations`              | session | `{ userId }` → find-or-create 1:1 conversation                |
| GET    | `/api/messages/conversations/:id`          | session | Conversation detail                                           |
| GET    | `/api/messages/conversations/:id/messages` | session | Paginated, ascending, marks unseen→seen for viewer            |
| POST   | `/api/messages/conversations/:id/messages` | session | `{ text?, imageUrl? }` → emits `message:new`                  |
| DELETE | `/api/messages/conversations/:id`          | session | Participant only                                              |
| GET    | `/api/messages/unread-count`               | session | Total unread across conversations                             |

---

## Clans — `/api/clans`

| Method | Path                               | Auth    | Description                                                      |
| ------ | ---------------------------------- | ------- | ---------------------------------------------------------------- |
| GET    | `/api/clans`                       | session | Browse + `?q=` search, paginated                                 |
| POST   | `/api/clans`                       | session | `{ name, description, motto, clanProfile? }` — one clan per user |
| GET    | `/api/clans/:id`                   | session | Detail with populated members                                    |
| PATCH  | `/api/clans/:id`                   | session | **Leader only**                                                  |
| DELETE | `/api/clans/:id`                   | session | **Leader only**                                                  |
| POST   | `/api/clans/:id/join`              | session | Max 50 members, one clan per user                                |
| POST   | `/api/clans/:id/leave`             | session | Leader must transfer/destroy first                               |
| DELETE | `/api/clans/:id/members/:memberId` | session | **Leader only kick**                                             |

---

## Notifications — `/api/notifications`

| Method | Path                              | Auth    | Description                                 |
| ------ | --------------------------------- | ------- | ------------------------------------------- |
| GET    | `/api/notifications`              | session | Paginated, newest first                     |
| GET    | `/api/notifications/unread-count` | session | `{ count }`                                 |
| PUT    | `/api/notifications/read`         | session | Marks **current user's** notifications seen |
| DELETE | `/api/notifications/:id`          | session | **Owner only**                              |
| DELETE | `/api/notifications`              | session | Clear all for current user                  |

Notification types: `like | reply | follow | tag | story | clan | system`.

---

## Stats — `/api/stats`

| Method | Path                      | Auth    | Description                              |
| ------ | ------------------------- | ------- | ---------------------------------------- |
| GET    | `/api/stats/user/:userId` | session | That user's game stats                   |
| POST   | `/api/stats`              | session | `{ gameName, inGameName, score, level }` |
| PATCH  | `/api/stats/:id`          | session | **Owner only**                           |
| DELETE | `/api/stats/:id`          | session | **Owner only**                           |
| GET    | `/api/stats/leaderboard`  | session | Top players ranked by score, paginated   |

---

## Reviews — `/api/reviews`

| Method | Path               | Auth    | Description                                |
| ------ | ------------------ | ------- | ------------------------------------------ |
| GET    | `/api/reviews`     | public  | Paginated, populated author                |
| POST   | `/api/reviews`     | session | `{ rating: 1-5, message }`, max 2 per user |
| DELETE | `/api/reviews/:id` | session | Owner only                                 |

---

## Media — `/api/media`

| Method | Path                | Auth    | Description                                                                               |
| ------ | ------------------- | ------- | ----------------------------------------------------------------------------------------- |
| POST   | `/api/media/upload` | session | `multipart/form-data`, field `file`. Max 15 MB. Returns `{ url, publicId, resourceType }` |

Supported: `image/jpeg|png|webp|gif|avif`, `video/mp4|webm|quicktime`. Uploaded to a
`wolvinix/` Cloudinary folder with derived transformations for avatars/thumbnails.

---

## Socket.IO

Handshake **must** include a valid JWT (`auth: { token }` derived from the httpOnly
cookie is not possible from JS — therefore the server issues a short-lived socket
ticket, see below).

**Simpler, chosen design:** the client calls `GET /api/auth/socket-ticket` which
returns a 60-second signed ticket; the client connects with
`io({ auth: { ticket } })`. The server verifies the ticket and rejects otherwise.

Client → server

| Event               | Payload                               | Notes                           |
| ------------------- | ------------------------------------- | ------------------------------- |
| `message:send`      | `{ conversationId, text, imageUrl? }` | Persists + relays to recipients |
| `message:seen`      | `{ conversationId }`                  | Marks peer messages seen        |
| `typing:start`      | `{ conversationId }`                  | Room-scoped                     |
| `typing:stop`       | `{ conversationId }`                  | Room-scoped                     |
| `notification:read` | —                                     | Marks own notifications read    |

Server → client

| Event              | Payload                              |
| ------------------ | ------------------------------------ |
| `presence:update`  | `{ userIds: string[] }`              |
| `message:new`      | `{ conversationId, message }`        |
| `message:seen`     | `{ conversationId, userId, at }`     |
| `user:typing`      | `{ conversationId, userId, typing }` |
| `notification:new` | `{ notification }`                   |
| `error`            | `{ code, message }`                  |

Users join `user:<id>` and `conversation:<id>` rooms. Typing and presence are
**room-scoped**, never globally broadcast.

---

## Non-negotiables

1. Never select or return `password`, `resetpassotp`, `resetpassexpiry`.
2. Every mutating route requires `protect`; every ownership mutation re-checks the owner.
3. Every list route is paginated.
4. `helmet`, `cors` (credentials + explicit origin), rate limiting on auth + contact.
5. Global error handler + 404 handler; no stack traces in production responses.
6. Socket identity comes from the verified ticket, never from client-supplied IDs.
