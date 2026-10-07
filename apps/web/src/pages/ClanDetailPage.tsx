import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Crown,
  Loader2,
  Pencil,
  RotateCw,
  Shield,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Avatar, Badge, EmptyState, Skeleton } from "@/components/ui/Card";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Form";
import { formatCount, hueFrom } from "@/lib/utils";
import { ClanFormModal } from "@/features/clans/ClanFormModal";
import {
  isLeaderOf,
  isMemberOf,
  useClan,
  useDeleteClan,
  useJoinClan,
  useLeaveClan,
  useRemoveMember,
} from "@/features/clans/hooks";
import { useAuthStore } from "@/stores/auth";
import type { Clan, CompactUser } from "@/types";

const MEMBER_PAGE = 12;

function DetailSkeleton() {
  return (
    <div className="space-y-6 pb-4">
      <div className="skeleton h-44 w-full rounded-2xl" />
      <div className="space-y-3 px-1">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="border-border flex items-center gap-3 rounded-xl border p-3.5"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Typed confirmation used before a leader disbands their clan forever. */
function DisbandDialog({
  open,
  clan,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  clan: Clan;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const matches = typed.trim() === clan.name;

  return (
    <Modal open={open} onClose={onClose} title="Disband this clan?" size="sm" showClose={false}>
      <p className="text-muted text-sm">
        This permanently removes <strong>{clan.name}</strong>, its roster and its history. There is
        no undo.
      </p>
      <div className="mt-4">
        <Field label={`Type “${clan.name}” to confirm`}>
          <Input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={clan.name}
            autoComplete="off"
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="border-border hover:bg-surface-2 h-10 rounded-xl border px-4 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!matches || loading}
          className="bg-danger inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Disband clan
        </button>
      </div>
    </Modal>
  );
}

function MemberRow({
  member,
  isLeader,
  canRemove,
  busy,
  onRemove,
}: {
  member: CompactUser;
  isLeader: boolean;
  canRemove: boolean;
  busy: boolean;
  onRemove: () => void;
}) {
  return (
    <motion.li
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="border-border bg-surface hover:border-border-strong flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors"
    >
      <Link
        to={`/profile/${member.username}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none"
      >
        <Avatar src={member.profilePic} name={member.name} size="md" />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{member.name}</span>
            {isLeader && (
              <Badge tone="warning">
                <Crown className="h-3 w-3" aria-hidden="true" /> Leader
              </Badge>
            )}
          </span>
          <span className="text-subtle block truncate text-xs">@{member.username}</span>
        </span>
      </Link>

      {canRemove && (
        <IconButton
          label={`Remove ${member.name} from the clan`}
          onClick={onRemove}
          disabled={busy}
          className="relative z-10"
        >
          <UserMinus className="text-danger h-4 w-4" />
        </IconButton>
      )}
    </motion.li>
  );
}

/** `/clans/:clanId` — banner, roster, and the leader's control panel. */
export default function ClanDetailPage() {
  const { clanId } = useParams<{ clanId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const meId = user?._id ?? "";
  const reduceMotion = useReducedMotion();

  const query = useClan(clanId);
  const clan = query.data;

  const join = useJoinClan();
  const leave = useLeaveClan();
  const kick = useRemoveMember();
  const disband = useDeleteClan();

  const [editOpen, setEditOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<CompactUser | null>(null);
  const [disbandOpen, setDisbandOpen] = useState(false);
  const [visibleMembers, setVisibleMembers] = useState(MEMBER_PAGE);

  useEffect(() => {
    setVisibleMembers(MEMBER_PAGE);
  }, [clanId]);

  const members = useMemo(() => clan?.members ?? [], [clan]);
  const member = isMemberOf(clan, meId);
  const leader = isLeaderOf(clan, meId);
  const busy = join.isPending || leave.isPending;

  if (query.isLoading) return <DetailSkeleton />;

  if (query.isError || !clan) {
    const status = (query.error as { response?: { status?: number } } | null)?.response?.status;
    const notFound = status === 404;
    return (
      <div className="py-6">
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title={notFound ? "Clan not found" : "Couldn't load this clan"}
          description={
            notFound
              ? "It may have been disbanded, or the link is wrong."
              : "Something went wrong talking to the server."
          }
          action={
            notFound ? (
              <Button variant="gradient" onClick={() => navigate("/clans")}>
                Browse clans
              </Button>
            ) : (
              <Button
                variant="outline"
                leftIcon={<RotateCw className="h-4 w-4" />}
                onClick={() => void query.refetch()}
              >
                Retry
              </Button>
            )
          }
        />
      </div>
    );
  }

  const hue = hueFrom(clan.name);
  const banner = `linear-gradient(135deg, hsl(${hue} 72% 45%), hsl(${(hue + 55) % 360} 72% 30%))`;
  const shownMembers = members.slice(0, visibleMembers);

  return (
    <div className="space-y-6 pb-4">
      <button
        type="button"
        onClick={() => navigate("/clans")}
        className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All clans
      </button>

      {/* banner */}
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="noise border-border relative overflow-hidden rounded-2xl border"
        style={{ background: banner }}
      >
        {clan.clanProfile && (
          <img
            src={clan.clanProfile}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-70"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
        <span className="from-background/95 via-background/60 to-background/10 absolute inset-0 bg-gradient-to-t" />

        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
            <Avatar src={clan.clanProfile} name={clan.name} size="2xl" ring className="shrink-0" />
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{clan.name}</h1>
              {clan.motto && <p className="text-accent mt-1 text-sm italic">“{clan.motto}”</p>}
              <div className="text-muted mt-2 flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatCount(clan.memberCount ?? members.length)} member
                  {(clan.memberCount ?? members.length) === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {clan.createdAt
                    ? `Founded ${format(new Date(clan.createdAt), "d MMM yyyy")}`
                    : "Founding date unknown"}
                </span>
                <span className="flex items-center gap-1">
                  <Crown className="text-warning h-3.5 w-3.5" aria-hidden="true" />
                  {clan.leader?.name ?? "Unknown leader"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {leader ? (
              <>
                <Button
                  variant="glass"
                  size="sm"
                  leftIcon={<Pencil className="h-4 w-4" />}
                  onClick={() => setEditOpen(true)}
                >
                  Edit clan
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setDisbandOpen(true)}
                >
                  Disband
                </Button>
              </>
            ) : member ? (
              <Button
                variant="outline"
                size="sm"
                loading={busy}
                onClick={() => leave.mutate(clan._id)}
              >
                Leave clan
              </Button>
            ) : (
              <Button
                variant="gradient"
                size="sm"
                loading={busy}
                onClick={() => join.mutate(clan._id)}
              >
                Join clan
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      {/* description */}
      {clan.description && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="border-border bg-surface rounded-2xl border p-5"
        >
          <h2 className="font-display text-subtle text-sm font-semibold tracking-widest uppercase">
            About
          </h2>
          <p className="text-muted mt-2 text-sm leading-relaxed">{clan.description}</p>
        </motion.section>
      )}

      {/* roster */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">
            Roster{" "}
            <span className="text-subtle text-sm font-normal">{formatCount(members.length)}</span>
          </h2>
          {!member && !leader && (
            <span className="text-subtle text-xs">
              {members.length >= 50 ? "Clan is full" : "Open to new members"}
            </span>
          )}
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={<Shield className="h-6 w-6" />}
            title="No members loaded"
            description="This clan's roster is empty — maybe everyone just left."
          />
        ) : (
          <motion.ul
            className="space-y-2"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: reduceMotion ? 0 : 0.05 },
              },
            }}
          >
            {shownMembers.map((memberUser) => (
              <MemberRow
                key={memberUser._id}
                member={memberUser}
                isLeader={clan.leader?._id === memberUser._id}
                canRemove={leader && memberUser._id !== meId}
                busy={kick.isPending && kick.variables?.memberId === memberUser._id}
                onRemove={() => setKickTarget(memberUser)}
              />
            ))}
          </motion.ul>
        )}

        {visibleMembers < members.length && (
          <div className="flex justify-center pt-1">
            <Button
              variant="outline"
              onClick={() => setVisibleMembers((count) => count + MEMBER_PAGE)}
            >
              Show more members ({members.length - visibleMembers} left)
            </Button>
          </div>
        )}
      </section>

      <ClanFormModal open={editOpen} onClose={() => setEditOpen(false)} clan={clan} />

      <ConfirmDialog
        open={Boolean(kickTarget)}
        onClose={() => setKickTarget(null)}
        onConfirm={() => {
          if (!kickTarget) return;
          kick.mutate(
            { clanId: clan._id, memberId: kickTarget._id },
            { onSettled: () => setKickTarget(null) },
          );
        }}
        title={`Remove ${kickTarget?.name ?? "member"}?`}
        message="They lose access to the clan immediately and will need a fresh invite to come back."
        confirmLabel="Remove"
        destructive
        loading={kick.isPending}
      />

      <DisbandDialog
        open={disbandOpen}
        clan={clan}
        loading={disband.isPending}
        onClose={() => setDisbandOpen(false)}
        onConfirm={() =>
          disband.mutate(clan._id, {
            onSuccess: () => {
              setDisbandOpen(false);
              navigate("/clans");
            },
          })
        }
      />
    </div>
  );
}
