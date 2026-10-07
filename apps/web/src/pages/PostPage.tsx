import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Avatar, EmptyState, PostSkeleton } from "@/components/ui/Card";
import { errorMessage } from "@/lib/api";
import { PostCard } from "@/features/posts/PostCard";
import { ReplyComposer } from "@/features/posts/ReplyComposer";
import { usePost } from "@/features/posts/hooks";

/** Single post with its full reply thread and an inline composer. */
export default function PostPage() {
  const { postId = "" } = useParams();
  const navigate = useNavigate();
  const query = usePost(postId);

  const post = query.data;
  const replies = post?.replies ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <IconButton label="Go back" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <h1 className="font-display text-xl font-bold">Post</h1>
      </div>

      {query.isLoading && <PostSkeleton />}

      {query.isError && (
        <EmptyState
          icon={<CircleAlert className="h-6 w-6" />}
          title="This post is unavailable"
          description={errorMessage(query.error, "It may have been deleted, or the link is wrong.")}
          action={
            <Button variant="gradient" onClick={() => navigate("/")}>
              Back to feed
            </Button>
          }
        />
      )}

      {post && (
        <>
          <PostCard post={post} onDelete={() => navigate("/")} />

          <section className="card p-4 sm:p-5">
            <h2 className="font-display text-subtle mb-4 text-sm font-semibold tracking-wider uppercase">
              Replies
            </h2>

            {replies.length === 0 ? (
              <EmptyState
                title="No replies yet"
                description="Jump in — start the conversation on this post."
              />
            ) : (
              <ul className="space-y-4">
                {replies.map((reply, index) => (
                  <motion.li
                    key={reply._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: Math.min(index, 6) * 0.04,
                      type: "spring",
                      stiffness: 300,
                      damping: 26,
                    }}
                    className="flex gap-3"
                  >
                    <Link
                      to={`/profile/${reply.user.username}`}
                      className="shrink-0"
                      aria-label={`${reply.user.name}'s profile`}
                    >
                      <Avatar size="sm" src={reply.user.profilePic} name={reply.user.name} />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
                        <Link
                          to={`/profile/${reply.user.username}`}
                          className="font-semibold hover:underline"
                        >
                          {reply.user.name}
                        </Link>
                        <span className="text-subtle">@{reply.user.username}</span>
                        <span aria-hidden="true" className="text-subtle">
                          ·
                        </span>
                        <span className="text-subtle">
                          {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm leading-relaxed break-words whitespace-pre-wrap">
                        {reply.text}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}

            <div className="border-border mt-5 border-t pt-4">
              <ReplyComposer postId={post._id} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
