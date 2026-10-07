import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { Loader2, TriangleAlert, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Form";
import { formatBytes, matchesAccept } from "./utils";

/* ------------------------------- Dropzone ------------------------------ */

interface DropzoneProps {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
  icon?: ReactNode;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Click- or drag-and-drop target with a clear drag-over state. */
export function Dropzone({
  accept,
  multiple = false,
  onFiles,
  label,
  hint,
  icon,
  compact,
  disabled,
  className,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const depthRef = useRef(0);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (incoming: File[]) => {
    const accepted = incoming.filter((file) => matchesAccept(file, accept));
    const rejected = incoming.length - accepted.length;
    if (rejected > 0) {
      toast.error(
        rejected === 1
          ? "That file type isn't supported by this tool"
          : `${rejected} files were skipped — unsupported type`,
      );
    }
    if (accepted.length === 0) return;
    onFiles(multiple ? accepted : accepted.slice(0, 1));
  };

  const stopDragging = () => {
    depthRef.current = 0;
    setDragging(false);
  };

  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault();
    if (disabled) return;
    depthRef.current += 1;
    setDragging(true);
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    depthRef.current = Math.max(0, depthRef.current - 1);
    if (depthRef.current === 0) setDragging(false);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    stopDragging();
    if (disabled) return;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) handleFiles(files);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) handleFiles(files);
  };

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label={label ?? "Choose files"}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-all duration-200",
          compact ? "gap-1.5 px-4 py-5" : "gap-2.5 px-6 py-11",
          "focus-visible:outline-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2",
          dragging
            ? "border-brand-500 bg-brand-500/10 scale-[1.01]"
            : "border-border bg-surface-2/50 hover:border-brand-500/50 hover:bg-surface-2",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span
          className={cn(
            "grid place-items-center rounded-2xl transition-colors",
            compact ? "size-9" : "size-12",
            dragging ? "bg-brand-500 text-white" : "bg-brand-500/10 text-brand-500",
          )}
          aria-hidden="true"
        >
          {icon ?? <UploadCloud className="h-6 w-6" />}
        </span>
        <span className="text-foreground text-sm font-semibold">
          {dragging ? "Drop it right here" : (label ?? "Drag & drop or click to browse")}
        </span>
        <span className="text-subtle text-xs">
          {hint ?? "Nothing is uploaded — every file stays on your device."}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        tabIndex={-1}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

/* -------------------------------- FileChip ----------------------------- */

export function FileChip({
  name,
  size,
  previewUrl,
  icon,
  onRemove,
  actions,
  className,
}: {
  name: string;
  size: number;
  previewUrl?: string;
  icon?: ReactNode;
  onRemove?: () => void;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-surface flex items-center gap-3 rounded-xl border p-2.5",
        className,
      )}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          aria-hidden="true"
          className="size-10 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="bg-surface-2 text-muted grid size-10 shrink-0 place-items-center rounded-lg">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-medium" title={name}>
          {name}
        </p>
        <p className="text-subtle text-xs">{formatBytes(size)}</p>
      </div>
      {actions}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="text-subtle hover:bg-surface-2 hover:text-foreground shrink-0 rounded-lg p-2 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------ Tool states ---------------------------- */

export function ToolError({
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="border-danger/40 bg-danger-soft flex flex-wrap items-start gap-3 rounded-xl border p-4"
    >
      <TriangleAlert className="text-danger mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="text-foreground min-w-0 flex-1 text-sm">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export function ToolProgress({
  value,
  label,
  tone = "brand",
}: {
  value: number;
  label?: string;
  tone?: "brand" | "accent" | "lime" | "success";
}) {
  const pct = Math.min(100, Math.max(0, Math.round(value * 100)));
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted flex min-w-0 items-center gap-1.5">
          <Loader2
            className="text-brand-500 h-3.5 w-3.5 shrink-0 animate-spin"
            aria-hidden="true"
          />
          <span className="truncate">{label || "Working…"}</span>
        </span>
        <span className="text-subtle shrink-0 tabular-nums">{pct}%</span>
      </div>
      <ProgressBar value={pct} tone={tone} />
    </div>
  );
}
