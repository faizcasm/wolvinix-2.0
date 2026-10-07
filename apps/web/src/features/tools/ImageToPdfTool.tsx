import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { Download, FileCheck2, FileImage, Images, Plus, RotateCcw } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Form";
import { Dropzone, FileChip, ToolError, ToolProgress } from "./shared";
import {
  IMAGE_ACCEPT,
  formatBytes,
  downloadBlob,
  loadImage,
  readAsDataUrl,
  toJpegDataUrl,
  withExtension,
} from "./utils";

type PageSize = "a4" | "letter" | "legal";
type Orientation = "auto" | "portrait" | "landscape";
type Margin = "none" | "tight" | "comfortable";

const PAGE_SIZES: { id: PageSize; label: string }[] = [
  { id: "a4", label: "A4" },
  { id: "letter", label: "US Letter" },
  { id: "legal", label: "US Legal" },
];

const ORIENTATIONS: { id: Orientation; label: string }[] = [
  { id: "auto", label: "Match the image" },
  { id: "portrait", label: "Portrait" },
  { id: "landscape", label: "Landscape" },
];

const MARGIN_PT: Record<Margin, number> = { none: 0, tight: 24, comfortable: 48 };
const MARGIN_LABELS: { id: Margin; label: string }[] = [
  { id: "none", label: "Full bleed" },
  { id: "tight", label: "Tight" },
  { id: "comfortable", label: "Comfortable" },
];

const MAX_FILES = 30;

interface BuiltPdf {
  blob: Blob;
  name: string;
  pages: number;
}

/** `Image → PDF` — assembles images into a single, fitted PDF via jsPDF. */
export default function ImageToPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<Orientation>("auto");
  const [margin, setMargin] = useState<Margin>("tight");
  const [filename, setFilename] = useState("wolvinix-images");

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuiltPdf | null>(null);

  /* object URLs are rebuilt whenever the selection changes, then revoked */
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const handleFiles = (incoming: File[]) => {
    setError(null);
    setResult(null);
    setFiles((current) => {
      const next = [...current, ...incoming];
      if (next.length > MAX_FILES) {
        toast.warning(`Capped at ${MAX_FILES} images per PDF`);
        return next.slice(0, MAX_FILES);
      }
      return next;
    });
  };

  const removeAt = (index: number) => {
    setResult(null);
    setFiles((current) => current.filter((_, position) => position !== index));
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatus("");
  };

  const run = async () => {
    if (files.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setStatus("Preparing images…");

    try {
      const firstDataUrl = await readAsDataUrl(files[0]);
      const first = await loadImage(firstDataUrl);
      const resolved: "portrait" | "landscape" =
        orientation === "auto"
          ? first.naturalWidth >= first.naturalHeight
            ? "landscape"
            : "portrait"
          : orientation;

      const doc = new jsPDF({
        orientation: resolved,
        unit: "pt",
        format: pageSize,
        compress: true,
      });
      const pad = MARGIN_PT[margin];
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      for (let index = 0; index < files.length; index += 1) {
        const source = files[index];
        const dataUrl = index === 0 ? firstDataUrl : await readAsDataUrl(source);
        const image = index === 0 ? first : await loadImage(dataUrl);

        const scale = Math.min(
          (pageWidth - pad * 2) / image.naturalWidth,
          (pageHeight - pad * 2) / image.naturalHeight,
        );
        const width = Math.max(1, image.naturalWidth * scale);
        const height = Math.max(1, image.naturalHeight * scale);
        const x = (pageWidth - width) / 2;
        const y = (pageHeight - height) / 2;

        if (index > 0) doc.addPage(pageSize, resolved);

        const type = source.type.toLowerCase();
        const imageFormat =
          type === "image/png"
            ? "PNG"
            : type === "image/jpeg" || type === "image/jpg"
              ? "JPEG"
              : null;
        // jsPDF only decodes PNG/JPEG natively — anything else goes via canvas.
        const payload = imageFormat ? dataUrl : toJpegDataUrl(image);

        doc.addImage(payload, imageFormat ?? "JPEG", x, y, width, height, undefined, "FAST");

        setProgress((index + 1) / files.length);
        setStatus(`Adding page ${index + 1} of ${files.length}…`);
      }

      const blob = doc.output("blob");
      setResult({
        blob,
        name: withExtension(filename, "pdf"),
        pages: files.length,
      });
      setProgress(1);
      setStatus("PDF ready");
    } catch (err) {
      setError(errorMessage(err, "Couldn't build the PDF — one of these images may be corrupt."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="bg-accent-soft text-accent grid size-10 shrink-0 place-items-center rounded-xl">
          <FileImage className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold">Image → PDF</h2>
          <p className="text-muted text-sm">
            Stack screenshots and photos into one tidy, shareable PDF — every page is fitted and
            centered automatically.
          </p>
        </div>
      </div>

      {files.length === 0 ? (
        <Dropzone
          accept={IMAGE_ACCEPT}
          multiple
          onFiles={handleFiles}
          label="Drop images here, or click to browse"
          hint="PNG, JPG, WEBP, GIF — first image sets the page orientation."
          icon={<Images className="h-6 w-6" />}
          disabled={busy}
        />
      ) : (
        <div className="space-y-2">
          {files.map((file, index) => (
            <FileChip
              key={`${file.name}-${file.size}-${index}`}
              name={file.name}
              size={file.size}
              previewUrl={previews[index]}
              icon={<FileImage className="h-5 w-5" />}
              onRemove={busy ? undefined : () => removeAt(index)}
            />
          ))}
          {!busy && (
            <Dropzone
              accept={IMAGE_ACCEPT}
              multiple
              onFiles={handleFiles}
              label="Add more images"
              hint="Appended as extra pages, in this order."
              icon={<Plus className="h-5 w-5" />}
              compact
            />
          )}
        </div>
      )}

      <Card className="space-y-4">
        <h3 className="text-foreground text-sm font-semibold">Options</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Page size">
            <Select
              label="Page size"
              value={pageSize}
              disabled={busy}
              onChange={(value) => setPageSize(value as PageSize)}
              options={PAGE_SIZES}
            />
          </Field>
          <Field label="Orientation">
            <Select
              label="Orientation"
              value={orientation}
              disabled={busy}
              onChange={(value) => setOrientation(value as Orientation)}
              options={ORIENTATIONS}
            />
          </Field>
          <Field label="Margins">
            <Select
              label="Margins"
              value={margin}
              disabled={busy}
              onChange={(value) => setMargin(value as Margin)}
              options={MARGIN_LABELS}
            />
          </Field>
        </div>
        <Field label="File name" hint="The download keeps a .pdf extension.">
          <Input
            value={filename}
            disabled={busy}
            onChange={(event) => setFilename(event.target.value)}
            placeholder="my-images"
            aria-label="Output file name"
            maxLength={80}
          />
        </Field>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="gradient"
          size="lg"
          loading={busy}
          disabled={files.length === 0}
          onClick={() => void run()}
          leftIcon={<FileImage className="h-4 w-4" />}
        >
          Build PDF
        </Button>
        {files.length > 0 && !busy && (
          <Button variant="ghost" size="lg" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Clear all
          </Button>
        )}
      </div>

      {busy && <ToolProgress value={progress} label={status} tone="accent" />}

      {error && (
        <ToolError message={error} onRetry={files.length > 0 ? () => void run() : undefined} />
      )}

      {!busy && !error && !result && files.length === 0 && (
        <EmptyState
          icon={<Images className="h-6 w-6" />}
          title="No images selected yet"
          description="Add at least one image — the PDF is assembled locally and never uploaded."
        />
      )}

      {!busy && !error && result && (
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="bg-lime-soft text-lime grid size-11 shrink-0 place-items-center rounded-xl">
              <FileCheck2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-foreground truncate text-sm font-semibold" title={result.name}>
                {result.name}
              </p>
              <p className="text-subtle text-xs">
                {result.pages} page{result.pages === 1 ? "" : "s"} · {formatBytes(result.blob.size)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => downloadBlob(result.blob, result.name)}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Download PDF
            </Button>
            <Button variant="ghost" onClick={reset}>
              Start over
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

/** Native `<select>` styled like the rest of the form controls. */
function Select({
  value,
  options,
  onChange,
  disabled,
  label,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      className="border-border bg-surface-2 text-foreground hover:border-border-strong focus:border-brand-500 focus:ring-brand-500/12 h-11 w-full rounded-xl border px-3.5 text-sm transition-all outline-none focus:ring-4 disabled:opacity-50"
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
