import { useEffect, useRef, type ReactNode, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showClose?: boolean;
  className?: string;
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[calc(100vw-1.5rem)]",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  showClose = true,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 backdrop-blur-md"
            style={{ background: "var(--overlay)" }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className={cn(
              "border-border bg-elevated relative z-10 w-full overflow-hidden rounded-2xl border shadow-lg",
              "max-h-[92dvh] overflow-y-auto outline-none",
              sizes[size],
              className,
            )}
          >
            {(title || showClose) && (
              <div className="border-border bg-elevated/95 sticky top-0 z-10 flex items-start justify-between gap-4 border-b px-5 py-4 backdrop-blur">
                <div>
                  {title && <h2 className="font-display text-lg font-semibold">{title}</h2>}
                  {description && <p className="text-muted mt-0.5 text-sm">{description}</p>}
                </div>
                {showClose && (
                  <button
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="text-subtle hover:bg-surface-2 hover:text-foreground rounded-lg p-1.5 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ------------------------------ Tabs ------------------------------ */

interface TabItem {
  id: string;
  label: ReactNode;
  count?: number;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("border-border bg-surface-2 flex gap-1 rounded-xl border p-1", className)}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "text-foreground" : "text-subtle hover:text-muted",
            )}
          >
            {active && (
              <motion.span
                layoutId={`tab-${items.map((i) => i.id).join("")}`}
                className="bg-surface absolute inset-0 rounded-lg shadow-sm"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {item.label}
              {typeof item.count === "number" && (
                <span
                  className={cn(
                    "tabular rounded-full px-1.5 py-0.5 text-[10px]",
                    active ? "bg-brand-500/15 text-brand-500" : "bg-surface-3 text-subtle",
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------- Confirm ---------------------------- */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  destructive,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" showClose={false}>
      <p className="text-muted text-sm">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="border-border hover:bg-surface-2 h-10 rounded-xl border px-4 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            "h-10 rounded-xl px-4 text-sm font-medium text-white transition-all disabled:opacity-60",
            destructive ? "bg-danger hover:brightness-110" : "bg-brand-500 hover:bg-brand-400",
          )}
        >
          {loading ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
