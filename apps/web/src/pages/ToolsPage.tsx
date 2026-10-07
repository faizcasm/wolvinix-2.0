import { Suspense, lazy, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileImage, ScanText, Files, Wrench, Loader2 } from "lucide-react";

/**
 * Tools are the heaviest clients in the app (tesseract.js ships a wasm
 * engine, jspdf/pdf-lib pull parsing code) — each one is its own chunk and
 * only loads when its tab is opened.
 */
const OcrTool = lazy(() =>
  import("@/features/tools/OcrTool").then((m) => ({ default: m.OcrTool })),
);
const ImageToPdfTool = lazy(() =>
  import("@/features/tools/ImageToPdfTool").then((m) => ({ default: m.ImageToPdfTool })),
);
const MergePdfTool = lazy(() =>
  import("@/features/tools/MergePdfTool").then((m) => ({ default: m.MergePdfTool })),
);

type ToolId = "ocr" | "image-pdf" | "merge-pdf";

const TOOLS: Array<{
  id: ToolId;
  label: string;
  icon: typeof ScanText;
  blurb: string;
}> = [
  { id: "ocr", label: "Image → Text", icon: ScanText, blurb: "OCR any screenshot" },
  { id: "image-pdf", label: "Images → PDF", icon: FileImage, blurb: "Stack images to A4" },
  { id: "merge-pdf", label: "Merge PDFs", icon: Files, blurb: "Join files in order" },
];

/** `/tools` — tabbed client-side utilities (OCR, image→PDF, merge PDF). */
export default function ToolsPage() {
  const [active, setActive] = useState<ToolId>("ocr");

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center gap-3">
        <span className="bg-accent/15 text-accent grid size-11 shrink-0 place-items-center rounded-2xl">
          <Wrench size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold">Tools</h1>
          <p className="text-muted text-sm">
            Small utilities that run on your device — files never get uploaded.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose a tool">
        {TOOLS.map((tool) => {
          const selected = active === tool.id;
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              role="tab"
              id={`tool-tab-${tool.id}`}
              aria-selected={selected}
              aria-controls="tool-panel"
              onClick={() => setActive(tool.id)}
              className={`focus-visible:outline-brand-500 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                selected
                  ? "border-brand-500 bg-brand-500/10 text-foreground"
                  : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {tool.label}
            </button>
          );
        })}
      </div>

      <p className="text-subtle text-xs">{TOOLS.find((t) => t.id === active)?.blurb}</p>

      <section
        id="tool-panel"
        role="tabpanel"
        aria-labelledby={`tool-tab-${active}`}
        className="border-border bg-surface rounded-2xl border p-4 sm:p-5"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense
              fallback={
                <div className="text-muted flex items-center justify-center gap-2 py-10 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading tool…
                </div>
              }
            >
              {active === "ocr" ? (
                <OcrTool />
              ) : active === "image-pdf" ? (
                <ImageToPdfTool />
              ) : (
                <MergePdfTool />
              )}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
