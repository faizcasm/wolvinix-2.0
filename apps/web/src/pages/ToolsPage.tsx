import { Suspense, lazy, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ScanText, ShieldCheck, Wrench } from "lucide-react";
import { Skeleton } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Modal";

/* Each tool ships its own chunk so the page never drags in OCR/PDF engines. */
const OcrTool = lazy(() => import("@/features/tools/OcrTool"));
const ImageToPdfTool = lazy(() => import("@/features/tools/ImageToPdfTool"));
const MergePdfTool = lazy(() => import("@/features/tools/MergePdfTool"));

type ToolId = "ocr" | "image-pdf" | "merge-pdf";

const TOOLS: { id: ToolId; label: string }[] = [
  { id: "ocr", label: "OCR" },
  { id: "image-pdf", label: "Image → PDF" },
  { id: "merge-pdf", label: "Merge PDFs" },
];

function renderTool(id: ToolId): ReactNode {
  if (id === "ocr") return <OcrTool />;
  if (id === "image-pdf") return <ImageToPdfTool />;
  return <MergePdfTool />;
}

/** Shown while a tool's chunk is still downloading. */
function ToolSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading tool">
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="border-border bg-surface space-y-4 rounded-2xl border p-4">
        <Skeleton className="h-4 w-24" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-12 w-36 rounded-xl" />
        <Skeleton className="h-12 w-28 rounded-xl" />
      </div>
    </div>
  );
}

/** `/tools` — a tabbed workspace for the three on-device creator utilities. */
export default function ToolsPage() {
  const reduceMotion = Boolean(useReducedMotion());
  const [active, setActive] = useState<ToolId>("ocr");
  // Tabs stay mounted once opened so work isn't lost when switching back.
  const [visited, setVisited] = useState<ToolId[]>(["ocr"]);

  const activate = (id: ToolId) => {
    setActive(id);
    setVisited((current) => (current.includes(id) ? current : [...current, id]));
  };

  return (
    <div className="space-y-6 pb-4">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="noise border-border bg-surface relative overflow-hidden rounded-2xl border p-5 sm:p-7"
      >
        <span
          className="bg-brand-500/25 pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <span
          className="bg-accent/20 pointer-events-none absolute -bottom-24 left-8 h-48 w-48 rounded-full blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex items-start gap-3">
          <span className="bg-brand-500/10 text-brand-500 grid size-11 shrink-0 place-items-center rounded-2xl">
            <Wrench size={22} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold sm:text-2xl">Creator tools</h1>
            <p className="text-muted text-sm sm:text-base">
              Three utilities for turning images and PDFs around — no uploads, no watermarks, no
              waiting in a queue.
            </p>
            <span className="border-accent/30 bg-accent/10 text-foreground mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
              <ShieldCheck className="text-accent h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Runs 100% in your browser — files never leave your device
            </span>
          </div>
        </div>
      </motion.header>

      <Tabs items={TOOLS} value={active} onChange={(id) => activate(id as ToolId)} />

      <div>
        {visited.map((id) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={active === id ? "block" : "hidden"}
            aria-hidden={active !== id}
          >
            <Suspense fallback={<ToolSkeleton />}>{renderTool(id)}</Suspense>
          </motion.div>
        ))}
      </div>

      <p className="text-subtle flex items-center justify-center gap-1.5 text-center text-xs">
        <ScanText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        OCR, PDF building and merging all run locally — the API is never asked to store your files.
      </p>
    </div>
  );
}
