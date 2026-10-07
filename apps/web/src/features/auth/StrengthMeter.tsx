import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { passwordStrength } from "./schemas";

const barTone = {
  danger: "bg-danger",
  warning: "bg-warning",
  accent: "bg-accent",
  lime: "bg-lime",
};

const textTone = {
  danger: "text-danger",
  warning: "text-warning",
  accent: "text-accent",
  lime: "text-lime",
};

/** Four-segment strength meter: weak → fair → strong → elite. */
export function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const strength = passwordStrength(password);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((segment) => (
          <motion.span
            key={segment}
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 1 }}
            className={cn(
              "bg-surface-3 h-1.5 flex-1 rounded-full transition-colors duration-300",
              segment <= strength.score && barTone[strength.tone],
            )}
          />
        ))}
      </div>
      <p
        className={cn("text-xs font-medium capitalize", textTone[strength.tone])}
        aria-live="polite"
      >
        {strength.label} — {strength.hint}
      </p>
    </div>
  );
}
