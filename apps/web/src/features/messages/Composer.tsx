import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Image as ImageIcon, Loader2, Send, Smile, X } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { errorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { emitTyping, uploadImage } from "./hooks";
import type { SendPayload } from "./hooks";

interface ComposerProps {
  conversationId: string;
  onSend: (payload: SendPayload) => Promise<boolean>;
}

/** Text + emoji + image composer. Enter sends, Shift+Enter breaks the line. */
export function Composer({ conversationId, onSend }: ComposerProps) {
  const [text, setText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const theme = useAuthStore((state) => state.theme);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<number | null>(null);
  const previewUrl = useRef<string | null>(null);

  const clearAttachment = () => {
    setFile(null);
    setPreview(null);
    if (previewUrl.current) {
      URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = null;
    }
  };

  const pickAttachment = (next: File | null) => {
    setFile(next);
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = next ? URL.createObjectURL(next) : null;
    setPreview(previewUrl.current);
  };

  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );

  /* typing heartbeat — one start per burst, one stop when it goes quiet */
  const signalTyping = () => {
    emitTyping(conversationId, true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      emitTyping(conversationId, false);
      typingTimer.current = null;
    }, 1600);
  };

  const stopTyping = () => {
    if (typingTimer.current) {
      window.clearTimeout(typingTimer.current);
      typingTimer.current = null;
      emitTyping(conversationId, false);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      typingTimer.current = null;
      emitTyping(conversationId, false);
    };
  }, [conversationId]);

  /* close the emoji tray on outside click / escape */
  useEffect(() => {
    if (!pickerOpen) return;
    const handlePointer = (event: MouseEvent) => {
      if (wrapperRef.current?.contains(event.target as Node)) return;
      setPickerOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [pickerOpen]);

  const resize = () => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 148)}px`;
  };

  const submit = async () => {
    const trimmed = text.trim();
    if (busy || (!trimmed && !file)) return;

    setBusy(true);
    try {
      let imageUrl: string | undefined;
      if (file) imageUrl = await uploadImage(file);
      const sent = await onSend({ text: trimmed || undefined, imageUrl });
      if (sent) {
        setText("");
        clearAttachment();
        stopTyping();
        requestAnimationFrame(resize);
      }
    } catch (error) {
      toast.error(errorMessage(error, "Could not attach that image"));
    } finally {
      setBusy(false);
    }
  };

  const canSend = Boolean(text.trim() || file) && !busy;

  return (
    <div ref={wrapperRef} className="border-border bg-elevated relative border-t p-3">
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="border-border bg-surface-2 mb-2 flex items-center gap-3 rounded-xl border p-2"
          >
            <img
              src={preview}
              alt="Attachment preview"
              className="h-14 w-14 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file?.name}</p>
              <p className="text-subtle text-xs">Ready to send</p>
            </div>
            <IconButton label="Remove attachment" onClick={() => pickAttachment(null)}>
              <X className="h-4 w-4" />
            </IconButton>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        <IconButton label="Attach image" onClick={() => fileRef.current?.click()} disabled={busy}>
          <ImageIcon className="h-5 w-5" />
        </IconButton>

        <label className="sr-only" htmlFor="message-composer">
          Message
        </label>
        <textarea
          id="message-composer"
          ref={inputRef}
          rows={1}
          value={text}
          placeholder="Write a message…"
          onChange={(event) => {
            setText(event.target.value);
            signalTyping();
            resize();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void submit();
            }
          }}
          className="border-border bg-surface-2 text-foreground placeholder:text-subtle hover:border-border-strong focus:border-brand-500 max-h-[148px] min-h-[44px] flex-1 resize-none rounded-2xl border px-4 py-3 text-sm leading-relaxed transition-colors outline-none"
        />

        <IconButton
          label={pickerOpen ? "Close emoji picker" : "Open emoji picker"}
          onClick={() => setPickerOpen((open) => !open)}
          disabled={busy}
          aria-expanded={pickerOpen}
        >
          <Smile className={cn("h-5 w-5 transition-colors", pickerOpen ? "text-brand-500" : "")} />
        </IconButton>

        <IconButton
          label="Send message"
          variant="primary"
          onClick={() => void submit()}
          disabled={!canSend}
          className={cn(!canSend && "opacity-40")}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </IconButton>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const next = event.target.files?.[0] ?? null;
          if (next) pickAttachment(next);
          event.target.value = "";
        }}
      />

      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="border-border absolute right-2 bottom-full z-30 mb-2 overflow-hidden rounded-2xl border shadow-lg"
          >
            <EmojiPicker
              onEmojiClick={(emoji) => {
                setText((current) => current + emoji.emoji);
                setPickerOpen(false);
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
              theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
              width={300}
              height={380}
              lazyLoadEmojis
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
