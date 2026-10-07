import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Bookmark, Heart, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn, formatCount, truncate } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import type { Post } from "@/types";
import { isBookmarked, isLiked, useBookmarkPost, useLikePost } from "./hooks";

interface PostActionsProps {
  post: Post;
  /** Called by the comment button; without it the button opens the detail page. */
  onComment?: () => void;
  className?: string;
}

interface ActionProps {
  label: string;
  onClick?: () => void;
  to?: string;
  active?: boolean;
  activeClass?: string;
  count?: number;
  children: ReactNode;
}

function Action({ label, onClick, to, active, activeClass, count, children }: ActionProps) {
  const content = (
    <>
      {children}
      {typeof count === "number" && count > 0 && (
        <motion.span layout className="tabular text-xs font-medium">
          {formatCount(count)}
        </motion.span>
      )}
    </>
  );

  const className = cn(
    "group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition-colors",
    active
      ? (activeClass ?? "text-brand-500")
      : "text-subtle hover:bg-surface-2 hover:text-foreground",
  );

  if (to) {
    return (
      <Link to={to} aria-label={label} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} onClick={onClick} className={className}>
      {content}
    </button>
  );
}

/**
 * Like / reply / bookmark / share row. Every control mutates through the
 * optimistic hooks in `./hooks`, so counts update before the server answers.
 */
export function PostActions({ post, onComment, className }: PostActionsProps) {
  const me = useAuthStore((state) => state.user);
  const reduced = useReducedMotion();
  const like = useLikePost();
  const bookmark = useBookmarkPost();

  const liked = isLiked(post, me?._id);
  const saved = isBookmarked(post, me?._id);

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post._id}`;
    const payload = { title: "Wolvinix", text: truncate(post.text, 90), url };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(payload);
      } catch {
        /* the reader dismissed the share sheet */
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <Action
        label={liked ? "Unlike post" : "Like post"}
        active={liked}
        activeClass="text-danger"
        onClick={() => like.mutate(post)}
        count={post.likesCount}
      >
        <motion.span
          key={liked ? "liked" : "plain"}
          initial={liked && !reduced ? { scale: 0.4 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 13 }}
          className="inline-flex"
        >
          <Heart
            className={cn(
              "h-5 w-5 transition-colors",
              liked ? "fill-danger text-danger" : "group-hover:text-danger",
            )}
          />
        </motion.span>
      </Action>

      <Action
        label="Reply to post"
        onClick={onComment}
        to={onComment ? undefined : `/post/${post._id}`}
        count={post.repliesCount}
      >
        <MessageCircle className="h-5 w-5" />
      </Action>

      <Action
        label={saved ? "Remove bookmark" : "Bookmark post"}
        active={saved}
        activeClass="text-brand-500"
        onClick={() => bookmark.mutate(post)}
        count={post.bookmarksCount}
      >
        <Bookmark className={cn("h-5 w-5", saved && "fill-brand-500")} />
      </Action>

      <Action label="Share post" onClick={handleShare}>
        <Share2 className="h-5 w-5" />
      </Action>
    </div>
  );
}
