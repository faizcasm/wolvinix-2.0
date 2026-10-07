import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ScanText, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropzone, type DroppedFile } from "./Dropzone";

type Phase = "idle" | "working" | "done" | "error";

/**
 * Image → text via tesseract.js. The worker + `recognize` API come straight
 * from the installed v7 package; progress comes from the logger callback.
 */
export function OcrTool() {
  const [file, setFile] = useState<DroppedFile[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const run = async () => {
    const target = file[0]?.file;
    if (!target) return;
    cancelled.current = false;
    setPhase("working");
    setProgress(0);
    setError(null);
    setText("");
    try {
      const { default: Tesseract } = await import("tesseract.js");
      const result = await Tesseract.recognize(target, "eng", {
        logger: (message: { status?: string; progress?: number }) => {
          if (cancelled.current) return;
          if (typeof message.progress === "number") {
            setProgress(Math.round(message.progress * 100));
          }
        },
      });
      if (cancelled.current) return;
      setText(result.data.text.trim());
      setPhase("done");
    } catch {
      if (cancelled.current) return;
      setError("Recognition failed — try a sharper, higher-contrast image.");
      setPhase("error");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard blocked — the text stays selectable below */
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">
        Extract printed text from a screenshot or photo. Everything runs in your browser — the image
        never leaves this device.
      </p>

      <Dropzone
        accept="image/*"
        files={file}
        onChange={setFile}
        hint="PNG, JPG or WEBP of printed text"
        disabled={phase === "working"}
      />

      <AnimatePresence mode="wait">
        {phase === "working" && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border-border bg-surface rounded-2xl border p-4"
            role="status"
            aria-live="polite"
          >
            <div className="text-muted flex items-center justify-between text-xs">
              <span>Reading image…</span>
              <span className="font-semibold tabular-nums">{progress}%</span>
            </div>
            <div className="bg-surface-2 mt-2 h-2 overflow-hidden rounded-full">
              <motion.div
                className="bg-brand-500 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border-border bg-surface space-y-3 rounded-2xl border p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-success flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 size={16} aria-hidden="true" /> Extracted text
              </span>
              <Button variant="ghost" size="sm" onClick={copy}>
                Copy
              </Button>
            </div>
            <textarea
              readOnly
              value={text}
              aria-label="Extracted text"
              className="border-border bg-surface-2 focus:border-brand-500 min-h-40 w-full resize-y rounded-xl border p-3 text-sm outline-none"
            />
          </motion.div>
        )}

        {phase === "error" && (
          <motion.p
            key="error"
            role="alert"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-danger/40 bg-danger-soft text-danger flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm"
          >
            <AlertTriangle size={16} aria-hidden="true" /> {error}
          </motion.p>
        )}
      </AnimatePresence>

      <Button
        onClick={run}
        loading={phase === "working"}
        disabled={file.length === 0}
        leftIcon={<ScanText size={16} />}
        className="w-full"
      >
        Extract text
      </Button>
    </div>
  );
}
