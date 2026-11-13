import { useCallback, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCreatePayinBulkUpload,
  useDownloadPayinBulkUploadTemplate,
} from "../../api/mutations/payinBulkUploadMutations";
import {
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
  INPUT,
  LABEL,
  BTN_FILTER,
} from "../../lib/styles";

interface Props {
  onSubmitted?: () => void;
  onClose: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 1000;
const ACCEPTED = [".csv", ".xlsx", ".xls"];

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function BulkUploadForm({ onSubmitted, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"instant" | "scheduled">("instant");
  const [scheduleType, setScheduleType] = useState<"immediate" | "interval">(
    "immediate",
  );
  const [intervalValue, setIntervalValue] = useState(1);
  const [intervalUnit, setIntervalUnit] = useState<"minutes" | "seconds">(
    "minutes",
  );
  const [scheduledTime, setScheduledTime] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [rowCount, setRowCount] = useState<number | null>(null);

  const { mutate: createUpload, isPending: isCreating } =
    useCreatePayinBulkUpload();
  const { mutate: downloadTemplate, isPending: isDownloadingTemplate } =
    useDownloadPayinBulkUploadTemplate();

  const validateFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED.includes(`.${ext}`)) {
      toast.error("Only CSV, XLSX, and XLS files are supported.");
      return false;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error("The file exceeds the 5MB limit.");
      return false;
    }
    return true;
  };

  const estimateRows = async (f: File) => {
    if (f.name.toLowerCase().endsWith(".csv")) {
      const text = await f.text();
      const count = Math.max(
        text.split(/\r?\n/).filter((l) => l.trim().length > 0).length - 1,
        0,
      );
      setRowCount(count);
      return count;
    }
    try {
      const xlsx = await import("xlsx");
      const wb = xlsx.read(await f.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      const count = Math.max(rows.length - 1, 0);
      setRowCount(count);
      return count;
    } catch {
      toast.error("Failed to read Excel file.");
      return 0;
    }
  };

  const handleFileSelect = useCallback(async (f: File | null) => {
    if (!f || !validateFile(f)) return;
    setFile(f);
    const count = await estimateRows(f);
    if (count > MAX_ROWS) {
      toast.error(
        `The file contains ${count} rows. Maximum allowed is ${MAX_ROWS}.`,
      );
      setFile(null);
      setRowCount(null);
      return;
    }
    toast.success("File ready for upload.");
  }, []);

  const handleSubmit = () => {
    if (!file) {
      toast.error("Please choose a file first.");
      return;
    }
    if (mode === "scheduled") {
      if (!scheduledTime) {
        toast.error("Please select a scheduled time.");
        return;
      }
      const d = new Date(scheduledTime);
      if (d <= new Date()) {
        toast.error("Scheduled time must be in the future.");
        return;
      }
      const max = new Date();
      max.setDate(max.getDate() + 30);
      if (d > max) {
        toast.error(
          "Scheduled time cannot be more than 30 days in the future.",
        );
        return;
      }
    }

    onClose?.();

    createUpload(
      {
        file,
        mode,
        scheduleType,
        scheduledTime:
          mode === "scheduled"
            ? new Date(scheduledTime).toISOString()
            : undefined,
        intervalValue: scheduleType === "interval" ? intervalValue : undefined,
        intervalUnit: scheduleType === "interval" ? intervalUnit : undefined,
      },
      {
        onSuccess: () => {
          setFile(null);
          setRowCount(null);
          setScheduledTime("");
          onSubmitted?.();
        },
      },
    );
  };

  const summary = useMemo(
    () =>
      file
        ? { name: file.name, size: formatSize(file.size), rows: rowCount ?? 0 }
        : null,
    [file, rowCount],
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`${MODAL_SHELL} max-w-4xl max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL_HEADER}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Upload a File
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Accepted: CSV, XLSX, XLS. Max 5MB, up to 1000 rows.
              </p>
            </div>
            <button
              onClick={() => downloadTemplate()}
              disabled={isDownloadingTemplate}
              className={BTN_FILTER}
            >
              <Download size={14} />
              {isDownloadingTemplate ? "Downloading..." : "Template"}
            </button>
          </div>
        </div>

        <div className={MODAL_BODY}>
          <div className="space-y-4">
            {/* Mode */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className={LABEL}>Processing Mode</label>
              <div className="mt-2 flex gap-1 bg-slate-100 rounded-md p-0.5 w-fit">
                {(["instant", "scheduled"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${mode === m
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    {m === "instant" ? "Process Now" : "Schedule Later"}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <Clock3 size={14} />
                {mode === "instant"
                  ? "Your upload will begin immediately after you submit."
                  : "Your upload will be processed at the scheduled time."}
              </div>
            </div>

            {mode === "scheduled" && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                <div>
                  <label className={LABEL}>Schedule Type</label>
                  <select
                    value={scheduleType}
                    onChange={(e) =>
                      setScheduleType(
                        e.target.value as "immediate" | "interval",
                      )
                    }
                    className={`${INPUT} mt-1`}
                  >
                    <option value="immediate">Start at scheduled time</option>
                    <option value="interval">Interval between rows</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Scheduled Date & Time</label>
                  <div className="relative mt-1">
                    <Calendar
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className={`${INPUT} pl-10`}
                      min={new Date(Date.now() + 5 * 60 * 1000)
                        .toISOString()
                        .slice(0, 16)}
                    />
                  </div>
                </div>
                {scheduleType === "interval" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Interval Value</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={intervalValue}
                        onChange={(e) =>
                          setIntervalValue(Number(e.target.value))
                        }
                        className={`${INPUT} mt-1`}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Unit</label>
                      <select
                        value={intervalUnit}
                        onChange={(e) =>
                          setIntervalUnit(
                            e.target.value as "minutes" | "seconds",
                          )
                        }
                        className={`${INPUT} mt-1`}
                      >
                        <option value="minutes">Minutes</option>
                        <option value="seconds">Seconds</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* File input */}
            <input
              id="payin-bulk-upload-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) =>
                void handleFileSelect(e.target.files?.[0] ?? null)
              }
            />

            {!file && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  void handleFileSelect(e.dataTransfer.files?.[0] ?? null);
                }}
                className={`rounded-lg border-2 border-dashed p-8 text-center transition ${isDragging ? "border-slate-900" : "border-slate-200"
                  } bg-slate-50`}
              >
                <label
                  htmlFor="payin-bulk-upload-input"
                  className="flex cursor-pointer flex-col items-center gap-2"
                >
                  <div className="rounded-md bg-slate-100 p-3 text-slate-700">
                    <UploadCloud size={26} />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    Drag and drop your file here
                  </p>
                  <p className="text-xs text-slate-500">
                    or click to browse from your device
                  </p>
                </label>
              </div>
            )}

            {summary && (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="rounded-md bg-emerald-50 p-2 text-emerald-600">
                      <FileSpreadsheet size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {summary.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {summary.size} • {summary.rows} rows
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 size={12} />
                      Ready
                    </span>
                    <button
                      onClick={() => {
                        const input = document.getElementById(
                          "payin-bulk-upload-input",
                        ) as HTMLInputElement | null;
                        if (input) {
                          input.value = "";
                          input.click();
                        }
                      }}
                      className="px-2 py-1 rounded-md text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    >
                      Change
                    </button>
                    <button
                      onClick={() => {
                        setFile(null);
                        setRowCount(null);
                      }}
                      className="px-2 py-1 rounded-md text-xs bg-red-50 text-red-700 hover:bg-red-100 transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rules */}
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Validation Rules
                </h3>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <AlertCircle size={12} className="text-amber-500" /> Max 5MB
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertCircle size={12} className="text-amber-500" /> Max{" "}
                    {MAX_ROWS.toLocaleString()} rows
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertCircle size={12} className="text-amber-500" /> CSV,
                    XLSX, XLS
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fields
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-[10px] font-semibold text-rose-600 mb-1">
                      REQUIRED
                    </h4>
                    {[
                      "amount",
                      "merchantReference",
                      "customerEmail",
                      "customerPhone",
                    ].map((f) => (
                      <div
                        key={f}
                        className="flex items-center gap-1 text-xs text-slate-600"
                      >
                        <span className="text-rose-500">*</span> {f}
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-semibold text-blue-600 mb-1">
                      OPTIONAL
                    </h4>
                    {["cardNumber", "cardHolderName", "cvv", "expiryDate"].map(
                      (f) => (
                        <div
                          key={f}
                          className="flex items-center gap-1 text-xs text-slate-600"
                        >
                          <span className="text-blue-400">*</span> {f}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={MODAL_FOOTER}>
          <button onClick={onClose} className={BTN_FILTER}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || isCreating}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
          >
            {isCreating
              ? "Uploading..."
              : mode === "instant"
                ? "Submit Upload"
                : "Schedule Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
