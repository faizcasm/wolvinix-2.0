import { useCallback, useRef, useState, type DragEvent } from "react";
import { motion } from "framer-motion";
import { FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface DroppedFile {
  file: File;
  id: string;
}

/**
 * Drag & drop / file-picker zone shared by every tool.
 * Keyboard-operable (the label wraps a real input), announces count + errors.
 */
export function Dropzone({
  accept,
  multiple = false,
  files,
  onChange,
  hint,
  disabled = false,
}: {
  accept: string;
  multiple?: boolean;
  files: DroppedFile[];
  onChange: (next: DroppedFile[]) => void;
  hint: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return;
      const next: DroppedFile[] = Array.from(incoming).map((file) => ({
        file,
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }));
      onChange(multiple ? [...files, ...next] : next.slice(0, 1));
    },
    [files, multiple, onChange],
  );

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    addFiles(event.dataTransfer.files);
  };

  return (
    <div>
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        animate={{ scale: dragging ? 1.01 : 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors ${
          dragging
            ? "border-brand-500 bg-brand-500/10"
            : "border-border bg-surface hover:border-border-strong"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <span className="bg-brand-500/10 text-brand-500 grid size-12 place-items-center rounded-2xl">
          <FileUp size={22} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold">
            Drag &amp; drop {multiple ? "files" : "a file"} here
          </p>
          <p className="text-muted mt-1 text-xs">{hint}</p>
        </div>
        <label className="cursor-pointer">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            aria-label={hint}
            className="sr-only"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <span className="bg-brand-500 hover:bg-brand-400 inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium text-white transition-all active:scale-[0.97]">
            Browse files
          </span>
        </label>
      </motion.div>

      {files.length > 0 && (
        <motion.ul
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 space-y-2"
          aria-label="Selected files"
        >
          {files.map((entry) => (
            <li
              key={entry.id}
              className="border-border bg-surface flex items-center gap-3 rounded-xl border px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.file.name}</p>
                <p className="text-subtle text-xs">{(entry.file.size / 1024).toFixed(1)} KB</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Remove ${entry.file.name}`}
                onClick={() => onChange(files.filter((f) => f.id !== entry.id))}
              >
                <X size={14} aria-hidden="true" />
              </Button>
            </li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}
