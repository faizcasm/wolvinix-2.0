# Wolvinix 2.0 — Architecture

Wolvinix is a TypeScript monorepo containing a REST + realtime API and a
single-page web client.

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  apps/web  (Vite SPA)        │  HTTPS  │  apps/api  (Express)         │
│                              │ ──────► │                              │
│  TanStack Query ── HTTP ─────┼── /api ─┼─► modules/* ─► Mongoose ──► MongoDB
│  Zustand (session/UI state)  │         │        │
│  socket.io-client ───────────┼─ /sio ──┼─► sockets/* ─► rooms
│  three.js (presentation)     │         │        └──► Cloudinary (media)
└──────────────────────────────┘         └──────────────────────────────┘
```

## Design principles

1. **Security by default.** Session lives in an httpOnly cookie; JavaScript
   never handles tokens. Every mutating route re-checks ownership. Input is
   validated with zod at the boundary. Auth routes are rate limited.
2. **Explicit contracts.** `docs/API.md` is the source of truth for both
   apps. Every response uses one envelope, every list is paginated.
3. **Feature slices over layering.** Both apps group code by domain
   (`modules/posts`, `features/posts`), so a change to "posts" lives in one
   place.
4. **Server state ≠ UI state.** Remote data is cached/invalidated by TanStack
   Query; session and ephemeral UI state live in Zustand. No prop drilling.
5. **Progressive rendering.** Every list ships skeleton → content → empty →
   error states; routes are lazily loaded.

---

## API layer (`apps/api`)

| Layer         | Responsibility                                                           |
| ------------- | ------------------------------------------------------------------------ |
| `config/`     | env validation (zod, fails fast), DB connection with backoff, Cloudinary |
| `lib/`        | logger, `ApiError`, response envelope, pagination, hashtag parsing       |
| `middleware/` | `protect` (JWT), `validate` (zod), rate limiters, error handler          |
| `models/`     | Mongoose schemas, indexes, safe serializers                              |
| `modules/*`   | route + controller per domain                                            |
| `sockets/`    | ticket-authenticated handshake, rooms, presence, typing                  |

### Request lifecycle

```
request
  → helmet / cors / compression / pino-http / mongo-sanitize / json parser
  → rate limiter (auth & contact)
  → route → validate(zod) → protect (JWT cookie) → controller
  → ok()/created() envelope
  → errorHandler (ZodError · Mongoose ValidationError · CastError · ApiError)
```

### Auth flow

- `signup`/`login` set a signed JWT in an `httpOnly`, `SameSite`, `Secure`
  cookie. The payload carries only the user id.
- `GET /auth/me` re-derives the user on boot — no client-persisted session.
- Password resets use a **hashed, expiring, attempt-limited OTP**.
- Realtime clients fetch a 60-second **socket ticket** over the authenticated
  REST API; the Socket.IO middleware verifies it and rejects anything else.

### Data integrity

- Atomic follow/join operations (`$addToSet` / `$pull`) avoid lost updates.
- Compound indexes back the hot queries (feed by author+time, messages by
  conversation, notifications by recipient+seen).
- Story documents carry a Mongo TTL index for automatic expiry.
- Media is uploaded to a namespaced Cloudinary folder and destroyed with its
  parent document.

---

## Web layer (`apps/web`)

### State strategy

| Kind         | Tool                    | Examples                                   |
| ------------ | ----------------------- | ------------------------------------------ |
| Remote cache | TanStack Query          | feed, profiles, conversations, clans       |
| Session      | Zustand (`stores/auth`) | current user, theme, bootstrap             |
| URL          | React Router            | tab selection, pagination, conversation id |
| Ephemeral    | `useState`/context      | modals, drafts, composer                   |

### Rendering pipeline

```
main.tsx
 └─ QueryClientProvider → BrowserRouter → App
     ├─ ErrorBoundary
     ├─ session bootstrap (GET /auth/me)
     └─ routes
         ├─ public: /auth, /forgot-password, /about
         └─ Guarded → AppShell
              ├─ Sidebar (lg+) / BottomNav (mobile)
              ├─ Outlet ← lazy page + AnimatePresence transition
              └─ RightRail (xl+) trending & suggestions
```

### Styling

Tailwind v4 with a CSS-first theme. Semantic tokens (`--color-surface`,
`--color-brand-500`…) are defined once in `src/index.css` for both themes, so
components never hardcode colors. Utilities like `.glass`, `.card`,
`.text-gradient` and `.skeleton` encode the design language.

### Motion & 3D

- framer-motion drives entrances, layout transitions and shared-element
  animations; `prefers-reduced-motion` disables them.
- three.js powers the WebGL hero, particle backdrops and the emblem, guarded
  by a WebGL capability check so unsupported devices get a styled fallback.

### Performance

- Route-level `React.lazy` splitting with a vendor/three/query manual chunk map.
- Paginated, cached queries with placeholder data to avoid layout shift.
- Images are lazy-loaded; media comes from a CDN.
- Socket listeners are attached per-view and cleaned up on unmount.

---

## Testing & CI

- **Vitest** covers pure server logic (validation schemas, pagination, hashtag
  extraction, JWT tickets, error mapping) — no database required.
- **ESLint 9** flat config + **Prettier** keep style consistent.
- **GitHub Actions** runs lint / typecheck / test / build for both workspaces
  plus a formatting and tracked-secret check. There is intentionally no CD.

---

## Known trade-offs

- The session cookie means the API and web app are expected to be
  same-site in production (reverse proxy or shared parent domain).
- Single-process Socket.IO means horizontal scaling would need a Redis
  adapter — not included yet.
- Media upload currently stages through the API; a direct-to-CDN signed
  upload would remove that hop for large videos.
