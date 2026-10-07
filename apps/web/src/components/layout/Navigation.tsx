import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import {
  Home,
  Compass,
  MessagesSquare,
  Users,
  Gamepad2,
  Trophy,
  Bell,
  Bookmark,
  Search,
  Settings,
  User,
} from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
  match?: (pathname: string) => boolean;
  mobile?: boolean;
}

interface NavProps {
  unread?: number;
  unreadMessages?: number;
  variant?: "sidebar" | "bottom" | "mobile-drawer";
  onNavigate?: () => void;
}

export function useNavItems({
  unread = 0,
  unreadMessages = 0,
}: Pick<NavProps, "unread" | "unreadMessages">): NavItem[] {
  const user = useAuthStore((state) => state.user);

  return [
    { to: "/", label: "Feed", icon: Home, badge: 0, mobile: true },
    { to: "/explore", label: "Explore", icon: Compass, mobile: true },
    {
      to: "/messages",
      label: "Messages",
      icon: MessagesSquare,
      badge: unreadMessages,
      mobile: true,
    },
    { to: "/clans", label: "Clans", icon: Users, mobile: true },
    { to: "/games", label: "Games", icon: Gamepad2, mobile: false },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy, mobile: false },
    {
      to: "/notifications",
      label: "Alerts",
      icon: Bell,
      badge: unread,
      mobile: true,
    },
    { to: "/bookmarks", label: "Saved", icon: Bookmark, mobile: false },
    { to: "/search", label: "Search", icon: Search, mobile: false },
    {
      to: `/profile/${user?.username ?? ""}`,
      label: "Profile",
      icon: User,
      mobile: false,
      match: (pathname) => pathname.startsWith("/profile/"),
    },
    { to: "/settings", label: "Settings", icon: Settings, mobile: false },
  ];
}

function isCurrent(item: NavItem, pathname: string) {
  if (item.match) return item.match(pathname);
  if (item.to === "/") return pathname === "/";
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

/* ---------------------------- Desktop sidebar --------------------------- */

export function Sidebar({ unread = 0, unreadMessages = 0 }: NavProps) {
  const items = useNavItems({ unread, unreadMessages });
  const { pathname } = useLocation();
  const user = useAuthStore((state) => state.user);

  return (
    <nav
      aria-label="Primary"
      className="border-border bg-elevated/60 sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r px-3 py-6 backdrop-blur-xl lg:flex xl:w-[264px]"
    >
      <NavLink to="/" className="mb-7 flex items-center gap-2.5 px-3">
        <BrandMark className="h-9 w-9" />
        <span className="font-display text-xl font-bold tracking-tight">
          wolvinix<span className="text-accent">.</span>
        </span>
      </NavLink>

      <ul className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = isCurrent(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-all duration-200",
                  active
                    ? "text-foreground font-semibold"
                    : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                {active && (
                  <span className="bg-brand-500 absolute inset-y-1.5 -left-3 w-1 rounded-full" />
                )}
                <span
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                    active
                      ? "bg-brand-500/15 text-brand-500"
                      : "text-muted group-hover:bg-surface-3 group-hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {!!item.badge && item.badge > 0 && (
                    <span className="bg-danger tabular absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </span>
                <span className="flex-1">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 space-y-3">
        <NavLink
          to={user ? `/profile/${user.username}` : "/auth"}
          className="border-border bg-surface-2 hover:border-brand-500/40 flex items-center gap-3 rounded-xl border p-2.5 transition-colors"
        >
          <AvatarMini src={user?.profilePic} name={user?.name ?? "Guest"} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{user?.name ?? "Guest"}</span>
            <span className="text-subtle block truncate text-xs">
              @{user?.username ?? "wolvinix"}
            </span>
          </span>
        </NavLink>
        <p className="text-subtle px-3 text-[11px]">Wolvinix 2.0 · built for gamers</p>
      </div>
    </nav>
  );
}

function AvatarMini({ src, name }: { src?: string; name: string }) {
  return (
    <span className="from-brand-500 to-accent flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-xs font-semibold text-white">
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

/* ------------------------------ Bottom bar ------------------------------ */

export function BottomNav({ unread = 0, unreadMessages = 0 }: NavProps) {
  const items = useNavItems({ unread, unreadMessages }).filter((item) => item.mobile);
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary mobile"
      className="safe-bottom border-border glass fixed inset-x-0 bottom-0 z-40 border-t lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {items.map((item) => {
          const active = isCurrent(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-brand-500" : "text-subtle",
                )}
              >
                <span className="relative">
                  <Icon className="h-[22px] w-[22px]" />
                  {!!item.badge && item.badge > 0 && (
                    <span className="bg-danger tabular absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </span>
                {item.label}
                {active && (
                  <span className="bg-brand-500 absolute -top-px h-0.5 w-8 rounded-full" />
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* -------------------------------- Brand --------------------------------- */

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand-500)" />
          <stop offset="55%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--lime)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="var(--surface-2)" />
      <path
        d="M14 18l8 6 4-8 6 10 6-10 4 8 8-6-4 26-14 8-14-8z"
        fill="none"
        stroke="url(#wm)"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="26" cy="36" r="2.6" fill="url(#wm)" />
      <circle cx="38" cy="36" r="2.6" fill="url(#wm)" />
    </svg>
  );
}
