import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileImage, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropzone, type DroppedFile } from "./Dropzone";

type Phase = "idle" | "working" | "done" | "error";

const PAGE = { width: 210, height: 297 }; // A4 in mm

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = src;
  });
}

/** Images → single multi-page PDF via jsPDF, scaled to fit A4. */
export function ImageToPdfTool() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const run = async () => {
    if (files.length === 0) return;
    setPhase("working");
    setError(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      for (let i = 0; i < files.length; i++) {
        const url = URL.createObjectURL(files[i].file);
        try {
          const img = await loadImage(url);
          const orientation: "portrait" | "landscape" =
            img.width >= img.height ? "landscape" : "portrait";
          const scale = Math.min(PAGE.width / img.width, PAGE.height / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          if (i > 0) doc.addPage("a4", orientation);
          const format = files[i].file.type.includes("png") ? "PNG" : "JPEG";
          doc.addImage(img, format, (PAGE.width - w) / 2, (PAGE.height - h) / 2, w, h);
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      setDownloadUrl(URL.createObjectURL(doc.output("blob")));
      setPhase("done");
    } catch {
      setError("Couldn't build the PDF — one of the images may be corrupt.");
      setPhase("error");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">
        Stack images into one A4 PDF, in the order you add them. Processed entirely on this device.
      </p>

      <Dropzone
        accept="image/*"
        multiple
        files={files}
        onChange={setFiles}
        hint="PNG or JPG images — one PDF page each"
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
              {files.length} page{files.length === 1 ? "" : "s"} ready
            </span>
            <a
              href={downloadUrl}
              download="wolvinix-images.pdf"
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
        disabled={files.length === 0}
        leftIcon={<FileImage size={16} />}
        className="w-full"
      >
        Create PDF
      </Button>
    </div>
  );
}
