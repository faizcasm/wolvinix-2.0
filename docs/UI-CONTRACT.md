# Wolvinix 2.0 — Frontend Build Contract

Multiple agents build `apps/web` in parallel. **Respect file ownership strictly.**
Never create, edit or delete a file you do not own. If you need something another
agent owns, import it per the interface below — it is being built concurrently.

---

## 1. Read first

| File                          | Why                                                          |
| ----------------------------- | ------------------------------------------------------------ |
| `docs/API.md`                 | Binding backend contract — every endpoint, payload, envelope |
| `apps/web/src/index.css`      | Design tokens + utilities. **Never write raw hex colors.**   |
| `apps/web/src/App.tsx`        | Route map — the exact page filenames that must exist         |
| `apps/web/src/types/index.ts` | Shared domain types                                          |
| `apps/web/src/lib/api.ts`     | `get/post/patch/put/del/getData/errorMessage`                |
| `apps/web/src/lib/query.ts`   | `queryClient`, `queryKeys`                                   |
| `apps/web/src/lib/utils.ts`   | `cn`, `formatCount`, `initials`, `hueFrom`, `truncate`       |

---

## 2. Design language (non-negotiable)

- **Dark-first gamer aesthetic.** Deep near-black surfaces, violet → cyan → lime
  gradient accents, subtle glass, restrained glow.
- Use semantic tokens only: `bg-background`, `bg-surface`, `bg-surface-2`,
  `text-foreground`, `text-muted`, `text-subtle`, `border-border`,
  `text-brand-500`, `bg-brand-500`, `text-accent`, `text-lime`, `text-danger`,
  `text-success`, `text-warning`.
- Never hardcode `#hex`, `rgb()`, `gray-500`-style palette shades, or `blue-500`.
- Fonts: `font-display` (headings) / default Inter (body).
- Radius: `rounded-xl` cards, `rounded-2xl` modals, `rounded-full` pills.
- **Every list has**: skeleton loading, empty state, error state with retry,
  pagination (use `usePaginatedList`), and a scroll-to-load-more button.
- **Motion**: use `framer-motion`. Stagger list items (`delayChildren`,
  `staggerChildren`), spring entrances, `layoutId` for shared-element swaps,
  `whileHover={{ scale: 1.02 }}`, `whileTap={{ scale: 0.97 }}`.
  Always respect reduced motion (framer's `useReducedMotion`).
- **Responsive**: mobile-first. Must work at 360px. Use `sm:`/`lg:`/`xl:`
  breakpoints. Bottom nav occupies ~64px — add `pb-24` where needed.
- **Accessibility**: real `<button>`/`<a>`, `aria-label` on icon-only controls,
  visible focus rings, `role="dialog"` handled by `Modal`, alt text on images.

### Reusable primitives (already built — import, don't reinvent)

```ts
import { Button, IconButton } from "@/components/ui/Button";
// <Button variant="primary|secondary|ghost|outline|danger|gradient|glass"
//         size="sm|md|lg|icon" loading leftIcon rightIcon />

import {
  Card,
  Avatar,
  Badge,
  EmptyState,
  Skeleton,
  PostSkeleton,
  CenteredSpinner,
  Spinner,
} from "@/components/ui/Card";
// <Card hover glow padded={false}>
// <Avatar src size="xs|sm|md|lg|xl|2xl" online ring />
// <Badge tone="brand|accent|lime|danger|warning|neutral" />
// <EmptyState icon title description action />

import { Field, Input, Textarea, PasswordInput, Switch, ProgressBar } from "@/components/ui/Form";
import { Modal, Tabs, ConfirmDialog } from "@/components/ui/Modal";
```

Toasts: `import { toast } from "sonner"` → `toast.success(...)`, `toast.error(errorMessage(err))`.

---

## 3. Shared component contracts

### 3.1 3D components — owned by the _3D agent_

```tsx
// @/components/three/HeroScene  (default export)
// Full-bleed animated 3D hero: floating faceted core, orbiting shards,
// mouse parallax, neon rim lights. Renders into its own <Canvas>.
<HeroScene className="absolute inset-0" />

// @/components/three/ParticleField  (named export)
// Subtle drifting particle backdrop for marketing/hero sections.
<ParticleField className="absolute inset-0 -z-10" density={60} />

// @/components/three/TiltCard  (named export)
// Perspective tilt on pointer move + gradient sheen. Wraps any card.
<TiltCard intensity={10} className="h-full">
  ...child...
</TiltCard>

// @/components/three/Emblem3D  (default export)
// Slowly rotating low-poly wolf crest for the about/landing pages.
<Emblem3D className="h-64 w-full" />
```

All 3D components must:

- be `React.memo`'d, `lazy`-friendly,
- degrade gracefully (`dpr={[1, 1.75]}`, no HDR/network fetches — use lights,
  never `Environment preset`),
- pause when off-screen, respect `prefers-reduced-motion`,
- render nothing but a styled placeholder while WebGL is unavailable.

### 3.2 Post rendering — owned by the _feed agent_

```tsx
// @/features/posts/PostCard  (named export)
<PostCard
  post={Post}                 // from @/types
  onDelete?: (id: string) => void
  highlight?: string          // search term to bold
  index?: number              // for stagger delay
/>

// @/features/posts/CreatePostModal  (default export) — rendered by App.tsx
<CreatePostModal open={boolean} onClose={() => void} />

// @/features/posts/CreatePostContext — ALREADY EXISTS
import { useCreatePost } from "@/features/posts/CreatePostContext";
const { open, openWithSeed, isOpen, close, seed } = useCreatePost();
```

Other agents render feeds with `PostCard`; they must not implement their own.

### 3.3 Follow button — owned by the _profile agent_

```tsx
// @/features/profile/FollowButton  (named export)
<FollowButton userId={string} initialFollowing={boolean}
              onChange?: (following: boolean) => void
              size="sm|md" variant="outline|primary" />
```

### 3.4 Chat — owned by the _social agent_

`MessagesPage` is self-contained; no other agent imports from
`@/features/messages`.

---

## 4. File ownership map

### Feed agent (`@/features/posts`, `@/pages/Feed*`, `Explore*`, `Post*`, `Bookmarks*`, `Hashtag*`)

- `src/pages/FeedPage.tsx` (default export)
- `src/pages/ExplorePage.tsx`
- `src/pages/PostPage.tsx`
- `src/pages/BookmarksPage.tsx`
- `src/pages/HashtagPage.tsx`
- `src/features/posts/CreatePostModal.tsx`
- `src/features/posts/PostCard.tsx`
- `src/features/posts/PostActions.tsx`
- `src/features/posts/ReplyComposer.tsx`
- `src/features/posts/hooks.ts` (useFeed, useLikePost, useBookmarkPost, useToggleFollow-ish feed mutations)
- `src/features/stories/*` (StoriesRail, StoryViewer, CreateStory)

### Auth & profile agent (`@/features/auth`, `@/features/profile`, related pages)

- `src/pages/AuthPage.tsx` (landing + login/signup, **uses `HeroScene`**)
- `src/pages/ProfilePage.tsx`
- `src/pages/EditProfilePage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/ForgotPasswordPage.tsx`
- `src/pages/ResetPasswordPage.tsx`
- `src/pages/AboutPage.tsx` (**uses `Emblem3D` / `ParticleField`**)
- `src/features/auth/*` (LoginForm, SignupForm, schemas, useAuthActions)
- `src/features/profile/*` (ProfileHeader, StatsPanel, FollowersModal, FollowButton, Achievements)

### Social agent

- `src/pages/MessagesPage.tsx`
- `src/pages/NotificationsPage.tsx`
- `src/pages/SearchPage.tsx`
- `src/pages/ClansPage.tsx`
- `src/pages/ClanDetailPage.tsx`
- `src/pages/GamesPage.tsx` (**uses `TiltCard`**)
- `src/pages/LeaderboardPage.tsx`
- `src/pages/ToolsPage.tsx`
- `src/features/messages/*`, `src/features/clans/*`, `src/features/games/*`

### 3D agent

- `src/components/three/*` only

---

## 5. Data + realtime conventions

```ts
// Queries
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import { get, post, patch, del, errorMessage } from "@/lib/api";

// Infinite lists
import { usePaginatedList, flattenPages } from "@/features/shared/usePaginatedList";
const list = usePaginatedList<Post>({ queryKey: queryKeys.feed(1), url: "/posts/feed", limit: 10 });
list.data?.pages → flattenPages<Post>(list.data?.pages)
list.hasNextPage, list.isFetchingNextPage, list.fetchNextPage()
```

Realtime:

```ts
import { connectSocket, getSocket } from "@/lib/socket";
const socket = await connectSocket(); // once, after auth
socket.on("message:new", handler); // always .off() in cleanup
```

Optimistic mutations: use `onMutate` → cancel queries → snapshot → setQueryData
→ rollback `onError` → invalidate `onSettled`. Applies to like, bookmark, follow.

Never call `console.log` in shipped code.

---

## 6. Page-level requirements

Every page must export **default** and satisfy `App.tsx`'s import.

| Page                                       | Must have                                                                                                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FeedPage`                                 | Stories rail, composer entry, `PostCard` list, infinite scroll, pull-to-refresh feel, welcome card for empty feed                                                    |
| `ExplorePage`                              | Trending masonry/grid, hashtag chips, `TiltCard` media, filters (recent/trending)                                                                                    |
| `PostPage`                                 | Single post detail, replies thread, reply composer, 404 for missing                                                                                                  |
| `BookmarksPage`                            | Saved posts, empty state CTA → `/explore`                                                                                                                            |
| `HashtagPage`                              | `#tag` header w/ count, posts, follow-tag-ish UI                                                                                                                     |
| `AuthPage`                                 | Split hero: `HeroScene` + glass auth card, login/signup toggle, validation, password strength, demo-credentials hint                                                 |
| `ProfilePage`                              | Header (avatar, bio, badges, counts), tabs Posts/Tagged/About, stats panel, clan chip, achievements, `FollowButton`, own-profile edit CTA                            |
| `EditProfilePage`                          | Avatar upload w/ preview, bio counter, validated form                                                                                                                |
| `SettingsPage`                             | Grouped sections, theme toggle, account actions, danger zone w/ `ConfirmDialog`                                                                                      |
| `ForgotPasswordPage` / `ResetPasswordPage` | Stepper UI, OTP boxes, resend timer                                                                                                                                  |
| `AboutPage`                                | `Emblem3D`, mission, feature grid, team/founder, `ParticleField`                                                                                                     |
| `MessagesPage`                             | Two-pane desktop / single-pane mobile w/ `:conversationId`, conversation list, presence dots, typing indicator, read receipts, emoji picker, image send, empty state |
| `NotificationsPage`                        | Grouped by type, icons per type, mark-all-read, swipe/delete, live socket append                                                                                     |
| `SearchPage`                               | Debounced search, tabs (People/Posts/Clans), recent searches, suggestions                                                                                            |
| `ClansPage`                                | Grid of clan cards, search, create-clan modal, join/leave                                                                                                            |
| `ClanDetailPage`                           | Banner, leader, member list w/ roles, join/leave/kick, edit for leader                                                                                               |
| `GamesPage`                                | Catalog w/ search + genre filter, `TiltCard`, play CTA, stats quick-add                                                                                              |
| `LeaderboardPage`                          | Podium top-3 with 3D flair, ranked table, own rank highlight                                                                                                         |
| `ToolsPage`                                | Utility tools (image→text, image→PDF, merge PDF) in a clean tabbed workspace                                                                                         |

---

## 7. Definition of done (per agent)

Run from `/tmp/opencode/wolvinix/wolvinix-2.0`:

1. `npm run lint --workspace @wolvinix/web` → 0 errors
2. `npm run typecheck --workspace @wolvinix/web` → 0 errors (config is lenient; fix real errors)
3. `npm run build --workspace @wolvinix/web` → succeeds

Do not commit. Report which files you created and the command outputs.
