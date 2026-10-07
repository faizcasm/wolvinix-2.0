import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Gamepad2, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/Card";
import { Input } from "@/components/ui/Form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { del, errorMessage, get, patch, post } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { useAuthStore } from "@/stores/auth";
import { LabeledField } from "@/features/auth/fields";
import type { GameStat } from "@/types";

interface StatsPanelProps {
  userId: string;
  username: string;
  open: boolean;
  onClose: () => void;
}

interface StatForm {
  gameName: string;
  inGameName: string;
  score: string;
  level: string;
}

const emptyForm: StatForm = { gameName: "", inGameName: "", score: "", level: "1" };

type ConfirmAction = "add" | "edit" | "delete";

/**
 * Game stats for one player. The owner can add / edit / delete entries (each
 * behind a confirmation); everyone else gets a read-only view.
 */
export function StatsPanel({ userId, username, open, onClose }: StatsPanelProps) {
  const queryClient = useQueryClient();
  const me = useAuthStore((state) => state.user);
  const isOwner = me?._id === userId;

  const [mode, setMode] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<GameStat | null>(null);
  const [form, setForm] = useState<StatForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ConfirmAction | null>(null);

  const statsQuery = useQuery({
    queryKey: queryKeys.stats(userId),
    queryFn: () => get<GameStat[]>(`/stats/user/${userId}`),
    enabled: open && Boolean(userId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.stats(userId) });

  const createMutation = useMutation({
    mutationFn: () =>
      post<GameStat>("/stats", {
        gameName: form.gameName.trim(),
        inGameName: form.inGameName.trim(),
        score: form.score.trim() || "0",
        level: Number(form.level) || 1,
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Stat added");
      closeForm();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not add the stat")),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      patch<GameStat>(`/stats/${editing?._id}`, {
        gameName: form.gameName.trim(),
        inGameName: form.inGameName.trim(),
        score: form.score.trim() || "0",
        level: Number(form.level) || 1,
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Stat updated");
      closeForm();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not update the stat")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => del(`/stats/${editing?._id}`),
    onSuccess: async () => {
      await invalidate();
      toast.success("Stat removed");
      setEditing(null);
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete the stat")),
  });

  useEffect(() => {
    if (!open) {
      setMode("list");
      setEditing(null);
      setForm(emptyForm);
      setConfirming(null);
    }
  }, [open]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setMode("form");
  };

  const openEdit = (stat: GameStat) => {
    setEditing(stat);
    setForm({
      gameName: stat.gameName,
      inGameName: stat.inGameName,
      score: String(stat.score ?? ""),
      level: String(stat.level ?? 1),
    });
    setFormError(null);
    setMode("form");
  };

  const closeForm = () => {
    setMode("list");
    setEditing(null);
    setFormError(null);
    setConfirming(null);
  };

  const validate = () => {
    if (!form.gameName.trim()) return "Give the game a name";
    if (!form.inGameName.trim()) return "Add your in-game name";
    if (form.score.trim() && Number.isNaN(Number(form.score))) return "Score must be a number";
    const level = Number(form.level);
    if (!level || level < 1) return "Level must be at least 1";
    return null;
  };

  const submitForm = () => {
    const problem = validate();
    setFormError(problem);
    if (problem) return;
    setConfirming(editing ? "edit" : "add");
  };

  const runConfirmed = () => {
    if (confirming === "add") createMutation.mutate();
    if (confirming === "edit") updateMutation.mutate();
    if (confirming === "delete") deleteMutation.mutate();
    setConfirming(null);
  };

  const pending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const confirmCopy: Record<ConfirmAction, { title: string; message: string; label: string }> = {
    add: {
      title: "Add this stat?",
      message: `${form.gameName || "This game"} will show on ${username}'s profile.`,
      label: "Add stat",
    },
    edit: {
      title: "Save changes?",
      message: `Update your ${form.gameName || "game"} stat? This replaces the current values.`,
      label: "Save changes",
    },
    delete: {
      title: "Delete this stat?",
      message: `${editing?.gameName ?? "This stat"} will be removed permanently.`,
      label: "Delete",
    },
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        title="Game stats"
        description={`Performance record for @${username}`}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-subtle text-xs">
              {statsQuery.data?.length ?? 0} game
              {(statsQuery.data?.length ?? 0) === 1 ? "" : "s"} tracked
            </p>
            {isOwner && mode === "list" && (
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
                onClick={openCreate}
              >
                Add stat
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {mode === "form" ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                onSubmit={(event) => {
                  event.preventDefault();
                  submitForm();
                }}
                className="border-border bg-surface-2 space-y-4 rounded-xl border p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-subtle text-sm font-semibold tracking-wider uppercase">
                    {editing ? "Edit stat" : "New stat"}
                  </h3>
                  <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
                    Cancel
                  </Button>
                </div>

                {formError && (
                  <p role="alert" className="text-danger text-xs font-medium">
                    {formError}
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <LabeledField id="stat-game" label="Game" required>
                    <Input
                      id="stat-game"
                      placeholder="Valorant"
                      value={form.gameName}
                      onChange={(event) => setForm({ ...form, gameName: event.target.value })}
                    />
                  </LabeledField>
                  <LabeledField id="stat-name" label="In-game name" required>
                    <Input
                      id="stat-name"
                      placeholder="w0lfpack"
                      value={form.inGameName}
                      onChange={(event) => setForm({ ...form, inGameName: event.target.value })}
                    />
                  </LabeledField>
                  <LabeledField id="stat-score" label="Score">
                    <Input
                      id="stat-score"
                      inputMode="numeric"
                      placeholder="12400"
                      value={form.score}
                      onChange={(event) => setForm({ ...form, score: event.target.value })}
                    />
                  </LabeledField>
                  <LabeledField id="stat-level" label="Level" required>
                    <Input
                      id="stat-level"
                      type="number"
                      min={1}
                      max={999}
                      value={form.level}
                      onChange={(event) => setForm({ ...form, level: event.target.value })}
                    />
                  </LabeledField>
                </div>

                <Button type="submit" variant="gradient" className="w-full" loading={pending}>
                  {editing ? "Review changes" : "Review & add"}
                </Button>
              </motion.form>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                {statsQuery.isLoading && (
                  <div className="space-y-2">
                    {[0, 1, 2].map((row) => (
                      <Skeleton key={row} className="h-16 w-full rounded-xl" />
                    ))}
                  </div>
                )}

                {statsQuery.isError && !statsQuery.isLoading && (
                  <EmptyState
                    icon={<Trophy className="h-6 w-6" aria-hidden="true" />}
                    title="Couldn't load stats"
                    description={errorMessage(statsQuery.error, "Something went wrong")}
                    action={
                      <Button variant="outline" size="sm" onClick={() => statsQuery.refetch()}>
                        Try again
                      </Button>
                    }
                  />
                )}

                {statsQuery.isSuccess && statsQuery.data.length === 0 && (
                  <EmptyState
                    icon={<Gamepad2 className="h-6 w-6" aria-hidden="true" />}
                    title="No stats yet"
                    description={
                      isOwner
                        ? "Add your first game and show the server what you're made of."
                        : `@${username} hasn't logged any game stats yet.`
                    }
                    action={
                      isOwner ? (
                        <Button
                          size="sm"
                          onClick={openCreate}
                          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
                        >
                          Add stat
                        </Button>
                      ) : undefined
                    }
                  />
                )}

                {statsQuery.isSuccess && statsQuery.data.length > 0 && (
                  <ul className="space-y-2">
                    {statsQuery.data.map((stat, index) => (
                      <motion.li
                        key={stat._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.05, 0.3) }}
                        className="card flex items-center gap-3 p-3"
                      >
                        <span className="bg-accent-soft text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                          <Gamepad2 className="h-4.5 w-4.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {stat.gameName}
                          </span>
                          <span className="text-subtle block truncate text-xs">
                            {stat.inGameName}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="font-display tabular block text-sm font-bold">
                            {stat.score}
                          </span>
                          <span className="text-subtle tabular block text-[11px]">
                            Lv {stat.level}
                          </span>
                        </span>
                        {isOwner && (
                          <span className="flex gap-1">
                            <IconButton
                              label={`Edit ${stat.gameName}`}
                              size="sm"
                              onClick={() => openEdit(stat)}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </IconButton>
                            <IconButton
                              label={`Delete ${stat.gameName}`}
                              size="sm"
                              className="text-danger hover:bg-danger-soft"
                              onClick={() => {
                                setEditing(stat);
                                setConfirming("delete");
                              }}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </IconButton>
                          </span>
                        )}
                      </motion.li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Link
            to="/leaderboard"
            onClick={onClose}
            className="border-border bg-surface-2 text-muted hover:border-brand-500/40 hover:text-foreground flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors"
          >
            <Trophy className="text-warning h-4 w-4" aria-hidden="true" />
            See the global leaderboard
            <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={runConfirmed}
        loading={pending}
        destructive={confirming === "delete"}
        title={confirming ? confirmCopy[confirming].title : ""}
        message={confirming ? confirmCopy[confirming].message : ""}
        confirmLabel={confirming ? confirmCopy[confirming].label : "Confirm"}
      />
    </>
  );
}

export default StatsPanel;
