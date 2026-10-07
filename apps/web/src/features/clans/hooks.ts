import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { del, errorMessage, get, patch, post } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import { useAuthStore } from "@/stores/auth";
import { usePaginatedList, type Page } from "@/features/shared/usePaginatedList";
import { toast } from "sonner";
import type { Clan, CompactUser } from "@/types";

export type ClanPages = Page<Clan>[];

export interface ClanFormValues {
  name: string;
  motto: string;
  description: string;
  clanProfile?: string;
}

/* -------------------------------- Queries -------------------------------- */

export function useClans(search: string, enabled = true) {
  return usePaginatedList<Clan>({
    queryKey: queryKeys.clans(search, 1),
    url: "/clans",
    params: search.trim() ? { q: search.trim() } : {},
    limit: 12,
    enabled,
  });
}

export function useClan(clanId?: string) {
  const id = clanId ?? "";
  return useQuery({
    queryKey: queryKeys.clan(id),
    queryFn: async () => await get<Clan>(`/clans/${id}`),
    enabled: Boolean(id),
    retry: false,
  });
}

/* ------------------------------ Membership ------------------------------ */

export function currentUserAsMember(): CompactUser {
  const user = useAuthStore.getState().user;
  return {
    _id: user?._id ?? "",
    name: user?.name ?? "",
    username: user?.username ?? "",
    profilePic: user?.profilePic ?? "",
  };
}

export function isMemberOf(clan?: Clan, userId?: string): boolean {
  if (!clan || !userId) return false;
  return (clan.members ?? []).some((member) => member?._id === userId);
}

export function isLeaderOf(clan?: Clan, userId?: string): boolean {
  if (!clan || !userId) return false;
  return clan.leader?._id === userId;
}

function addToClan(clan: Clan | undefined, member: CompactUser): Clan | undefined {
  if (!clan || isMemberOf(clan, member._id)) return clan;
  return {
    ...clan,
    members: [...(clan.members ?? []), member],
    memberCount: (clan.memberCount ?? clan.members?.length ?? 0) + 1,
  };
}

function removeFromClan(clan: Clan | undefined, memberId: string): Clan | undefined {
  if (!clan) return clan;
  const members = (clan.members ?? []).filter((member) => member?._id !== memberId);
  if (members.length === (clan.members ?? []).length) return clan;
  return {
    ...clan,
    members,
    memberCount: Math.max(0, (clan.memberCount ?? members.length) - 1),
  };
}

function patchClanLists(client: QueryClient, clanId: string, update: (clan: Clan) => Clan) {
  client.setQueriesData<ClanPages>({ queryKey: ["clans"] }, (pages) => {
    if (!Array.isArray(pages)) return pages;
    let dirty = false;
    const next = pages.map((page) => {
      if (!page || !Array.isArray(page.items)) return page;
      const items = page.items.map((item) => {
        if (item._id !== clanId) return item;
        dirty = true;
        return update(item);
      });
      return { ...page, items };
    });
    return dirty ? next : pages;
  });
}

/* ------------------------------- Join / leave ---------------------------- */

function useToggleMembership(joining: boolean) {
  const queryClient = useQueryClient();
  const me = currentUserAsMember();

  return useMutation<
    unknown,
    unknown,
    string,
    { detail?: Clan | undefined; lists?: Array<[readonly unknown[], ClanPages | undefined]> }
  >({
    mutationFn: async (clanId: string) => {
      const action = joining ? "join" : "leave";
      return await post<unknown>(`/clans/${clanId}/${action}`);
    },
    onMutate: async (clanId) => {
      await queryClient.cancelQueries({ queryKey: ["clans"] });
      await queryClient.cancelQueries({ queryKey: queryKeys.clan(clanId) });
      const detail = queryClient.getQueryData<Clan>(queryKeys.clan(clanId));
      const lists = queryClient.getQueriesData<ClanPages>({
        queryKey: ["clans"],
      });

      const update = (clan: Clan | undefined) =>
        clan ? (joining ? addToClan(clan, me) : removeFromClan(clan, me._id)) : clan;

      if (detail) queryClient.setQueryData(queryKeys.clan(clanId), update(detail));
      patchClanLists(queryClient, clanId, (clan) => update(clan) ?? clan);

      return { detail, lists };
    },
    onError: (error, clanId, context) => {
      if (context?.detail) {
        queryClient.setQueryData(queryKeys.clan(clanId), context.detail);
      }
      context?.lists?.forEach(([key, value]) => {
        if (value) queryClient.setQueryData(key, value);
      });
      toast.error(
        errorMessage(error, joining ? "Could not join that clan" : "Could not leave that clan"),
      );
    },
    onSuccess: (_data, clanId) => {
      toast.success(joining ? "Clan joined — welcome aboard" : "You left the clan");
      void queryClient.invalidateQueries({ queryKey: ["clans"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clan(clanId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myClan });
    },
  });
}

export function useJoinClan() {
  return useToggleMembership(true);
}

export function useLeaveClan() {
  return useToggleMembership(false);
}

/* --------------------------------- Create -------------------------------- */

export function useCreateClan() {
  const queryClient = useQueryClient();

  return useMutation<Clan, unknown, ClanFormValues>({
    mutationFn: async (values) => await post<Clan>("/clans", values),
    onSuccess: (clan) => {
      if (clan?._id) queryClient.setQueryData(queryKeys.clan(clan._id), clan);
      void queryClient.invalidateQueries({ queryKey: ["clans"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myClan });
      toast.success("Clan created");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not create the clan")),
  });
}

/* --------------------------------- Edit ---------------------------------- */

export function useUpdateClan() {
  const queryClient = useQueryClient();

  return useMutation<Clan, unknown, { clanId: string; values: ClanFormValues }>({
    mutationFn: async ({ clanId, values }) => await patch<Clan>(`/clans/${clanId}`, values),
    onSuccess: (clan) => {
      if (clan?._id) queryClient.setQueryData(queryKeys.clan(clan._id), clan);
      void queryClient.invalidateQueries({ queryKey: ["clans"] });
      toast.success("Clan updated");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not update the clan")),
  });
}

/* --------------------------------- Delete -------------------------------- */

export function useDeleteClan() {
  const queryClient = useQueryClient();

  return useMutation<unknown, unknown, string>({
    mutationFn: async (clanId) => await del(`/clans/${clanId}`),
    onSuccess: (_data, clanId) => {
      queryClient.removeQueries({ queryKey: queryKeys.clan(clanId) });
      void queryClient.invalidateQueries({ queryKey: ["clans"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myClan });
      toast.success("Clan disbanded");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete the clan")),
  });
}

/* ---------------------------------- Kick --------------------------------- */

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation<
    unknown,
    unknown,
    { clanId: string; memberId: string },
    { detail?: Clan | undefined }
  >({
    mutationFn: async ({ clanId, memberId }) => await del(`/clans/${clanId}/members/${memberId}`),
    onMutate: async ({ clanId, memberId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.clan(clanId) });
      const detail = queryClient.getQueryData<Clan>(queryKeys.clan(clanId));
      if (detail) {
        queryClient.setQueryData(queryKeys.clan(clanId), removeFromClan(detail, memberId));
      }
      patchClanLists(queryClient, clanId, (clan) => removeFromClan(clan, memberId) ?? clan);
      return { detail };
    },
    onError: (error, { clanId }, context) => {
      if (context?.detail) {
        queryClient.setQueryData(queryKeys.clan(clanId), context.detail);
      }
      toast.error(errorMessage(error, "Could not remove that member"));
    },
    onSuccess: (_data, { clanId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clan(clanId) });
      void queryClient.invalidateQueries({ queryKey: ["clans"] });
      toast.success("Member removed");
    },
  });
}

/* --------------------------------- Upload -------------------------------- */

/** Uploads a clan crest and returns its url. */
export async function uploadClanImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const { url } = await post<{ url: string }>("/media/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return url;
}
