import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Clock, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { clockLabel } from "./format";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
  mine: boolean;
  showAvatar?: boolean;
  avatar?: ReactNode;
  onImageClick: (url: string) => void;
}

/** A single chat bubble — right/accent for me, left/surface for the peer. */
export function MessageBubble({
  message,
  mine,
  showAvatar,
  avatar,
  onImageClick,
}: MessageBubbleProps) {
  const pending = message._id.startsWith("tmp-");
  const text = message.text?.trim();
  const imageUrl = message.imageUrl?.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={cn("flex w-full items-end gap-2", mine ? "justify-end" : "justify-start")}
    >
      {!mine && (
        <span className={cn("w-7 shrink-0", showAvatar ? "" : "invisible")} aria-hidden="true">
          {avatar}
        </span>
      )}

      <div
        className={cn(
          "group relative max-w-[78%] px-3.5 py-2.5",
          mine
            ? "bg-accent text-background rounded-2xl rounded-br-md"
            : "border-border bg-surface-2 text-foreground rounded-2xl rounded-bl-md border",
          pending && "opacity-70",
        )}
      >
        {imageUrl && (
          <button
            type="button"
            onClick={() => onImageClick(imageUrl)}
            className="mb-1.5 block w-full overflow-hidden rounded-xl transition-transform hover:scale-[1.01]"
            aria-label="Open image full size"
          >
            <img
              src={imageUrl}
              alt={text ? `Image shared with: ${text}` : "Shared image"}
              loading="lazy"
              className="max-h-72 w-full rounded-xl object-cover"
            />
          </button>
        )}

        {text && <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{text}</p>}

        <span
          className={cn(
            "tabular mt-1 flex items-center justify-end gap-1 text-[10px]",
            mine ? "text-background/70" : "text-subtle",
          )}
        >
          {clockLabel(message.createdAt)}
          {mine &&
            (pending ? (
              <Clock className="h-3 w-3" aria-label="Sending" />
            ) : message.seen ? (
              <CheckCheck className="h-3.5 w-3.5" aria-label="Seen" />
            ) : (
              <Check className="h-3.5 w-3.5" aria-label="Delivered" />
            ))}
        </span>
      </div>
    </motion.div>
  );
}

/** Shown inside a brand new thread so it never reads as a broken pane. */
export function EmptyThreadHint({ peerName }: { peerName: string }) {
  return (
    <div className="border-border mx-auto flex max-w-xs flex-col items-center gap-2 rounded-2xl border border-dashed px-5 py-8 text-center">
      <span className="bg-brand-500/10 text-brand-500 flex h-11 w-11 items-center justify-center rounded-2xl">
        <ImageIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium">This is the start of your chat</p>
      <p className="text-muted text-xs">Send {peerName} a message, a photo, or an emoji.</p>
    </div>
  );
}
