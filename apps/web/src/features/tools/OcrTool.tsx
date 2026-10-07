import { useState } from "react";
import { createWorker } from "tesseract.js";
import { toast } from "sonner";
import { Copy, Download, FileText, RotateCcw, ScanText, Trash2 } from "lucide-react";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { Field, Switch, Textarea } from "@/components/ui/Form";
import { Dropzone, FileChip, ToolError, ToolProgress } from "./shared";
import { IMAGE_ACCEPT, baseName, copyText, downloadBlob } from "./utils";

const LANGUAGES = [
  { code: "eng", label: "English" },
  { code: "spa", label: "Spanish" },
  { code: "fra", label: "French" },
  { code: "deu", label: "German" },
  { code: "por", label: "Portuguese" },
  { code: "ita", label: "Italian" },
  { code: "ind", label: "Indonesian" },
  { code: "ara", label: "Arabic" },
  { code: "hin", label: "Hindi" },
  { code: "jpn", label: "Japanese" },
  { code: "kor", label: "Korean" },
  { code: "chi_sim", label: "Chinese (Simplified)" },
];

const STATUS_LABELS: Record<string, string> = {
  "loading tesseract core": "Loading the OCR engine…",
  "initializing tesseract": "Starting the OCR engine…",
  "loading language traineddata": "Downloading language data…",
  "initializing api": "Preparing recognition…",
  "recognizing text": "Reading your image…",
};

function humanizeStatus(status: string): string {
  if (!status) return "Working…";
  const known = STATUS_LABELS[status.toLowerCase()];
  if (known) return known;
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}…`;
}

/** `Image → Text` — on-device OCR with tesseract.js. */
export default function OcrTool() {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("eng");
  const [preserveSpacing, setPreserveSpacing] = useState(false);

  const [text, setText] = useState("");
  const [ran, setRan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setText("");
    setRan(false);
    setError(null);
    setProgress(0);
    setStatus("");
  };

  const handleFiles = (incoming: File[]) => {
    setFile(incoming[0] ?? null);
    setText("");
    setRan(false);
    setError(null);
    setProgress(0);
    setStatus("");
  };

  const run = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setText("");
    setRan(false);
    setProgress(0);
    setStatus("Starting…");

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    try {
      worker = await createWorker(language, undefined, {
        logger: (message) => {
          setProgress(Math.min(1, Math.max(0, message.progress ?? 0)));
          setStatus(humanizeStatus(message.status ?? ""));
        },
      });
      if (preserveSpacing) {
        await worker.setParameters({ preserve_interword_spaces: "1" });
      }
      const result = await worker.recognize(file);
      const value = (result.data?.text ?? "").trim();
      setText(value);
      setProgress(1);
      setStatus(value ? "Done" : "No text found");
    } catch (err) {
      setError(
        errorMessage(err, "OCR failed — try a sharper image with larger, high-contrast text."),
      );
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          /* the worker may already be gone — nothing to clean up */
        }
      }
      setBusy(false);
      setRan(true);
    }
  };

  const clearResult = () => {
    setText("");
    setRan(false);
  };

  const copy = async () => {
    const ok = await copyText(text);
    if (ok) toast.success("Text copied to clipboard");
    else toast.error("Couldn't copy — select the text and copy manually");
  };

  const download = () => {
    if (!file) return;
    downloadBlob(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
      `${baseName(file.name)}.txt`,
    );
    toast.success("Text file downloaded");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="bg-brand-500/10 text-brand-500 grid size-10 shrink-0 place-items-center rounded-xl">
          <ScanText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold">Image → Text (OCR)</h2>
          <p className="text-muted text-sm">
            Pull editable text out of screenshots, receipts and photos — recognition runs entirely
            in your browser.
          </p>
        </div>
      </div>

      {!file ? (
        <Dropzone
          accept={IMAGE_ACCEPT}
          onFiles={handleFiles}
          label="Drop an image here, or click to browse"
          hint="PNG, JPG, WEBP, GIF — nothing ever leaves your device."
          icon={<ScanText className="h-6 w-6" />}
          disabled={busy}
        />
      ) : (
        <FileChip
          name={file.name}
          size={file.size}
          icon={<FileText className="h-5 w-5" />}
          onRemove={busy ? undefined : reset}
        />
      )}

      <Card className="space-y-4">
        <h3 className="text-foreground text-sm font-semibold">Options</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Recognition language" hint="The language written inside the image.">
            <select
              value={language}
              disabled={busy}
              aria-label="Recognition language"
              onChange={(event) => setLanguage(event.target.value)}
              className="border-border bg-surface-2 text-foreground hover:border-border-strong focus:border-brand-500 focus:ring-brand-500/12 h-11 w-full rounded-xl border px-3.5 text-sm transition-all outline-none focus:ring-4 disabled:opacity-50"
            >
              {LANGUAGES.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="border-border bg-surface-2 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium">Preserve spacing</p>
              <p className="text-subtle text-xs">Keeps unusual gaps between words.</p>
            </div>
            <Switch
              checked={preserveSpacing}
              onChange={setPreserveSpacing}
              label="Preserve extra spacing"
              disabled={busy}
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="gradient"
          size="lg"
          loading={busy}
          disabled={!file}
          onClick={() => void run()}
          leftIcon={<ScanText className="h-4 w-4" />}
        >
          Extract text
        </Button>
        {file && !busy && (
          <Button variant="ghost" size="lg" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Start over
          </Button>
        )}
      </div>

      {busy && <ToolProgress value={progress} label={status} />}

      {error && <ToolError message={error} onRetry={file ? () => void run() : undefined} />}

      {!busy && !error && ran && text.length === 0 && (
        <EmptyState
          icon={<ScanText className="h-6 w-6" />}
          title="No readable text found"
          description="The image may be too blurry, too small or purely pictorial. Try a sharper shot with bigger text."
          action={
            <Button variant="outline" onClick={() => void run()}>
              Scan again
            </Button>
          }
        />
      )}

      {!busy && !error && text.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-foreground text-sm font-semibold">Extracted text</h3>
            <span className="text-subtle text-xs tabular-nums">
              {text.length.toLocaleString()} characters
            </span>
          </div>
          <Textarea
            value={text}
            readOnly
            aria-label="Extracted text"
            className="min-h-[220px] leading-relaxed"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copy()}
              leftIcon={<Copy className="h-4 w-4" />}
            >
              Copy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={download}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Download .txt
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearResult}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Clear
            </Button>
          </div>
        </Card>
      )}

      {!busy && !error && !ran && text.length === 0 && (
        <p className="text-subtle text-center text-sm">
          {file ? (
            <>
              Ready when you are — hit <strong>Extract text</strong> to scan {file.name}.
            </>
          ) : (
            <>
              Choose an image, tweak the options, then hit <strong>Extract text</strong>.
            </>
          )}
        </p>
      )}
    </div>
  );
}
