import { type HTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn, hueFrom, initials } from "@/lib/utils";

/* ------------------------------- Card ------------------------------- */

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padded?: boolean;
  glow?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover, padded = true, glow, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "card relative overflow-hidden",
        hover && "card-hover",
        glow && "ring-glow",
        padded && "p-4 sm:p-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
Card.displayName = "Card";

/* ------------------------------ Spinner ------------------------------ */

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "border-brand-500 inline-block h-5 w-5 animate-spin rounded-full border-2 border-t-transparent",
        className,
      )}
    />
  );
}

export function CenteredSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14">
      <Spinner className="h-7 w-7" />
      <p className="text-subtle text-sm">{label}</p>
    </div>
  );
}

/* ----------------------------- Skeleton ----------------------------- */

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton rounded-lg", className)} {...props} />;
}

export function PostSkeleton() {
  return (
    <div className="card animate-enter space-y-4 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
    </div>
  );
}

/* ------------------------------ Avatar ------------------------------ */

interface AvatarProps {
  src?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  ring?: boolean;
  className?: string;
  online?: boolean;
}

const avatarSizes = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
  "2xl": "h-28 w-28 text-2xl",
};

export function Avatar({ src, name = "?", size = "md", ring, className, online }: AvatarProps) {
  const hue = hueFrom(name);
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full font-semibold text-white",
          "from-brand-500 via-accent to-lime bg-gradient-to-br",
          avatarSizes[size],
          ring && "ring-brand-500/60 ring-offset-surface ring-2 ring-offset-2",
        )}
        style={{
          background: src
            ? undefined
            : `linear-gradient(135deg, hsl(${hue} 70% 52%), hsl(${(hue + 60) % 360} 70% 48%))`,
        }}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(event) => {
              (event.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span aria-hidden="true">{initials(name)}</span>
        )}
      </span>
      {typeof online === "boolean" && (
        <span
          className={cn(
            "border-surface absolute right-0 bottom-0 h-3 w-3 rounded-full border-2",
            online ? "bg-success" : "bg-subtle/50",
          )}
          aria-label={online ? "Online" : "Offline"}
        />
      )}
    </span>
  );
}

/* ------------------------------- Badge ------------------------------- */

interface BadgeProps {
  children: ReactNode;
  tone?: "brand" | "accent" | "lime" | "danger" | "warning" | "neutral";
  className?: string;
}

const tones = {
  brand: "bg-brand-500/15 text-brand-600 dark:text-brand-600 border-brand-500/25",
  accent: "bg-accent-soft text-accent border-accent/25",
  lime: "bg-lime-soft text-lime border-lime/25",
  danger: "bg-danger-soft text-danger border-danger/25",
  warning: "bg-warning-soft text-warning border-warning/25",
  neutral: "bg-surface-2 text-muted border-border",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------- EmptyState ---------------------------- */

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-border flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="bg-brand-500/10 text-brand-500 flex h-14 w-14 items-center justify-center rounded-2xl">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="text-muted max-w-sm text-sm">{description}</p>}
      {action}
    </div>
  );
}
