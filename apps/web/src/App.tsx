import { useEffect, useState, Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { setUnauthorizedHandler } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { CenteredSpinner } from "@/components/ui/Card";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { NotFound } from "@/pages/NotFound";
import { CreatePostProvider, useCreatePost } from "@/features/posts/CreatePostContext";

/* Route-level code splitting keeps the initial bundle lean. */
const FeedPage = lazy(() => import("@/pages/FeedPage"));
const ExplorePage = lazy(() => import("@/pages/ExplorePage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const PostPage = lazy(() => import("@/pages/PostPage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const ClansPage = lazy(() => import("@/pages/ClansPage"));
const ClanDetailPage = lazy(() => import("@/pages/ClanDetailPage"));
const GamesPage = lazy(() => import("@/pages/GamesPage"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const BookmarksPage = lazy(() => import("@/pages/BookmarksPage"));
const HashtagPage = lazy(() => import("@/pages/HashtagPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const EditProfilePage = lazy(() => import("@/pages/EditProfilePage"));
const ToolsPage = lazy(() => import("@/pages/ToolsPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const CreatePostModal = lazy(() => import("@/features/posts/CreatePostModal"));

/** Blocks a route until the session probe resolves. */
function Guarded({
  children,
  needsAuth = true,
}: {
  children: React.ReactNode;
  needsAuth?: boolean;
}) {
  const status = useAuthStore((state) => state.status);
  const initialized = useAuthStore((state) => state.initialized);

  if (!initialized || status === "loading" || status === "idle") {
    return <CenteredSpinner label="Restoring your session" />;
  }
  if (needsAuth && status !== "authenticated") return <Navigate to="/auth" replace />;
  if (!needsAuth && status === "authenticated") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Routed() {
  return (
    <Suspense fallback={<CenteredSpinner />}>
      <Routes>
        {/* Public */}
        <Route
          path="/auth"
          element={
            <Guarded needsAuth={false}>
              <AuthPage />
            </Guarded>
          }
        />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/signup" element={<Navigate to="/auth?mode=signup" replace />} />
        <Route
          path="/forgot-password"
          element={
            <Guarded needsAuth={false}>
              <ForgotPasswordPage />
            </Guarded>
          }
        />
        <Route
          path="/reset-password"
          element={
            <Guarded needsAuth={false}>
              <ResetPasswordPage />
            </Guarded>
          }
        />
        <Route path="/about" element={<AboutPage />} />

        {/* Authenticated app shell */}
        <Route
          element={
            <Guarded>
              <AppShellRoute />
            </Guarded>
          }
        >
          <Route path="/" element={<FeedPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:conversationId" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/clans" element={<ClansPage />} />
          <Route path="/clans/:clanId" element={<ClanDetailPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/hashtag/:tag" element={<HashtagPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/profile" element={<EditProfilePage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/post/:postId" element={<PostPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Signed-out visitors hitting an unknown URL still get a real 404. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

/** Wraps the shell with the global create-post modal. */
function AppShellRoute() {
  return (
    <CreatePostProvider>
      <ShellWithCompose />
    </CreatePostProvider>
  );
}

function ShellWithCompose() {
  const { isOpen, open, close } = useCreatePost();
  return (
    <>
      <AppShell onCompose={open} />
      <CreatePostMount open={isOpen} onClose={close} />
    </>
  );
}

function CreatePostMount({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <CreatePostModal open={open} onClose={onClose} />
    </Suspense>
  );
}

export default function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const [failed, setFailed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setUnauthorizedHandler(() => useAuthStore.getState().clear());
    void bootstrap();
  }, [bootstrap]);

  if (failed) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <NotFound />
      </div>
    );
  }

  return (
    <ErrorBoundary onError={() => setFailed(true)}>
      <div className="noise relative min-h-dvh">
        <Routed key={location.pathname.startsWith("/auth") ? "auth" : "app"} />
      </div>
    </ErrorBoundary>
  );
}
