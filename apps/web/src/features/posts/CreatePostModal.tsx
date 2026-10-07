import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Hash, Image as ImageIcon, Plus, Send, Tag, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button, IconButton } from "@/components/ui/Button";
import { Avatar, Spinner } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { get } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import type { CompactUser } from "@/types";
import { useCreatePost } from "./CreatePostContext";
import { resolveMedia, useSubmitPost, type AttachedMedia } from "./hooks";

const MAX_LENGTH = 500;

/** Global composer — also reachable from the rail, feed entry and hashtags. */
export default function CreatePostModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { seed } = useCreatePost();
  const me = useAuthStore((state) => state.user);
  const publisher = useSubmitPost();

  const [text, setText] = useState("");
  const [media, setMedia] = useState<AttachedMedia | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [tagged, setTagged] = useState<CompactUser[]>([]);
  const [tagQuery, setTagQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [tagOpen, setTagOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  /* Prefill from `openWithSeed("#tag ")` / quoting. */
  useEffect(() => {
    if (open) setText(seed);
  }, [open, seed]);

  /* Debounced people search. */
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(tagQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [tagQuery]);

  const { data: matches, isFetching } = useQuery<CompactUser[], Error>({
    queryKey: ["post-tag-search", debounced],
    queryFn: () => get<CompactUser[]>("/users/search", { params: { q: debounced, limit: 6 } }),
    enabled: tagOpen && debounced.length >= 2,
    staleTime: 30_000,
  });

  const results = (matches ?? []).filter(
    (candidate) => !tagged.some((person) => person._id === candidate._id),
  );

  const hashtags = Array.from(new Set(text.match(/#[A-Za-z0-9_]+/g) ?? [])).slice(0, 5);
  const trimmed = text.trim();
  const overLimit = text.length > MAX_LENGTH;
  const ready = trimmed.length > 0 && !overLimit && !attaching && !publisher.isPending;

  const reset = () => {
    setText("");
    setMedia(null);
    setTagged([]);
    setTagQuery("");
    setDebounced("");
    setTagOpen(false);
  };

  const handleSubmit = () => {
    if (!ready) return;
    publisher.mutate(
      {
        text: trimmed,
        mediaUrl: media?.url,
        mediaType: media?.mediaType,
        tags: tagged.map((person) => person._id),
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Only images and videos can be attached");
      return;
    }
    setAttaching(true);
    try {
      const next = await resolveMedia(file);
      setMedia(next);
    } catch {
      toast.error("Could not attach that file");
    } finally {
      setAttaching(false);
    }
  };

  const addTag = (person: CompactUser) => {
    setTagged((current) => [...current, person]);
    setTagQuery("");
    setDebounced("");
    tagInputRef.current?.focus();
  };

  const removeTag = (id: string) => {
    setTagged((current) => current.filter((person) => person._id !== id));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create post"
      description="Share the grind with your pack"
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar src={me?.profilePic} name={me?.name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{me?.name ?? "You"}</p>
            <p className="text-subtle truncate text-xs">@{me?.username ?? "you"}</p>
          </div>
        </div>

        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What are you playing tonight?"
          aria-label="Post text"
          maxLength={MAX_LENGTH + 40}
          className="min-h-[128px]"
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-subtle text-xs">Ctrl / ⌘ + Enter to post</p>
          <span
            className={cn("tabular text-xs", overLimit ? "text-danger" : "text-subtle")}
            aria-live="polite"
          >
            {text.length}/{MAX_LENGTH}
          </span>
        </div>

        {media && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-border bg-surface-2 relative overflow-hidden rounded-xl border"
          >
            {media.mediaType === "video" ? (
              <video
                src={media.url}
                controls
                playsInline
                aria-label="Selected video preview"
                className="bg-background max-h-64 w-full object-contain"
              />
            ) : (
              <img
                src={media.url}
                alt="Selected photo preview"
                className="max-h-64 w-full object-cover"
              />
            )}
            <IconButton
              label="Remove attachment"
              variant="secondary"
              onClick={() => setMedia(null)}
              className="bg-elevated/80 absolute top-2 right-2 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </motion.div>
        )}

        {attaching && (
          <div className="border-border bg-surface-2 text-muted flex items-center gap-2 rounded-xl border px-3 py-2 text-xs">
            <Spinner className="h-4 w-4" />
            Preparing your media…
          </div>
        )}

        {/* People tagging */}
        <div className="space-y-2">
          <div className="relative">
            <Input
              ref={tagInputRef}
              value={tagQuery}
              onChange={(event) => setTagQuery(event.target.value)}
              onFocus={() => setTagOpen(true)}
              onBlur={() => setTagOpen(false)}
              placeholder="Search people to tag"
              aria-label="Search people to tag"
              leftIcon={<Tag className="h-4 w-4" />}
            />

            <AnimatePresence>
              {tagOpen && debounced.length >= 2 && (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14 }}
                  className="border-border bg-elevated absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border p-1 shadow-lg"
                >
                  {isFetching && (
                    <li className="text-subtle flex items-center gap-2 px-3 py-2 text-xs">
                      <Spinner className="h-3.5 w-3.5" />
                      Searching…
                    </li>
                  )}
                  {!isFetching && results.length === 0 && (
                    <li className="text-subtle px-3 py-2 text-xs">No people found</li>
                  )}
                  {results.map((person) => (
                    <li key={person._id}>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => addTag(person)}
                        className="hover:bg-surface-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors"
                      >
                        <Avatar size="xs" src={person.profilePic} name={person.name} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{person.name}</span>
                          <span className="text-subtle block truncate text-xs">
                            @{person.username}
                          </span>
                        </span>
                        <Plus className="text-subtle h-4 w-4 shrink-0" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          {tagged.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tagged.map((person) => (
                <span
                  key={person._id}
                  className="border-brand-500/40 bg-brand-500/10 text-brand-500 inline-flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-0.5 text-xs"
                >
                  <Avatar size="xs" src={person.profilePic} name={person.name} />@{person.username}
                  <button
                    type="button"
                    aria-label={`Remove ${person.name}`}
                    onClick={() => removeTag(person._id)}
                    className="text-subtle hover:text-foreground rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hashtag preview */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-subtle inline-flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" aria-hidden="true" />
              Trending with
            </span>
            {hashtags.map((tag) => (
              <Link
                key={tag}
                to={`/hashtag/${tag.slice(1)}`}
                onClick={onClose}
                className="bg-accent-soft text-accent hover:bg-accent hover:text-background rounded-full px-2 py-0.5 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="flex items-center gap-1">
            <IconButton
              label={media ? "Replace attachment" : "Attach image or video"}
              onClick={() => fileRef.current?.click()}
              disabled={attaching}
            >
              <ImageIcon className="h-5 w-5" />
            </IconButton>
            <IconButton
              label="Tag friends"
              onClick={() => {
                setTagOpen(true);
                tagInputRef.current?.focus();
              }}
            >
              <Users className="h-5 w-5" />
            </IconButton>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                handleFile(file);
              }}
            />
          </div>

          <Button
            variant="gradient"
            onClick={handleSubmit}
            disabled={!ready}
            loading={publisher.isPending}
            rightIcon={<Send className="h-4 w-4" />}
          >
            Post
          </Button>
        </div>
      </div>
    </Modal>
  );
}
