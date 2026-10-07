import { create } from "zustand";
import type { User } from "@/types";
import { get as apiGet, post, patch, errorMessage } from "@/lib/api";

interface AuthState {
  user: User | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  initialized: boolean;
  theme: "dark" | "light";

  bootstrap: () => Promise<void>;
  setUser: (user: User | null) => void;
  refresh: () => Promise<void>;
  updateProfile: (patchBody: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  clear: () => void;
  toggleTheme: () => void;
}

const THEME_KEY = "wolvinix.theme";

function readTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable — theme still applies for this session */
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",
  initialized: false,
  theme: readTheme(),

  /** Restores the session from the httpOnly cookie on first render. */
  bootstrap: async () => {
    if (get().initialized) return;
    set({ status: "loading" });
    try {
      const { user } = await apiGet<{ user: User }>("/auth/me");
      set({ user, status: "authenticated", initialized: true });
    } catch {
      set({ user: null, status: "unauthenticated", initialized: true });
    }
  },

  setUser: (user) => set({ user, status: user ? "authenticated" : "unauthenticated" }),

  /** Re-reads the current user without flashing a loading state. */
  refresh: async () => {
    try {
      const { user } = await apiGet<{ user: User }>("/auth/me");
      set({ user, status: "authenticated" });
    } catch {
      /* keep whatever we had */
    }
  },

  updateProfile: async (patchBody) => {
    const updated = await patch<User>("/users/me", patchBody);
    set({ user: { ...get().user, ...updated } });
  },

  logout: async () => {
    try {
      await post("/auth/logout");
    } finally {
      set({ user: null, status: "unauthenticated" });
    }
  },

  clear: () => set({ user: null, status: "unauthenticated" }),

  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    set({ theme: next });
  },
}));

/** Exposed so interceptors/API helpers can report auth failures. */
export function reportAuthFailure() {
  useAuthStore.getState().clear();
}

export { errorMessage };
