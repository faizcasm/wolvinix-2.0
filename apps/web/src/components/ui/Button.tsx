import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "gradient" | "glass";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-400 active:bg-brand-600 shadow-[0_10px_30px_-12px_var(--glow-brand)]",
  secondary: "bg-surface-2 text-foreground hover:bg-surface-3 border border-border",
  ghost: "text-muted hover:text-foreground hover:bg-surface-2",
  outline:
    "border border-border-strong text-foreground hover:bg-surface-2 hover:border-brand-500/50",
  danger: "bg-danger-soft text-danger hover:bg-danger hover:text-white",
  gradient:
    "text-white bg-gradient-to-r from-brand-500 via-accent to-lime bg-[length:200%_200%] bg-[position:0%_50%] hover:bg-[position:100%_500%] transition-[background-position] duration-700 shadow-[0_10px_30px_-12px_var(--glow-brand)]",
  glass: "glass border border-border text-foreground hover:border-brand-500/40 hover:bg-surface-2",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex items-center justify-center font-medium select-none",
        "transition-all duration-200 ease-out",
        "active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {!loading && leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  ),
);
Button.displayName = "Button";

/** Icon-only button with an accessible label. */
export const IconButton = forwardRef<HTMLButtonElement, ButtonProps & { label: string }>(
  ({ label, className, size = "icon", variant = "ghost", ...props }, ref) => (
    <Button
      ref={ref}
      aria-label={label}
      title={label}
      size={size}
      variant={variant}
      className={cn("shrink-0", className)}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";
