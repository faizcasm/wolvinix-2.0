import { Outlet, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar, BottomNav, BrandMark } from "./Navigation";
import { useAuthStore } from "@/stores/auth";
import { useUnreadCounts } from "@/features/notifications/hooks";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { Search, Moon, Sun, Plus, Bell } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { useEffect } from "react";

/** Top bar shown on small/medium screens. */
function MobileHeader({ unread, onCompose }: { unread: number; onCompose: () => void }) {
  const theme = useAuthStore((state) => state.theme);
  const toggleTheme = useAuthStore((state) => state.toggleTheme);

  return (
    <header className="border-border glass sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b px-4 lg:hidden">
      <Link to="/" className="flex items-center gap-2">
        <BrandMark className="h-8 w-8" />
        <span className="font-display text-lg font-bold">
          wolvinix<span className="text-accent">.</span>
        </span>
      </Link>

      <div className="flex items-center gap-1">
        <Link
          to="/search"
          aria-label="Search"
          className="text-muted hover:bg-surface-2 hover:text-foreground flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
        >
          <Search className="h-5 w-5" />
        </Link>
        <IconButton label="Create post" onClick={onCompose}>
          <Plus className="h-5 w-5" />
        </IconButton>
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="text-muted hover:bg-surface-2 hover:text-foreground relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="bg-danger absolute top-2 right-2 h-2 w-2 rounded-full" />}
        </Link>
        <IconButton label="Toggle theme" onClick={toggleTheme}>
          {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </IconButton>
      </div>
    </header>
  );
}

/** Right-hand contextual column, only where it earns its space. */
function RightRail() {
  const { pathname } = useLocation();
  const user = useAuthStore((state) => state.user);
  const showOn = ["/", "/explore"];
  const shouldShow = showOn.includes(pathname) && !!user;

  const { data: suggested } = useQuery({
    queryKey: queryKeys.suggested,
    queryFn: () => get<any[]>("/users/suggested"),
    staleTime: 60_000,
    enabled: shouldShow,
  });
  const { data: trends } = useQuery({
    queryKey: queryKeys.hashtags,
    queryFn: () => get<{ tag: string; count: number }[]>("/posts/hashtags"),
    staleTime: 60_000,
    enabled: shouldShow,
  });

  if (!shouldShow) return null;

  return (
    <aside className="sticky top-6 hidden h-fit w-[300px] shrink-0 space-y-4 xl:block">
      <div className="card p-4">
        <h2 className="font-display text-subtle mb-3 text-sm font-semibold tracking-wider uppercase">
          Trending tags
        </h2>
        <ul className="space-y-1.5">
          {(trends ?? []).slice(0, 6).map((trend) => (
            <li key={trend.tag}>
              <Link
                to={`/hashtag/${trend.tag}`}
                className="hover:bg-surface-2 flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors"
              >
                <span className="text-accent font-medium">#{trend.tag}</span>
                <span className="text-subtle tabular text-xs">{trend.count} posts</span>
              </Link>
            </li>
          ))}
          {(!trends || trends.length === 0) && (
            <li className="text-subtle px-2 py-1.5 text-sm">
              No trends yet — be the first to post.
            </li>
          )}
        </ul>
      </div>

      <div className="card p-4">
        <h2 className="font-display text-subtle mb-3 text-sm font-semibold tracking-wider uppercase">
          Who to follow
        </h2>
        <ul className="space-y-2">
          {(suggested ?? []).slice(0, 5).map((person: any) => (
            <li key={person._id}>
              <Link
                to={`/profile/${person.username}`}
                className="hover:bg-surface-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors"
              >
                <span className="from-brand-500 to-accent flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-xs font-semibold text-white">
                  {person.profilePic ? (
                    <img src={person.profilePic} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (person.name ?? "?").slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{person.name}</span>
                  <span className="text-subtle block truncate text-xs">@{person.username}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export function AppShell({ onCompose }: { onCompose: () => void }) {
  const { pathname } = useLocation();
  const { unread, unreadMessages } = useUnreadCounts();

  // Reset scroll on navigation — feels native on mobile.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar unread={unread} unreadMessages={unreadMessages} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader unread={unread} onCompose={onCompose} />

        <div className="flex w-full flex-1 gap-6 px-3 pt-4 pb-24 sm:px-5 lg:px-7 lg:pt-7 lg:pb-10">
          <main className="mx-auto w-full max-w-[640px] min-w-0 flex-1 lg:mx-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>

          <RightRail />
        </div>
      </div>

      <BottomNav unread={unread} unreadMessages={unreadMessages} />
    </div>
  );
}
