import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { errorMessage, post } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface FollowButtonProps {
  userId: string;
  initialFollowing: boolean;
  onChange?: (following: boolean) => void;
  size?: "sm" | "md";
  variant?: "outline" | "primary";
  className?: string;
  disabled?: boolean;
}

interface FollowResult {
  following: boolean;
  followersCount: number;
}

/**
 * Optimistic follow toggle: flips instantly, rolls back on failure and
 * refreshes the profile / followers caches once the server answers.
 */
export function FollowButton({
  userId,
  initialFollowing,
  onChange,
  size = "md",
  variant = "outline",
  className,
  disabled,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const queryClient = useQueryClient();

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing]);

  const mutation = useMutation({
    mutationFn: () => post<FollowResult>(`/users/${userId}/follow`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["profile"] });
      await queryClient.cancelQueries({ queryKey: ["followers"] });
      const previous = following;
      const optimistic = !previous;
      setFollowing(optimistic);
      onChange?.(optimistic);
      return { previous };
    },
    onError: (error, _variables, context) => {
      const previous = context?.previous ?? initialFollowing;
      setFollowing(previous);
      onChange?.(previous);
      toast.error(errorMessage(error, "Could not update follow"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["followers"] });
      void queryClient.invalidateQueries({ queryKey: ["suggested"] });
    },
  });

  return (
    <Button
      size={size}
      variant={following ? "secondary" : variant}
      loading={mutation.isPending}
      disabled={disabled}
      aria-pressed={following}
      onClick={() => mutation.mutate()}
      leftIcon={
        following ? (
          <UserCheck className="h-4 w-4" aria-hidden="true" />
        ) : (
          <UserPlus className="h-4 w-4" aria-hidden="true" />
        )
      }
      className={cn("min-w-[118px]", className)}
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}
