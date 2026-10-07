import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, Eye, Heart, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { del, errorMessage, post, put } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { cn, formatCount } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import type { StoryGroup } from "@/types";

export interface StoryViewerProps {
  groups: StoryGroup[];
  initialIndex?: number;
  onClose: () => void;
}

const DEFAULT_DURATION = 10;
const MAX_DURATION = 60;
const SWIPE_THRESHOLD = 60;
const CLICK_COOLDOWN = 350;

/**
 * Full-screen story player: segmented progress, auto-advance, tap zones,
 * arrow keys and swipe, plus like / viewers / owner delete.
 */
export function StoryViewer({ groups, initialIndex = 0, onClose }: StoryViewerProps) {
  const me = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();

  const [groupIndex, setGroupIndex] = useState(initialIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const lastInteractionRef = useRef(0);
  const viewedRef = useRef<Set<string>>(new Set());

  const group = groups[groupIndex] ?? groups[0];
  const story = group?.stories[storyIndex];

  const goNext = useCallback(() => {
    const current = groups[groupIndex];
    if (!current) {
      onClose();
      return;
    }
    if (storyIndex < current.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
      return;
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
      return;
    }
    onClose();
  }, [groupIndex, groups, storyIndex, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
      return;
    }
    if (groupIndex > 0) {
      const previous = groups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStoryIndex(previous ? previous.stories.length - 1 : 0);
    }
  }, [groupIndex, groups, storyIndex]);

  const markViewed = useMutation<void, Error, string>({
    mutationFn: (id) => post<void>(`/stories/${id}/view`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stories }),
  });

  const toggleLike = useMutation<void, Error, string>({
    mutationFn: (id) => put<void>(`/stories/${id}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stories }),
    onError: (error) => toast.error(errorMessage(error, "Could not update that story")),
  });

  const removeStory = useMutation<void, Error, string>({
    mutationFn: (id) => del<void>(`/stories/${id}`),
    onSuccess: () => {
      toast.success("Story deleted");
      queryClient.invalidateQueries({ queryKey: queryKeys.stories });
      setConfirmDelete(false);
      goNext();
    },
    onError: (error) => {
      setConfirmDelete(false);
      toast.error(errorMessage(error, "Could not delete that story"));
    },
  });

  /* Each story starts a fresh timing window. */
  useEffect(() => {
    setDuration(DEFAULT_DURATION);
  }, [groupIndex, storyIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goNext();
      else if (event.key === "ArrowLeft") goPrev();
      else if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (!story) return;
    if (viewedRef.current.has(story._id)) return;
    viewedRef.current.add(story._id);
    markViewed.mutate(story._id);
  }, [story, markViewed]);

  if (!group || !story) return null;

  const owned = Boolean(me && story.user._id === me._id);
  const liked = story.likes.includes(me?._id ?? "");

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      role="dialog"
      aria-modal="true"
      aria-label="Story viewer"
      className="bg-background/95 fixed inset-0 z-[90] flex items-center justify-center backdrop-blur-lg"
    >
      <div className="border-border bg-surface relative flex h-full w-full max-w-md flex-col overflow-hidden border">
        {/* Segmented progress */}
        <div
          className="flex gap-1 px-3 pt-3"
          role="progressbar"
          aria-label="Story progress"
          aria-valuemin={1}
          aria-valuemax={group.stories.length}
          aria-valuenow={storyIndex + 1}
        >
          {group.stories.map((item, position) => (
            <div key={item._id} className="bg-surface-3 h-1 flex-1 overflow-hidden rounded-full">
              {position < storyIndex && (
                <div className="bg-foreground h-full w-full rounded-full" />
              )}
              {position === storyIndex && (
                <motion.div
                  key={`${groupIndex}-${storyIndex}-${duration}`}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration, ease: "linear" }}
                  onAnimationComplete={goNext}
                  className="bg-foreground h-full rounded-full"
                />
              )}
            </div>
          ))}
        </div>

        {/* Header */}
        <header className="flex items-center gap-2 px-3 pt-2 pb-2">
          <Avatar size="sm" src={story.user.profilePic} name={story.user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{story.user.name}</p>
            <p className="text-subtle truncate text-xs">
              {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
            </p>
          </div>

          <span className="bg-surface-2 text-muted inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="tabular">{formatCount(story.viewers.length)}</span>
          </span>

          {owned && (
            <IconButton
              label="Delete story"
              onClick={() => setConfirmDelete(true)}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          )}
          <IconButton label="Close story viewer" onClick={onClose} className="h-8 w-8">
            <X className="h-5 w-5" />
          </IconButton>
        </header>

        {/* Stage */}
        <motion.div
          drag="x"
          dragSnapToOrigin
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={(_event, info) => {
            lastInteractionRef.current = Date.now();
            if (info.offset.x < -SWIPE_THRESHOLD) goNext();
            else if (info.offset.x > SWIPE_THRESHOLD) goPrev();
          }}
          onClick={(event) => {
            if (Date.now() - lastInteractionRef.current < CLICK_COOLDOWN) return;
            const target = event.target as HTMLElement;
            if (target.closest("button, a, video")) return;
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientX - rect.left < rect.width * 0.3) goPrev();
            else goNext();
          }}
          className="bg-background relative min-h-0 flex-1 cursor-pointer overflow-hidden"
        >
          {story.mediaType === "video" ? (
            <video
              src={story.mediaUrl}
              autoPlay
              playsInline
              aria-label={`Story by ${story.user.name}`}
              onLoadedMetadata={(event) => {
                const value = event.currentTarget.duration;
                if (Number.isFinite(value) && value > 1) {
                  setDuration(Math.min(value, MAX_DURATION));
                }
              }}
              className="h-full w-full object-contain"
            />
          ) : (
            <img
              src={story.mediaUrl}
              alt={`Story by ${story.user.name}`}
              className="h-full w-full object-cover"
            />
          )}

          <button
            type="button"
            aria-label="Previous story"
            onClick={goPrev}
            className="bg-surface/80 text-muted hover:text-foreground absolute top-1/2 left-2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition-colors sm:flex"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next story"
            onClick={goNext}
            className="bg-surface/80 text-muted hover:text-foreground absolute top-1/2 right-2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition-colors sm:flex"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </motion.div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-3 px-3 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={liked ? "Unlike story" : "Like story"}
              onClick={() => toggleLike.mutate(story._id)}
              className="text-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition-colors"
            >
              <motion.span
                key={liked ? "liked" : "plain"}
                initial={liked && !reduced ? { scale: 0.4 } : false}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 13 }}
                className="inline-flex"
              >
                <Heart className={cn("h-5 w-5", liked && "fill-danger text-danger")} />
              </motion.span>
              <span className="tabular text-xs">{formatCount(story.likesCount)}</span>
            </button>

            {owned && (
              <span className="text-subtle text-xs">
                {formatCount(story.viewers.length)} viewed
              </span>
            )}
          </div>

          {owned && story.viewers.length > 0 && (
            <div className="flex -space-x-2">
              {story.viewers.slice(0, 6).map((viewer) => (
                <Avatar
                  key={viewer._id}
                  size="xs"
                  src={viewer.profilePic}
                  name={viewer.name}
                  className="ring-surface ring-2"
                />
              ))}
            </div>
          )}
        </footer>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => removeStory.mutate(story._id)}
        title="Delete story?"
        message="This story disappears for everyone right away."
        confirmLabel="Delete"
        destructive
        loading={removeStory.isPending}
      />
    </motion.div>
  );
}

export default StoryViewer;
