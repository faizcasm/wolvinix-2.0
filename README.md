<div align="center">

# 🐺 Wolvinix 2.0

**The social network built for gamers.**

Share clips, form clans, track game stats, chat in real time and climb the
leaderboard — all in one fast, modern, fully responsive app.

[![CI](https://github.com/faizcasm/wolvinix-2.0/actions/workflows/ci.yml/badge.svg)](https://github.com/faizcasm/wolvinix-2.0/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.11-brightgreen)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-22d3ee)](CONTRIBUTING.md)

</div>

---

## Table of contents

- [What's inside](#whats-inside)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [API](#api)
- [Realtime](#realtime)
- [Design system](#design-system)
- [CI](#ci)
- [Contributing](#contributing)
- [Author](#author)

---

## What's inside

### Core social

- **Feed** — infinite-scroll timeline of the people you follow, with stories
  rail, optimistic likes and skeletons everywhere.
- **Posts** — images & video, 500-char captions, `#hashtags`, `@mentions`,
  tagging friends, threaded replies, edit & delete.
- **Bookmarks** — save posts privately, synced across devices.
- **Explore** — trending posts scored by engagement + recency, trending tag cloud.
- **Stories** — 24-hour photo/video stories with progress bars, viewers and likes.
- **Notifications** — grouped, typed, live-appended over websockets.

### Community

- **Clans** — create, browse, join and leave clans; leaders manage members,
  edit the banner and can disband.
- **Leaderboard** — top players ranked from their logged game stats, with a
  podium for the top three.
- **Game stats** — per-game records (in-game name, score, level) on every profile.
- **Achievements** — profile badges and unlockable milestones.

### Communication

- **Realtime chat** — 1:1 conversations, presence, typing indicators,
  read receipts, image messages, emoji picker.
- **Explore / Search** — debounced search across people, posts and clans.

### Platform

- **PWA-ready responsive shell** — sidebar on desktop, bottom tab bar on mobile.
- **Dark / light themes** — persisted, no flash of wrong theme.
- **3D & motion** — WebGL hero scene, particle backdrops, tilt cards and
  spring-driven transitions throughout.
- **Creator tools** — image→text (OCR), image→PDF and PDF merge utilities.
- **Hardened API** — validated input, rate limiting, ownership checks,
  paginated endpoints, structured logging, health checks.

---

## Architecture

A TypeScript monorepo managed with **npm workspaces**:

```
wolvinix-2.0/
├── apps/
│   ├── api/          Express + Mongoose + Socket.IO  (REST + realtime)
│   └── web/          Vite + React + Tailwind         (SPA client)
├── docs/             API contract & architecture notes
└── .github/workflows CI pipeline
```

- The **web** app talks to the **api** through relative `/api` paths; in
  development Vite proxies `/api` and `/socket.io` to the API.
- Auth is a **httpOnly cookie** — JavaScript never sees a token. Realtime
  connections authenticate with a short-lived signed ticket.
- Server state is handled by **TanStack Query**; UI/session state by
  **Zustand**.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/API.md`](docs/API.md).

---

## Tech stack

| Layer   | Choices                                                                                                                                                                                 |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client  | React 18, TypeScript, Vite 7, Tailwind CSS v4, TanStack Query v5, Zustand, React Router 7, framer-motion, three.js + react-three-fiber, socket.io-client, react-hook-form + zod, sonner |
| Server  | Node 20+, Express 4, Mongoose 8, Socket.IO 4, zod, helmet, express-rate-limit, JWT (httpOnly cookie), Cloudinary, pino                                                                  |
| Quality | ESLint 9 (flat config), Prettier, TypeScript, Vitest, GitHub Actions CI                                                                                                                 |

---

## Getting started

### Prerequisites

- **Node.js ≥ 20.11** (22 LTS recommended)
- A MongoDB database (local or Atlas)
- A Cloudinary account (media uploads)

### 1. Clone & install

```bash
git clone https://github.com/faizcasm/wolvinix-2.0.git
cd wolvinix-2.0
npm install
```

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env    # then edit the values
```

### 3. Run both apps

```bash
npm run dev:api     # http://localhost:5000
npm run dev:web     # http://localhost:3000
```

Or from the repo root, both at once:

```bash
npm run dev
```

The web app proxies `/api` → `http://localhost:5000`, so no CORS setup is
needed locally.

---

## Environment variables

`apps/api/.env`:

| Variable                                              | Required    | Description                                              |
| ----------------------------------------------------- | ----------- | -------------------------------------------------------- |
| `PORT`                                                | no          | API port (default `5000`)                                |
| `NODE_ENV`                                            | no          | `development` \| `production` \| `test`                  |
| `LOG_LEVEL`                                           | no          | pino log level (default `info`)                          |
| `CLIENT`                                              | no          | Comma-separated allowed CORS origins                     |
| `MONGODB_URI`                                         | no          | MongoDB connection string (default local `wolvinix` db)  |
| `JWT_SECRET`                                          | **yes**     | Session secret, min 32 chars (`openssl rand -hex 32`)    |
| `JWT_EXPIRES_IN`                                      | no          | Session lifetime (default `7d`)                          |
| `COOKIE_NAME`                                         | no          | Session cookie name (default `jwt`)                      |
| `COOKIE_SAMESITE`                                     | no          | `lax` \| `strict` \| `none` (default `lax`)              |
| `SOCKET_TICKET_TTL`                                   | no          | Realtime handshake ticket lifetime in seconds (`60`)     |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET`  | for uploads | Cloudinary credentials used by `/api/media/upload`       |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USER` / `MAIL_PASS` | for email   | SMTP transport for the password-reset OTP                |
| `MAIL_FROM`                                           | no          | From header (default `Wolvinix <no-reply@wolvinix.app>`) |
| `MAIL_TO`                                             | no          | Inbox for contact-form submissions                       |

The API validates its environment at boot with zod and fails fast with a
readable message when a required value is missing.

`apps/web/.env`:

| Variable         | Required | Description                                        |
| ---------------- | -------- | -------------------------------------------------- |
| `VITE_API_PROXY` | no       | Dev proxy target (default `http://localhost:5000`) |

---

## Scripts

| Command                           | Description                      |
| --------------------------------- | -------------------------------- |
| `npm run dev`                     | Run API + web concurrently       |
| `npm run dev:api` / `dev:web`     | Run one app                      |
| `npm run build`                   | Production build of the web app  |
| `npm start`                       | Start the API from `dist/`       |
| `npm run lint`                    | ESLint across all workspaces     |
| `npm run typecheck`               | TypeScript across all workspaces |
| `npm test`                        | Unit tests                       |
| `npm run format` / `format:check` | Prettier write / verify          |

---

## Project structure

```
apps/api/src
├── config/         env validation, database, cloudinary
├── lib/            logger, errors, response envelope, pagination, hashtags
├── middleware/     protect, validate (zod), rate limits, error handler
├── models/         Mongoose schemas + indexes
├── modules/        feature slices: auth, users, posts, stories, messages,
│                   clans, notifications, stats, reviews, media, health
├── sockets/        authenticated rooms, presence, typing
├── app.ts          express assembly (no listen)
└── server.ts       entrypoint + graceful shutdown

apps/web/src
├── components/     ui primitives, layout shell, feedback, three/
├── features/       domain slices: posts, stories, auth, profile, messages,
│                   clans, games, notifications, shared
├── lib/            api client, query config, socket, utils
├── pages/          route components (code-split)
├── stores/         Zustand stores
└── types/          shared domain types
```

---

## API

The full endpoint list, payload shapes, error envelope and pagination rules are
documented in **[`docs/API.md`](docs/API.md)**.

Highlights:

```
GET    /api/health                 liveness + db status
POST   /api/auth/signup            create account
POST   /api/auth/login             start session (httpOnly cookie)
GET    /api/auth/me                restore session on boot
GET    /api/posts/feed             paginated timeline
GET    /api/posts/explore          trending, engagement-weighted
POST   /api/media/upload           multipart upload → CDN
GET    /api/stats/leaderboard      top players
```

Errors always return:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…" } }
```

---

## Realtime

Socket.IO with a **verified ticket handshake** — identity is never taken from
client-supplied query params. Users join `user:<id>` and `conversation:<id>`
rooms; presence and typing are room-scoped, never broadcast globally.

```ts
Client → Server   message:send · message:seen · typing:start · typing:stop · notification:read
Server → Client   message:new · message:seen · user:typing · presence:update · notification:new
```

---

## Design system

Tokens live in `apps/web/src/index.css` — semantic colors only
(`bg-surface`, `text-muted`, `text-brand-500`…), no hardcoded hex in components.

- **Dark-first**, with a fully supported light theme
- Gradient accents: violet → cyan → lime
- Glass surfaces, restrained glow, `Space Grotesk` display + `Inter` body
- Motion is spring-driven and honours `prefers-reduced-motion`
- Fully responsive from **360px** upward

---

## CI

`.github/workflows/ci.yml` runs on every push and pull request:

| Job            | Checks                                               |
| -------------- | ---------------------------------------------------- |
| `api`          | typecheck → lint → test → build                      |
| `web`          | typecheck → lint → build (+ uploads `dist` artifact) |
| `repo-hygiene` | Prettier check + tracked-secret scan                 |

Deployment is intentionally **not** automated — CI only.

---

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch naming, commit style and
the pull-request checklist.

---

## Author

**Faizan Hameed** — [github.com/faizcasm](https://github.com/faizcasm)

MIT © Faizan Hameed
