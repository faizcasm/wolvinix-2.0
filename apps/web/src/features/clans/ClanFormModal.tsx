import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { Avatar } from "@/components/ui/Card";
import { errorMessage } from "@/lib/api";
import { uploadClanImage, useCreateClan, useUpdateClan, type ClanFormValues } from "./hooks";
import { toast } from "sonner";
import type { Clan } from "@/types";

interface ClanFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Present ⇒ edit mode, otherwise a brand new clan is created. */
  clan?: Clan;
}

/** Shared create/edit dialog for a clan's crest, name, motto and blurb. */
export function ClanFormModal({ open, onClose, clan }: ClanFormModalProps) {
  const editing = Boolean(clan);
  const create = useCreateClan();
  const update = useUpdateClan();

  const [name, setName] = useState("");
  const [motto, setMotto] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [nameError, setNameError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);

  /* seed the form whenever the dialog opens */
  useEffect(() => {
    if (!open) return;
    setName(clan?.name ?? "");
    setMotto(clan?.motto ?? "");
    setDescription(clan?.description ?? "");
    setNameError("");
    setFile(null);
    if (previewUrl.current) {
      URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = null;
    }
    setPreview(null);
  }, [open, clan]);

  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );

  const busy = create.isPending || update.isPending;

  const pickFile = (next: File | null) => {
    setFile(next);
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = next ? URL.createObjectURL(next) : null;
    setPreview(previewUrl.current);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setNameError("Clan names need at least 3 characters");
      return;
    }
    setNameError("");

    try {
      let clanProfile = clan?.clanProfile;
      if (file) clanProfile = await uploadClanImage(file);

      const values: ClanFormValues = {
        name: trimmed,
        motto: motto.trim(),
        description: description.trim(),
        clanProfile,
      };

      if (clan) {
        update.mutate({ clanId: clan._id, values }, { onSuccess: () => onClose() });
      } else {
        create.mutate(values, { onSuccess: () => onClose() });
      }
    } catch (error) {
      toast.error(errorMessage(error, "Could not upload the clan crest"));
    }
  };

  const crestName = file?.name || clan?.name || "Your clan";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit clan" : "Create a clan"}
      description={
        editing
          ? "Update how your clan shows up across Wolvinix."
          : "Rally your squad under one banner. You can lead one clan at a time."
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar
              src={preview ?? clan?.clanProfile}
              name={crestName}
              size="xl"
              className="ring-brand-500/40 ring-2"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Upload clan crest"
              className="border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border shadow transition-colors"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="text-muted min-w-0 flex-1 text-sm">
            <p className="text-foreground font-medium">Clan crest</p>
            <p className="text-xs">{file ? file.name : "PNG or JPG — a square works best."}</p>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
              >
                Choose image
              </Button>
              {file && (
                <Button type="button" size="sm" variant="ghost" onClick={() => pickFile(null)}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <Field label="Clan name" required error={nameError}>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Night Howlers"
            maxLength={40}
            autoFocus
            invalid={Boolean(nameError)}
          />
        </Field>

        <Field label="Motto" hint="One line the whole pack can shout.">
          <Input
            value={motto}
            onChange={(event) => setMotto(event.target.value)}
            placeholder="Fast paws, faster respawns"
            maxLength={80}
          />
        </Field>

        <Field label="Description" hint={`${description.length}/400 characters`}>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, 400))}
            placeholder="What is this clan about? Games you play, times you run, how to join."
            className="min-h-[110px]"
            maxLength={400}
          />
        </Field>

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-subtle max-w-[45%] text-xs">
            {clan?.clanProfile || file
              ? "Custom crest uploaded"
              : "No crest yet — we generate one from the name"}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" loading={busy}>
              {editing ? "Save changes" : "Create clan"}
            </Button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;
            if (next) pickFile(next);
            event.target.value = "";
          }}
        />
      </form>
    </Modal>
  );
}

export default ClanFormModal;
