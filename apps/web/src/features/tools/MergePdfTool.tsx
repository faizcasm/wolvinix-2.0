import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Files, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropzone, type DroppedFile } from "./Dropzone";

type Phase = "idle" | "working" | "done" | "error";

/** Merge several PDFs into one document with pdf-lib (page order = add order). */
export function MergePdfTool() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const run = async () => {
    if (files.length < 2) return;
    setPhase("working");
    setError(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const merged = await PDFDocument.create();
      for (const entry of files) {
        const source = await PDFDocument.load(await entry.file.arrayBuffer(), {
          ignoreEncryption: true,
        });
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }
      const bytes = await merged.save();
      // pdf-lib returns a Uint8Array over ArrayBufferLike; Blob wants ArrayBuffer.
      const buffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      setDownloadUrl(URL.createObjectURL(new Blob([buffer], { type: "application/pdf" })));
      setPhase("done");
    } catch {
      setError("Merge failed — a file may be corrupted or password-protected.");
      setPhase("error");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">
        Combine PDFs into a single document. Order of the list below is the order of the merged
        file.
      </p>

      <Dropzone
        accept="application/pdf"
        multiple
        files={files}
        onChange={setFiles}
        hint="Two or more PDF files"
        disabled={phase === "working"}
      />

      <AnimatePresence mode="wait">
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
        {phase === "done" && downloadUrl && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border-success/40 bg-success-soft flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
          >
            <span className="text-success flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 size={16} aria-hidden="true" />
              Merged {files.length} files
            </span>
            <a
              href={downloadUrl}
              download="wolvinix-merged.pdf"
              className="bg-brand-500 hover:bg-brand-400 focus-visible:outline-brand-500 inline-flex h-9 items-center rounded-xl px-4 text-sm font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Download PDF
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={run}
        loading={phase === "working"}
        disabled={files.length < 2}
        leftIcon={<Files size={16} />}
        className="w-full"
      >
        Merge PDFs
      </Button>
    </div>
  );
}
