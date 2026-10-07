import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { BadgeCheck, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Form";
import { ConfirmDialog } from "@/components/ui/Modal";
import { cn, formatCount } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import type { Post } from "@/types";
import { PostActions } from "./PostActions";
import { ReplyComposer } from "./ReplyComposer";
import { isLiked, useDeletePost, useLikePost, useUpdatePost } from "./hooks";

export interface PostCardProps {
  post: Post;
  /** Called after the owner deletes the post so lists can drop it locally. */
  onDelete?: (id: string) => void;
  /** Search term rendered bold inside the post text. */
  highlight?: string;
  /** Position in the list — drives the staggered entrance. */
  index?: number;
}

const LONG_POST = 240;
const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const BURST_TONES = ["bg-brand-500", "bg-accent", "bg-lime"];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyHighlight(text: string, highlight?: string): ReactNode {
  const needle = highlight?.trim();
  if (!needle) return text;

  const pieces = text.split(new RegExp(`(${escapeRegExp(needle)})`, "gi"));
  if (pieces.length === 1) return text;

  return pieces.map((piece, position) =>
    piece.toLowerCase() === needle.toLowerCase() ? (
      <mark key={`hit-${position}`} className="bg-brand-500/30 text-foreground rounded px-0.5">
        {piece}
      </mark>
    ) : (
      piece
    ),
  );
}

/** Splits text so `#hashtags` and `@mentions` become links. */
function renderRichText(text: string, highlight?: string): ReactNode[] {
  return text.split(/([#@][A-Za-z0-9_]+)/).map((part, position) => {
    if (/^#[A-Za-z0-9_]+$/.test(part)) {
      return (
        <Link
          key={`hash-${position}`}
          to={`/hashtag/${part.slice(1)}`}
          className="text-accent font-medium transition-colors hover:underline"
        >
          {part}
        </Link>
      );
    }
    if (/^@[A-Za-z0-9_]+$/.test(part)) {
      return (
        <Link
          key={`mention-${position}`}
          to={`/profile/${part.slice(1)}`}
          className="text-brand-500 font-medium transition-colors hover:underline"
        >
          {part}
        </Link>
      );
    }
    return <span key={`chunk-${position}`}>{applyHighlight(part, highlight)}</span>;
  });
}

/**
 * The one post renderer in the app — every feed, grid and detail view
 * composes this component.
 */
export function PostCard({ post, onDelete, highlight, index = 0 }: PostCardProps) {
  const reduced = useReducedMotion();
  const me = useAuthStore((state) => state.user);

  const updater = useUpdatePost();
  const deleter = useDeletePost();
  const liker = useLikePost();

  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.text ?? "");
  const [replying, setReplying] = useState(false);
  const [burst, setBurst] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);
  const isOwner = Boolean(me && post.postedBy._id === me._id);
  const verified = (post.postedBy.followersCount ?? 0) >= 1000;
  const isLong = (post.text ?? "").length > LONG_POST;
  const liked = isLiked(post, me?._id);
  const replies = post.replies ?? [];
  const taggedUsers = post.tags ?? [];

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  const startEdit = () => {
    setDraft(post.text ?? "");
    setEditing(true);
  };

  const saveEdit = () => {
    const next = draft.trim();
    if (!next) return;
    updater.mutate({ id: post._id, text: next }, { onSuccess: () => setEditing(false) });
  };

  /** Double-tap anywhere on the post fires a springy like + particle burst. */
  const handleDoubleTap = () => {
    setBurst((value) => value + 1);
    if (!liked) liker.mutate(post);
  };

  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      whileHover={reduced ? undefined : { y: -2 }}
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 26,
        delay: Math.min(index, 8) * 0.05,
      }}
      className="card relative overflow-hidden p-4 sm:p-5"
    >
      {burst > 0 && !reduced && (
        <div
          key={burst}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          {BURST_ANGLES.map((degrees, position) => {
            const radians = (degrees * Math.PI) / 180;
            return (
              <motion.span
                key={degrees}
                className={cn(
                  "absolute h-2 w-2 rounded-full",
                  BURST_TONES[position % BURST_TONES.length],
                )}
                initial={{ opacity: 1, scale: 0.3, x: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  scale: 1,
                  x: Math.cos(radians) * 88,
                  y: Math.sin(radians) * 88,
                }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            );
          })}
        </div>
      )}

      <header className="flex items-start gap-3">
        <Link
          to={`/profile/${post.postedBy.username}`}
          className="shrink-0"
          aria-label={`${post.postedBy.name}'s profile`}
        >
          <Avatar src={post.postedBy.profilePic} name={post.postedBy.name} size="md" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
            <Link
              to={`/profile/${post.postedBy.username}`}
              className="text-foreground max-w-[45%] truncate font-semibold hover:underline"
            >
              {post.postedBy.name}
            </Link>
            {verified && (
              <BadgeCheck className="text-accent h-4 w-4 shrink-0" aria-label="Verified" />
            )}
            <span className="text-subtle max-w-[45%] truncate">@{post.postedBy.username}</span>
            <span aria-hidden="true" className="text-subtle">
              ·
            </span>
            <time
              dateTime={post.createdAt}
              title={new Date(post.createdAt).toLocaleString()}
              className="text-subtle"
            >
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </time>
          </div>
        </div>

        {isOwner && (
          <div className="relative shrink-0" ref={menuRef}>
            <IconButton
              label="Post options"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="h-8 w-8 rounded-full"
            >
              <MoreHorizontal className="h-5 w-5" />
            </IconButton>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, scale: 0.94, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.14 }}
                  className="border-border bg-elevated absolute top-full right-0 z-30 mt-1 w-40 overflow-hidden rounded-xl border py-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      startEdit();
                    }}
                    className="text-foreground hover:bg-surface-2 flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmOpen(true);
                    }}
                    className="text-danger hover:bg-danger-soft flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </header>

      <div className="mt-3" onDoubleClick={handleDoubleTap}>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={500}
              autoFocus
              aria-label="Edit post text"
              className="min-h-[88px]"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={updater.isPending}
              >
                Cancel
              </Button>
              <Button size="sm" variant="primary" loading={updater.isPending} onClick={saveEdit}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p
            className={cn(
              "text-foreground text-[15px] leading-relaxed break-words whitespace-pre-wrap",
              isLong && !expanded && "line-clamp-4",
            )}
          >
            {renderRichText(post.text ?? "", highlight)}
          </p>
        )}

        {!editing && isLong && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-accent mt-1 text-sm font-medium transition-colors hover:underline"
          >
            {expanded ? "Show less" : "See more"}
          </button>
        )}
      </div>

      {post.mediaType !== "none" && post.mediaUrl && (
        <div className="border-border bg-surface-2 relative mt-3 overflow-hidden rounded-xl border">
          {post.mediaType === "video" ? (
            <video
              src={post.mediaUrl}
              controls
              playsInline
              preload="metadata"
              aria-label={`Video posted by ${post.postedBy.name}`}
              className="bg-background max-h-[440px] w-full object-contain"
              onDoubleClick={handleDoubleTap}
            />
          ) : (
            <Link to={`/post/${post._id}`} className="group/media block" aria-label="Open post">
              <img
                src={post.mediaUrl}
                alt={`Photo shared by ${post.postedBy.name}`}
                loading="lazy"
                className="max-h-[440px] w-full object-cover transition-transform duration-500 group-hover/media:scale-[1.02]"
              />
            </Link>
          )}
        </div>
      )}

      {taggedUsers.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-subtle text-xs">Tagged</span>
          {taggedUsers.map((tagged) => (
            <Link
              key={tagged._id}
              to={`/profile/${tagged.username}`}
              className="border-border bg-surface-2 text-muted hover:border-brand-500/50 hover:text-foreground inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-xs transition-colors"
            >
              <Avatar size="xs" src={tagged.profilePic} name={tagged.name} />@{tagged.username}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-3">
        <PostActions post={post} onComment={() => setReplying((value) => !value)} />
      </div>

      <AnimatePresence initial={false}>
        {replying && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-border mt-3 border-t pt-3">
              <ReplyComposer
                postId={post._id}
                autoFocus
                onReply={() => setReplying(false)}
                placeholder="Add to the thread…"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border-border mt-3 flex flex-wrap items-center gap-3 border-t pt-3">
        {replies.length > 0 && (
          <div className="flex -space-x-2">
            {replies.slice(0, 5).map((reply) => (
              <Link
                key={reply._id}
                to={`/profile/${reply.user.username}`}
                aria-label={`Reply from ${reply.user.name}`}
                className="rounded-full"
              >
                <Avatar
                  size="xs"
                  src={reply.user.profilePic}
                  name={reply.user.name}
                  className="ring-surface ring-2"
                />
              </Link>
            ))}
          </div>
        )}
        <p className="text-subtle tabular text-xs">
          {formatCount(post.repliesCount)} replies · {formatCount(post.likesCount)} likes ·{" "}
          {formatCount(post.bookmarksCount)} saves
        </p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() =>
          deleter.mutate(post._id, {
            onSuccess: () => {
              setConfirmOpen(false);
              onDelete?.(post._id);
            },
          })
        }
        title="Delete post?"
        message="This removes the post for everyone. It cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleter.isPending}
      />
    </motion.article>
  );
}

export default PostCard;
