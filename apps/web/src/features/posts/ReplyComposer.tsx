import { useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Avatar } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Form";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import type { Reply } from "@/types";
import { useAddReply } from "./hooks";

interface ReplyComposerProps {
  postId: string;
  /** Fires after the optimistic reply is queued. */
  onReply?: (reply: Reply) => void;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}

const MAX_LENGTH = 500;

/** Inline reply box used on the post detail page and inside the feed. */
export function ReplyComposer({
  postId,
  onReply,
  autoFocus,
  placeholder = "Post your reply",
  className,
}: ReplyComposerProps) {
  const me = useAuthStore((state) => state.user);
  const reply = useAddReply();
  const [text, setText] = useState("");

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && text.length <= MAX_LENGTH && !reply.isPending;

  const submit = () => {
    if (!canSend) return;
    reply.mutate(
      { postId, text: trimmed },
      {
        onSuccess: (created) => {
          setText("");
          onReply?.(created);
        },
      },
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <Avatar size="sm" src={me?.profilePic} name={me?.name} className="mt-1" />

      <div className="min-w-0 flex-1">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          maxLength={MAX_LENGTH}
          rows={2}
          aria-label="Write a reply"
          placeholder={placeholder}
          className="min-h-[72px]"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <span
            className={cn(
              "tabular text-xs",
              text.length > MAX_LENGTH ? "text-danger" : "text-subtle",
            )}
          >
            {text.length > 0 ? `${text.length}/${MAX_LENGTH}` : "Ctrl + Enter to send"}
          </span>
          <Button
            size="sm"
            variant="gradient"
            onClick={submit}
            disabled={!canSend}
            loading={reply.isPending}
            rightIcon={<Send className="h-4 w-4" />}
          >
            Reply
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ReplyComposer;
