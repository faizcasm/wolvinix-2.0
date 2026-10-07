import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

/* ------------------------------- Field ------------------------------- */

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-muted flex items-center gap-1 text-sm font-medium">
          {label}
          {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-danger text-xs font-medium">
          {error}
        </p>
      ) : hint ? (
        <p className="text-subtle text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------- Input ------------------------------- */

const fieldBase =
  "w-full rounded-xl border border-border bg-surface-2 px-3.5 text-sm text-foreground " +
  "placeholder:text-subtle transition-all duration-200 outline-none " +
  "hover:border-border-strong focus:border-brand-500 focus:bg-surface focus:ring-4 focus:ring-brand-500/12 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, leftIcon, ...props }, ref) => (
    <div className="relative">
      {leftIcon && (
        <span className="text-subtle pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
          {leftIcon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          fieldBase,
          "h-11",
          leftIcon && "pl-10",
          invalid && "border-danger focus:border-danger focus:ring-danger/15",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
Input.displayName = "Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        fieldBase,
        "min-h-[96px] resize-y py-3 leading-relaxed",
        invalid && "border-danger focus:border-danger focus:ring-danger/15",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

/* ----------------------------- Password ----------------------------- */

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="text-subtle hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

/* ------------------------------- Switch ------------------------------ */

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
        "disabled:opacity-50",
        checked ? "border-brand-500/40 bg-brand-500" : "border-border bg-surface-3",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/* ---------------------------- Range / Stat --------------------------- */

export function ProgressBar({
  value,
  max = 100,
  className,
  tone = "brand",
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "brand" | "accent" | "lime" | "success";
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const toneClass = {
    brand: "bg-brand-500",
    accent: "bg-accent",
    lime: "bg-lime",
    success: "bg-success",
  }[tone];
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("bg-surface-3 h-2 w-full overflow-hidden rounded-full", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", toneClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
