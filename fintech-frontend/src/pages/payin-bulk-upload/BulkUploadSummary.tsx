import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Store,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react";
import { useBulkUploadDetails } from "../../api/queries/usePayinBulkUpload";
import {
  useRetryPayinBulkUpload,
  useDownloadPayinBulkUploadErrorReport,
  useDownloadPayinUpiIntents,
} from "../../api/mutations/payinBulkUploadMutations";
import {
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
  BADGE,
  BADGE_COLORS,
} from "../../lib/styles";

interface Props {
  uploadId: number | null;
  onClose: () => void;
  isAdmin?: boolean;
}

const statusTone: Record<string, keyof typeof BADGE_COLORS> = {
  COMPLETED: "green",
  PARTIAL_SUCCESS: "yellow",
  PROCESSING: "blue",
  FAILED: "red",
  PENDING: "yellow",
  PAUSED: "orange",
};

export default function BulkUploadSummary({
  uploadId,
  onClose,
  isAdmin = false,
}: Props) {
  const { data: detail, isLoading } = useBulkUploadDetails(uploadId);
  const { mutate: retry, isPending: isRetrying } = useRetryPayinBulkUpload();
  const { mutate: downloadReport, isPending: isDownloading } =
    useDownloadPayinBulkUploadErrorReport();
  const { mutate: downloadIntents, isPending: isDownloadingIntents } =
    useDownloadPayinUpiIntents();

  if (!uploadId) return null;

  const successRate =
    detail && detail.totalRows > 0
      ? Math.round((detail.successRows / detail.totalRows) * 100)
      : 0;

  const mode = detail?.mode
    ? detail.mode.charAt(0).toUpperCase() + detail.mode.slice(1)
    : detail?.scheduledTask
      ? "Scheduled"
      : "Instant";

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
          <h2 className="text-sm font-semibold text-slate-900">
            Upload Summary
          </h2>
        </div>

        <div className={MODAL_BODY}>
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
            </div>
          ) : !detail ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Upload not found.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-md bg-slate-100">
                  <FileSpreadsheet size={20} className="text-slate-700" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 truncate">
                    {detail.fileName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>Upload ID: {detail.id}</span>
                    {isAdmin && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Store size={12} />
                          {detail.merchant?.name || "N/A"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {detail.user?.fullName || "N/A"}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>
                      {new Date(detail.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Total Rows</p>
                  <p className="text-lg font-semibold text-slate-900 mt-1">
                    {detail.totalRows}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600">Success</p>
                  <p className="text-lg font-semibold text-green-600 mt-1">
                    {detail.successRows}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-red-600">Failed</p>
                  <p className="text-lg font-semibold text-red-600 mt-1">
                    {detail.failedRows}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 flex items-center justify-center gap-1">
                    <TrendingUp size={12} />
                    Success Rate
                  </p>
                  <p
                    className={`text-lg font-semibold mt-1 ${successRate >= 80
                      ? "text-green-600"
                      : successRate >= 50
                        ? "text-amber-600"
                        : "text-red-600"
                      }`}
                  >
                    {successRate}%
                  </p>
                </div>
              </div>

              {/* Status + Mode */}
              <div className="flex items-center flex-wrap gap-3">
                <span className="text-xs text-slate-500">Status:</span>
                <span
                  className={`${BADGE} ${BADGE_COLORS[statusTone[detail.status] || "slate"]
                    }`}
                >
                  {detail.status.replace("_", " ")}
                </span>
                {detail.processedAt && (
                  <span className="text-xs text-slate-400">
                    Processed: {new Date(detail.processedAt).toLocaleString()}
                  </span>
                )}
                <span className="text-xs text-slate-500 ml-2">Mode:</span>
                <span
                  className={`${BADGE} ${mode === "Scheduled"
                    ? BADGE_COLORS.green
                    : BADGE_COLORS.yellow
                    }`}
                >
                  {mode}
                </span>
              </div>

              {/* Error report */}
              {detail.errorReport?.details?.length ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <AlertCircle size={16} />
                    {detail.errorReport.summary.totalErrors} errors found
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(
                      detail.errorReport.summary.errorTypes || {},
                    ).map(([type, count]) => (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-2 py-0.5 text-xs text-red-600"
                      >
                        {type}: {count as number}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    {detail.errorReport.details.map((err: any, i: number) => (
                      <div
                        key={i}
                        className="text-xs text-red-600 py-1 border-b border-red-100 last:border-0"
                      >
                        Row {err.rowNumber}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Row-level results */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">
                  Row Results
                </h4>
                {detail.rows?.length ? (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                      <table className="w-full min-w-[700px]">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                              Row
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                              Merchant Reference
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                              Amount
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                              Status
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">
                              Error
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detail.rows.map((row: any) => (
                            <tr key={row.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-xs text-slate-700">
                                {row.rowNumber}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs text-slate-600">
                                {row.merchantReference || "-"}
                              </td>
                              <td className="px-3 py-2 text-xs text-slate-700">
                                {row.amount || "-"}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`${BADGE} ${row.status === "SUCCESS"
                                    ? BADGE_COLORS.green
                                    : BADGE_COLORS.red
                                    }`}
                                >
                                  {row.status === "SUCCESS" ? (
                                    <CheckCircle2 size={12} />
                                  ) : (
                                    <XCircle size={12} />
                                  )}
                                  {row.status === "SUCCESS"
                                    ? "Success"
                                    : "Failed"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs text-red-600">
                                {row.errorMessage ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <AlertCircle size={12} />
                                    {row.errorMessage}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 bg-slate-50 rounded-md p-3">
                    No row-level results available.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={MODAL_FOOTER}>
          {detail && (detail.upiIntentCount ?? 0) > 0 && (
            <button
              onClick={() => downloadIntents(uploadId)}
              disabled={isDownloadingIntents}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50"
            >
              <Download
                size={16}
                className={isDownloadingIntents ? "animate-pulse" : ""}
              />
              {isDownloadingIntents
                ? "Downloading..."
                : `Download UPI Intents (${detail.upiIntentCount})`}
            </button>
          )}
          {detail && detail.failedRows > 0 && (
            <>
              <button
                onClick={() => downloadReport(uploadId)}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50"
              >
                <Download
                  size={16}
                  className={isDownloading ? "animate-pulse" : ""}
                />
                {isDownloading ? "Downloading..." : "Download Error Report"}
              </button>
              <button
                onClick={() => retry(uploadId)}
                disabled={isRetrying}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={isRetrying ? "animate-spin" : ""}
                />
                {isRetrying
                  ? "Retrying..."
                  : `Retry ${detail.failedRows} Failed Rows`}
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
