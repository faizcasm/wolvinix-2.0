import type { ReactNode } from "react";
import { Field } from "@/components/ui/Form";

interface LabeledFieldProps {
  /** Must match the `id` of the control rendered as `children`. */
  id: string;
  label: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * `Field` with a real `<label htmlFor>` → control association.
 *
 * The shared `Field` renders its own label without an `htmlFor`, so we pass our
 * own label as children and let `Field` keep doing the error / hint rendering.
 */
export function LabeledField({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
}: LabeledFieldProps) {
  return (
    <Field error={error} hint={hint} className={className}>
      <label htmlFor={id} className="text-muted flex items-center gap-1 text-sm font-medium">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
    </Field>
  );
}
