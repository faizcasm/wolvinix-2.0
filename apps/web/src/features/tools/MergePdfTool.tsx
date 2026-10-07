import { useState } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileCheck2,
  FileText,
  Files,
  RotateCcw,
} from "lucide-react";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { Field, Input, Switch } from "@/components/ui/Form";
import { Dropzone, FileChip, ToolError, ToolProgress } from "./shared";
import { PDF_ACCEPT, bytesToBlob, downloadBlob, formatBytes, withExtension } from "./utils";

const MAX_FILES = 20;

interface MergedPdf {
  blob: Blob;
  name: string;
  pages: number;
}

/** `Merge PDFs` — stacks documents in order with pdf-lib, entirely offline. */
export default function MergePdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [filename, setFilename] = useState("wolvinix-merged");
  const [numberPages, setNumberPages] = useState(false);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MergedPdf | null>(null);

  const handleFiles = (incoming: File[]) => {
    setError(null);
    setResult(null);
    setFiles((current) => {
      const next = [...current, ...incoming];
      if (next.length > MAX_FILES) {
        toast.warning(`Capped at ${MAX_FILES} PDFs per merge`);
        return next.slice(0, MAX_FILES);
      }
      return next;
    });
  };

  const removeAt = (index: number) => {
    setResult(null);
    setFiles((current) => current.filter((_, position) => position !== index));
  };

  const move = (index: number, delta: number) => {
    setResult(null);
    setFiles((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatus("");
  };

  const run = async () => {
    if (files.length < 2 || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setStatus("Reading documents…");

    try {
      const merged = await PDFDocument.create();

      for (let index = 0; index < files.length; index += 1) {
        const source = files[index];
        setStatus(`Merging ${source.name} (${index + 1} of ${files.length})…`);

        const bytes = await source.arrayBuffer();
        let document: PDFDocument;
        try {
          document = await PDFDocument.load(bytes, { ignoreEncryption: true });
        } catch {
          throw new Error(`${source.name} isn't a readable PDF file`);
        }

        const copied = await merged.copyPages(document, document.getPageIndices());
        copied.forEach((page) => merged.addPage(page));

        setProgress((index + 1) / (files.length + 1));
      }

      if (numberPages) {
        setStatus("Numbering pages…");
        const font = await merged.embedFont(StandardFonts.Helvetica);
        const pages = merged.getPages();
        pages.forEach((page, index) => {
          const label = `${index + 1} / ${pages.length}`;
          const size = 10;
          const textWidth = font.widthOfTextAtSize(label, size);
          const { width, height } = page.getSize();
          page.drawText(label, {
            x: (width - textWidth) / 2,
            y: Math.min(18, height / 2),
            size,
            font,
          });
        });
      }

      const bytes = await merged.save();
      const blob = bytesToBlob(bytes, "application/pdf");
      setResult({
        blob,
        name: withExtension(filename, "pdf"),
        pages: merged.getPageCount(),
      });
      setProgress(1);
      setStatus("PDF ready");
    } catch (err) {
      setError(errorMessage(err, "Couldn't merge these PDFs — one file may be damaged."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="bg-lime-soft text-lime grid size-10 shrink-0 place-items-center rounded-xl">
          <Files className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold">Merge PDFs</h2>
          <p className="text-muted text-sm">
            Combine reports, tickets and scans into a single document — reorder them below, then
            merge in seconds.
          </p>
        </div>
      </div>

      {files.length === 0 ? (
        <Dropzone
          accept={PDF_ACCEPT}
          multiple
          onFiles={handleFiles}
          label="Drop PDFs here, or click to browse"
          hint="Pick at least two — they're combined top to bottom."
          icon={<Files className="h-6 w-6" />}
          disabled={busy}
        />
      ) : (
        <div className="space-y-2">
          {files.map((file, index) => (
            <FileChip
              key={`${file.name}-${file.size}-${index}`}
              name={file.name}
              size={file.size}
              icon={<FileText className="h-5 w-5" />}
              onRemove={busy ? undefined : () => removeAt(index)}
              actions={
                busy ? undefined : (
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${file.name} up`}
                      className="text-subtle hover:bg-surface-2 hover:text-foreground rounded-lg p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-40"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === files.length - 1}
                      aria-label={`Move ${file.name} down`}
                      className="text-subtle hover:bg-surface-2 hover:text-foreground rounded-lg p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-40"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </span>
                )
              }
            />
          ))}
          {!busy && (
            <Dropzone
              accept={PDF_ACCEPT}
              multiple
              onFiles={handleFiles}
              label="Add more PDFs"
              hint="Appended to the bottom of the stack."
              icon={<Files className="h-5 w-5" />}
              compact
            />
          )}
          <p className="text-subtle text-xs">
            {files.length} file{files.length === 1 ? "" : "s"} in order — first file becomes the
            opening pages.
          </p>
        </div>
      )}

      <Card className="space-y-4">
        <h3 className="text-foreground text-sm font-semibold">Options</h3>
        <Field label="File name" hint="The download keeps a .pdf extension.">
          <Input
            value={filename}
            disabled={busy}
            onChange={(event) => setFilename(event.target.value)}
            placeholder="merged-document"
            aria-label="Output file name"
            maxLength={80}
          />
        </Field>
        <div className="border-border bg-surface-2 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-foreground text-sm font-medium">Add page numbers</p>
            <p className="text-subtle text-xs">Stamps “1 / N” at the foot of every page.</p>
          </div>
          <Switch
            checked={numberPages}
            onChange={setNumberPages}
            label="Add page numbers"
            disabled={busy}
          />
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="gradient"
          size="lg"
          loading={busy}
          disabled={files.length < 2}
          onClick={() => void run()}
          leftIcon={<Files className="h-4 w-4" />}
        >
          Merge {files.length > 1 ? `${files.length} PDFs` : "PDFs"}
        </Button>
        {files.length > 0 && !busy && (
          <Button variant="ghost" size="lg" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Clear all
          </Button>
        )}
      </div>

      {files.length > 0 && files.length < 2 && (
        <p className="text-subtle text-sm">Add one more PDF to enable merging.</p>
      )}

      {busy && <ToolProgress value={progress} label={status} tone="lime" />}

      {error && (
        <ToolError message={error} onRetry={files.length >= 2 ? () => void run() : undefined} />
      )}

      {!busy && !error && !result && files.length === 0 && (
        <EmptyState
          icon={<Files className="h-6 w-6" />}
          title="No PDFs selected yet"
          description="Drop two or more documents to stitch them together — files never leave your device."
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
