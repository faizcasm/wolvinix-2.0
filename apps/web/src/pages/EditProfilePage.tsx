import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Camera, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Card";
import { PasswordInput, Input, Textarea } from "@/components/ui/Form";
import { errorMessage, post } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { LabeledField } from "@/features/auth/fields";
import { emailField, usernameField } from "@/features/auth/schemas";
import type { User } from "@/types";

const MAX_AVATAR_BYTES = 15 * 1024 * 1024;
const BIO_MAX = 160;
const NAME_MAX = 40;

/**
 * Hand-written value type — `z.infer` would mark every field optional because
 * the app compiles with `strict: false`.
 */
interface EditFormValues {
  name: string;
  username: string;
  email: string;
  bio: string;
  password: string;
  confirmPassword: string;
}

const editSchema = z
  .object({
    name: z.string().trim().min(2, "Tell us your name").max(NAME_MAX, `Max ${NAME_MAX} characters`),
    username: usernameField,
    email: emailField,
    bio: z.string().max(BIO_MAX, `Keep your bio under ${BIO_MAX} characters`),
    password: z.string().max(72, "Passwords are capped at 72 characters"),
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!values.password) return;
    if (values.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 8,
        type: "string",
        inclusive: true,
        message: "Use at least 8 characters",
        path: ["password"],
      });
    }
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

function Counter({ value, max }: { value: number; max: number }) {
  const over = value > max;
  return (
    <span
      className={cn("tabular text-xs", over ? "text-danger" : "text-subtle")}
      aria-live="polite"
    >
      {value}/{max}
    </span>
  );
}

export default function EditProfilePage() {
  const navigate = useNavigate();
  const me = useAuthStore((state) => state.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(me?.profilePic ?? "");
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: me?.name ?? "",
      username: me?.username ?? "",
      email: me?.email ?? "",
      bio: me?.bio ?? "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const bio = watch("bio") ?? "";

  const pickAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file (JPEG, PNG, WebP or GIF)");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("That image is over the 15 MB limit");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(String(reader.result ?? ""));
      setAvatarRemoved(false);
      setAvatarFile(file);
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setPreview("");
    setAvatarRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return undefined;
    const formData = new FormData();
    formData.append("file", avatarFile);
    const uploaded = await post<{ url: string }>("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return uploaded.url;
  };

  const onSubmit = async (values: EditFormValues) => {
    if (!me) return;
    setSaving(true);
    try {
      const body: Partial<User> & { password?: string } = {
        name: values.name.trim(),
        username: values.username.trim(),
        email: values.email.trim(),
        bio: values.bio.trim(),
      };

      if (avatarFile) body.profilePic = (await uploadAvatar()) ?? me.profilePic;
      else if (avatarRemoved) body.profilePic = "";
      else body.profilePic = preview;

      if (values.password) body.password = values.password;

      await useAuthStore.getState().updateProfile(body);
      toast.success("Profile updated", { description: "Looking sharp, player." });
      navigate(-1);
    } catch (error) {
      toast.error(errorMessage(error, "Could not save your profile"));
    } finally {
      setSaving(false);
    }
  };

  if (!me) return <Navigate to="/auth" replace />;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
        <h1 className="font-display text-lg font-bold">Edit profile</h1>
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Avatar */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 sm:p-5"
        >
          <h2 className="font-display text-subtle text-sm font-semibold tracking-wider uppercase">
            Avatar
          </h2>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="relative">
              <span
                aria-hidden="true"
                className="from-brand-500 via-accent to-lime absolute -inset-1 rounded-full bg-gradient-to-br opacity-70"
              />
              <Avatar src={preview || undefined} name={me.name} size="2xl" className="relative" />
            </div>

            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                id="avatar-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="sr-only"
                onChange={(event) => pickAvatar(event.target.files?.[0])}
              />
              <label
                htmlFor="avatar-file"
                className="border-border-strong hover:bg-surface-2 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                {avatarFile ? "Choose another" : "Upload photo"}
              </label>
              {(preview || avatarRemoved) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => {
                    if (avatarRemoved) {
                      setPreview(me.profilePic ?? "");
                      setAvatarRemoved(false);
                      setAvatarFile(null);
                    } else {
                      removeAvatar();
                    }
                  }}
                >
                  {avatarRemoved ? "Restore current" : "Remove"}
                </Button>
              )}
              <p className="text-subtle text-xs">JPEG, PNG, WebP or GIF — up to 15 MB.</p>
            </div>
          </div>
        </motion.section>

        {/* Identity */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="card space-y-4 p-4 sm:p-5"
        >
          <h2 className="font-display text-subtle text-sm font-semibold tracking-wider uppercase">
            Identity
          </h2>

          <LabeledField id="edit-name" label="Display name" required error={errors.name?.message}>
            <Input
              id="edit-name"
              type="text"
              autoComplete="name"
              maxLength={NAME_MAX}
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </LabeledField>

          <LabeledField
            id="edit-username"
            label="Username"
            required
            error={errors.username?.message}
            hint="Letters, numbers and underscores only."
          >
            <Input
              id="edit-username"
              type="text"
              autoComplete="username"
              maxLength={20}
              aria-invalid={Boolean(errors.username)}
              {...register("username")}
            />
          </LabeledField>

          <LabeledField id="edit-email" label="Email" required error={errors.email?.message}>
            <Input
              id="edit-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </LabeledField>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="edit-bio" className="text-muted text-sm font-medium">
                Bio
              </label>
              <Counter value={bio.length} max={BIO_MAX} />
            </div>
            <Textarea
              id="edit-bio"
              maxLength={BIO_MAX}
              placeholder="Main games, rank, clan motto — make it yours."
              invalid={Boolean(errors.bio)}
              aria-invalid={Boolean(errors.bio)}
              {...register("bio")}
            />
            {errors.bio && (
              <p role="alert" className="text-danger text-xs font-medium">
                {errors.bio.message}
              </p>
            )}
          </div>
        </motion.section>

        {/* Password */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="card space-y-4 p-4 sm:p-5"
        >
          <div>
            <h2 className="font-display text-subtle text-sm font-semibold tracking-wider uppercase">
              Change password
            </h2>
            <p className="text-subtle mt-1 text-xs">Optional — leave both blank to keep it.</p>
          </div>

          <LabeledField id="edit-password" label="New password" error={errors.password?.message}>
            <PasswordInput
              id="edit-password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              invalid={Boolean(errors.password)}
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
          </LabeledField>

          <LabeledField
            id="edit-password-confirm"
            label="Confirm new password"
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              id="edit-password-confirm"
              autoComplete="new-password"
              placeholder="Repeat it"
              invalid={Boolean(errors.confirmPassword)}
              aria-invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
          </LabeledField>
        </motion.section>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="lg" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" aria-hidden="true" />}
          >
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
