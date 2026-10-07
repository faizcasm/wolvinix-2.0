import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Info,
  LifeBuoy,
  LogOut,
  Mail,
  Moon,
  Palette,
  Snowflake,
  Sun,
  Trash2,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Switch } from "@/components/ui/Form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { del, errorMessage, post } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

/* ------------------------------- Primitives ------------------------------- */

function Section({
  icon,
  title,
  description,
  children,
  tone = "default",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      className={cn("card p-4 sm:p-5", tone === "danger" && "border-danger/40")}
    >
      <header className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            tone === "danger" ? "bg-danger-soft text-danger" : "bg-brand-500/15 text-brand-500",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2
            className={cn(
              "font-display text-base font-semibold",
              tone === "danger" && "text-danger",
            )}
          >
            {title}
          </h2>
          <p className="text-muted mt-0.5 text-xs leading-relaxed">{description}</p>
        </div>
      </header>
      <div className="mt-4">{children}</div>
    </motion.section>
  );
}

function Row({
  icon,
  label,
  hint,
  action,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  hint?: string;
  action: React.ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="text-subtle mt-0.5 block text-xs">{hint}</span>}
      </span>
      <span className="text-subtle flex shrink-0 items-center gap-2">{action}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="border-border bg-surface-2 hover:border-brand-500/40 flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors"
      >
        {icon && <span className="text-brand-500">{icon}</span>}
        {content}
      </button>
    );
  }

  return (
    <div className="border-border bg-surface-2 flex items-center gap-3 rounded-xl border px-3.5 py-3">
      {icon && <span className="text-brand-500">{icon}</span>}
      {content}
    </div>
  );
}

/* --------------------------------- Page ----------------------------------- */

export default function SettingsPage() {
  const navigate = useNavigate();
  const theme = useAuthStore((state) => state.theme);
  const toggleTheme = useAuthStore((state) => state.toggleTheme);
  const me = useAuthStore((state) => state.user);

  const [frozen, setFrozen] = useState(me?.isFrozen ?? false);

  useEffect(() => {
    setFrozen(me?.isFrozen ?? false);
  }, [me?.isFrozen]);

  const [confirmFreeze, setConfirmFreeze] = useState(false);
  const [preferences, setPreferences] = useState({
    push: true,
    emailDigest: false,
    autoplay: true,
    presence: true,
  });
  const [deleteStep, setDeleteStep] = useState<"idle" | "typed" | "confirm">("idle");
  const [typedConfirmation, setTypedConfirmation] = useState("");

  const freezeMutation = useMutation({
    mutationFn: (next: boolean) => post<{ ok: boolean }>("/users/me/freeze", { frozen: next }),
    onSuccess: async (_data, next) => {
      setFrozen(next);
      await useAuthStore.getState().refresh();
      toast.success(next ? "Account frozen" : "Account unfrozen", {
        description: next
          ? "Your profile is hidden until you unfreeze it."
          : "Welcome back — your profile is visible again.",
      });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not update your account")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => del<{ ok: boolean }>("/users/me"),
    onSuccess: () => {
      useAuthStore.getState().clear();
      toast.success("Account deleted", { description: "Sorry to see you go, player." });
      navigate("/auth", { replace: true });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete your account")),
  });

  const logout = async () => {
    await useAuthStore.getState().logout();
    navigate("/auth", { replace: true });
  };

  const preferencesRows: Array<{
    key: keyof typeof preferences;
    label: string;
    hint: string;
    icon: React.ReactNode;
  }> = [
    {
      key: "push",
      label: "Push notifications",
      hint: "Likes, replies, follows and clan pings.",
      icon: <Mail className="h-4 w-4" aria-hidden="true" />,
    },
    {
      key: "emailDigest",
      label: "Weekly email digest",
      hint: "A summary of your week in the pack.",
      icon: <Info className="h-4 w-4" aria-hidden="true" />,
    },
    {
      key: "autoplay",
      label: "Autoplay media",
      hint: "Play videos in the feed without tapping.",
      icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
    },
    {
      key: "presence",
      label: "Show my status",
      hint: "Let friends see when you're online.",
      icon: <LifeBuoy className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-6">
      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-muted mt-1 text-sm">
          Tune Wolvinix the way you like it, {me?.name ?? "player"}.
        </p>
      </motion.header>

      {/* Appearance */}
      <Section
        icon={<Palette className="h-5 w-5" aria-hidden="true" />}
        title="Appearance"
        description="Dark-first, but the light theme is there when the sun is up."
      >
        <Row
          icon={
            theme === "dark" ? (
              <Moon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Sun className="h-4 w-4" aria-hidden="true" />
            )
          }
          label="Dark mode"
          hint={`Currently using the ${theme} theme`}
          action={
            <Switch
              checked={theme === "dark"}
              onChange={() => toggleTheme()}
              label="Toggle dark mode"
            />
          }
        />
      </Section>

      {/* Account */}
      <Section
        icon={<UserCog className="h-5 w-5" aria-hidden="true" />}
        title="Account"
        description="Your identity, handle and account state."
      >
        <div className="space-y-3">
          <Row
            label="Profile"
            hint={`@${me?.username ?? ""} · ${me?.email ?? "no email on file"}`}
            onClick={() => navigate("/settings/profile")}
            action={
              <span className="text-accent inline-flex items-center gap-1 text-sm font-medium">
                Edit <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            }
          />
          <Row
            icon={<Snowflake className="h-4 w-4" aria-hidden="true" />}
            label="Freeze account"
            hint="Hide your profile and pause activity until you're back."
            action={
              <Switch
                checked={frozen}
                onChange={() => setConfirmFreeze(true)}
                disabled={freezeMutation.isPending}
                label="Freeze account"
              />
            }
          />
        </div>
      </Section>

      {/* Preferences */}
      <Section
        icon={<LifeBuoy className="h-5 w-5" aria-hidden="true" />}
        title="Preferences"
        description="Notifications and feed behaviour, saved on this device."
      >
        <div className="space-y-3">
          {preferencesRows.map((row) => (
            <Row
              key={row.key}
              icon={row.icon}
              label={row.label}
              hint={row.hint}
              action={
                <Switch
                  checked={preferences[row.key]}
                  onChange={(next) =>
                    setPreferences((current) => ({ ...current, [row.key]: next }))
                  }
                  label={row.label}
                />
              }
            />
          ))}
        </div>
      </Section>

      {/* Resources */}
      <Section
        icon={<Info className="h-5 w-5" aria-hidden="true" />}
        title="Resources"
        description="What we're building and how to get help."
      >
        <div className="space-y-3">
          <Row
            label="About Wolvinix"
            hint="Mission, features and the team behind the pack."
            onClick={() => navigate("/about")}
            action={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
          />
          <Row
            label="Roadmap"
            hint="What's shipping next."
            onClick={() => navigate("/about#roadmap")}
            action={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
          />
          <Row
            label="Contact support"
            hint="We answer within a day or two."
            onClick={() => navigate("/about#contact")}
            action={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
      </Section>

      {/* Danger zone */}
      <Section
        tone="danger"
        icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
        title="Danger zone"
        description="These actions are permanent — breathe first."
      >
        <div className="space-y-3">
          <Row
            icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
            label="Sign out"
            hint="Ends this session on this device."
            action={
              <Button variant="outline" size="sm" onClick={logout}>
                Log out
              </Button>
            }
          />
          <Row
            icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            label="Delete account"
            hint="Permanently removes your profile, posts and stats."
            action={
              <Button variant="danger" size="sm" onClick={() => setDeleteStep("typed")}>
                Delete
              </Button>
            }
          />
        </div>
      </Section>

      <p className="text-subtle pb-4 text-center text-xs">Wolvinix 2.0 · built for gamers</p>

      {/* Freeze confirmation */}
      <ConfirmDialog
        open={confirmFreeze}
        onClose={() => setConfirmFreeze(false)}
        onConfirm={() => {
          setConfirmFreeze(false);
          freezeMutation.mutate(!frozen);
        }}
        loading={freezeMutation.isPending}
        title={frozen ? "Unfreeze your account?" : "Freeze your account?"}
        message={
          frozen
            ? "Your profile becomes visible again and everything works as before."
            : "Your profile will be hidden and your activity paused until you unfreeze."
        }
        confirmLabel={frozen ? "Unfreeze" : "Freeze"}
      />

      {/* Typed confirmation → final confirmation */}
      <Modal
        open={deleteStep === "typed"}
        onClose={() => {
          setDeleteStep("idle");
          setTypedConfirmation("");
        }}
        title="Delete your account?"
        description="This cannot be undone. Your posts, stats and clan roles are erased."
      >
        <div className="space-y-4">
          <p className="text-muted text-sm">
            Type <span className="text-danger font-mono font-semibold">DELETE</span> to confirm you
            really want to go.
          </p>
          <Input
            id="delete-confirmation"
            aria-label="Type DELETE to confirm"
            placeholder="DELETE"
            autoComplete="off"
            value={typedConfirmation}
            onChange={(event) => setTypedConfirmation(event.target.value)}
            invalid={typedConfirmation.length > 0 && typedConfirmation !== "DELETE"}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteStep("idle");
                setTypedConfirmation("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={typedConfirmation !== "DELETE"}
              onClick={() => setDeleteStep("confirm")}
            >
              Continue
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteStep === "confirm"}
        onClose={() => setDeleteStep("idle")}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        destructive
        title="Last chance"
        message="Deleting your account wipes your profile, posts, followers and stats forever."
        confirmLabel="Delete forever"
      />
    </div>
  );
}
