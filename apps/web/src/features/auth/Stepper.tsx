import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Two-step tracker shared by the password recovery pages.
 * Step 1 = request a code, step 2 = verify it and set a new password.
 */
export function Stepper({ current }: { current: 1 | 2 }) {
  const steps = [
    { id: 1 as const, label: "Account" },
    { id: 2 as const, label: "Verify code" },
  ];

  return (
    <ol className="mb-6 flex items-center gap-3" aria-label="Password reset progress">
      {steps.map((step, index) => {
        const active = step.id === current;
        const done = step.id < current;
        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <motion.span
                animate={{ scale: active ? 1.05 : 1 }}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                  done
                    ? "border-lime/40 bg-lime-soft text-lime"
                    : active
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-border bg-surface-2 text-subtle",
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : step.id}
              </motion.span>
              <span
                className={cn(
                  "truncate text-xs font-medium transition-colors",
                  active ? "text-foreground" : "text-subtle",
                )}
              >
                {step.label}
              </span>
            </span>
            {index < steps.length - 1 && (
              <span className="bg-border h-px flex-1" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
