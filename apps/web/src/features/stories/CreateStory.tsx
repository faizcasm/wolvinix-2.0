import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Button, IconButton } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { errorMessage, post } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import type { MediaType, Story } from "@/types";
import { readVideoDuration, resolveMedia, type AttachedMedia } from "@/features/posts/hooks";

const MAX_VIDEO_SECONDS = 30;

/** 9:16 picker + preview used to publish a 24h story. */
export function CreateStory({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [media, setMedia] = useState<AttachedMedia | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const publish = useMutation<Story, Error, { mediaUrl: string; mediaType: MediaType }>({
    mutationFn: (body) => post<Story>("/stories", body),
    onSuccess: () => {
      toast.success("Story posted");
      queryClient.invalidateQueries({ queryKey: queryKeys.stories });
      setMedia(null);
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not share your story")),
  });

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Pick a photo or a short clip");
      return;
    }

    setBusy(true);
    try {
      if (file.type.startsWith("video/")) {
        const seconds = await readVideoDuration(file);
        if (seconds > MAX_VIDEO_SECONDS) {
          toast.error("Stories are limited to 30 seconds");
          return;
        }
      }
      const next = await resolveMedia(file);
      setMedia(next);
    } catch {
      toast.error("Could not read that file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your story"
      description="Photos and clips up to 30 seconds — live for 24 hours"
      size="md"
    >
      <div className="space-y-4">
        <div className="border-border bg-surface-2 mx-auto flex aspect-[9/16] max-h-[52vh] w-full max-w-[280px] items-center justify-center overflow-hidden rounded-2xl border">
          {media ? (
            media.mediaType === "video" ? (
              <video
                src={media.url}
                controls
                playsInline
                aria-label="Story preview"
                className="bg-background h-full w-full object-contain"
              />
            ) : (
              <img src={media.url} alt="Story preview" className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <span className="bg-brand-500/10 text-brand-500 flex h-12 w-12 items-center justify-center rounded-2xl">
                <Camera className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-muted text-sm">
                Pick a photo or a short clip to share with your pack for 24 hours.
              </p>
            </div>
          )}
        </div>

        {busy && (
          <div className="border-border bg-surface-2 text-muted flex items-center gap-2 rounded-xl border px-3 py-2 text-xs">
            <Spinner className="h-4 w-4" />
            Preparing your media…
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              leftIcon={<ImageIcon className="h-4 w-4" />}
            >
              {media ? "Replace" : "Choose file"}
            </Button>

            {media && (
              <IconButton
                label="Remove selected media"
                onClick={() => setMedia(null)}
                disabled={publish.isPending}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </IconButton>
            )}
          </div>

          <Button
            variant="gradient"
            onClick={() => {
              if (media) publish.mutate({ mediaUrl: media.url, mediaType: media.mediaType });
            }}
            disabled={!media}
            loading={publish.isPending}
          >
            Share story
          </Button>
        </div>

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
    </Modal>
  );
}

export default CreateStory;
