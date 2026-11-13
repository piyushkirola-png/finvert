import { useState } from "react";
import { Eye, RotateCw, Copy } from "lucide-react";
import { toast } from "sonner";
import Pagination from "../../components/ui/Pagination";
import {
  TABLE_SHELL,
  TH,
  TD,
  TD_MONO,
  BADGE,
  BADGE_COLORS,
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
} from "../../lib/styles";

export interface WebhookRow {
  id: number;
  gatewayName?: string;
  merchantName?: string;
  eventType?: string;
  amount?: number | string;
  utr?: string;
  status?: string;
  createdAt?: string;
  requestBody?: any;
  responseBody?: any;
}

interface Column {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
}

interface Props {
  rows: WebhookRow[];
  columns: Column[];
  loading: boolean;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  total: number;
  formatCurrency: (amount: number) => string;
  onView: (id: number) => void;
  onRetry?: (id: number) => void;
  isRetrying?: boolean;
  emptyText: string;
  /** Fetch a single webhook's full body (request/response) on demand */
  onFetchPayload?: (
    id: number,
    kind: "requestBody" | "responseBody",
  ) => Promise<any>;
}

const statusColors: Record<string, keyof typeof BADGE_COLORS> = {
  SUCCESS: "green",
  FAILED: "red",
  PENDING: "yellow",
  ACKNOWLEDGED: "purple",
};

const eventColors: Record<string, keyof typeof BADGE_COLORS> = {
  PAY_IN_STATUS_UPDATE: "blue",
  PAY_OUT_STATUS_UPDATE: "orange",
  SETTLEMENT_COMPLETED: "green",
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const ACTION_BTN =
  "p-1.5 rounded-md hover:bg-slate-100 transition text-slate-600";

/* ---------- Payload preview modal ---------- */

function PayloadModal({
  title,
  data,
  loading,
  onClose,
}: {
  title: string;
  data: any;
  loading?: boolean;
  onClose: () => void;
}) {
  const text = data ? JSON.stringify(data, null, 2) : "";

  const copy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4"
      onClick={onClose}
    >
      <div
        className={`${MODAL_SHELL} max-w-3xl max-h-[85vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL_HEADER}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-slate-100 transition text-slate-500"
            ></button>
          </div>
        </div>

        <div className={MODAL_BODY}>
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
            </div>
          ) : data ? (
            <div className="bg-slate-900 text-white p-3 rounded-md overflow-auto max-h-[60vh]">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                {text}
              </pre>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 text-slate-500 p-6 rounded-md text-center text-sm">
              No data available
            </div>
          )}
        </div>

        <div className={MODAL_FOOTER}>
          <button
            onClick={copy}
            disabled={!text}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50"
          >
            <Copy size={14} />
            Copy JSON
          </button>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Cell renderer ---------- */

function renderCell(
  row: any,
  colKey: string,
  formatCurrency: (amount: number) => string,
  openPayload: (
    title: string,
    kind: "requestBody" | "responseBody",
    id: number,
  ) => void,
): React.ReactNode {
  const value = row[colKey];

  if (colKey === "id") {
    return <span className="font-mono">{value ?? "-"}</span>;
  }

  if (colKey === "requestBody" || colKey === "responseBody") {
    const label = colKey === "requestBody" ? "Request" : "Response";
    return (
      <button onClick={() => openPayload(`${label} Body`, colKey, row.id)}>
        Click to Open
      </button>
    );
  }

  if (colKey === "eventType") {
    return (
      <span
        className={`${BADGE} ${BADGE_COLORS[eventColors[value] || "slate"]}`}
      >
        {value || "-"}
      </span>
    );
  }

  if (colKey === "status") {
    return (
      <span
        className={`${BADGE} ${BADGE_COLORS[statusColors[value] || "slate"]}`}
      >
        {value || "-"}
      </span>
    );
  }

  if (colKey === "amount") {
    return (
      <span className="font-semibold text-slate-900">
        {formatCurrency(Number(value || 0))}
      </span>
    );
  }

  if (colKey === "utr" || colKey === "merchantReference") {
    return (
      <span
        className="font-mono max-w-[140px] truncate inline-block"
        title={String(value || "-")}
      >
        {value || "-"}
      </span>
    );
  }

  if (
    colKey === "createdAt" ||
    colKey === "sentAt" ||
    colKey === "processedAt"
  ) {
    return formatDate(value);
  }

  if (colKey === "gatewayName" || colKey === "merchantName") {
    return <span>{value || "-"}</span>;
  }

  return <span>{value ?? "-"}</span>;
}

/* ---------- Table ---------- */

export default function WebhookTable({
  rows,
  columns,
  loading,
  page,
  setPage,
  limit,
  setLimit,
  total,
  formatCurrency,
  onView,
  onRetry,
  isRetrying = false,
  emptyText,
  onFetchPayload,
}: Props) {
  const colCount = columns.length + 1;
  const [payloadModal, setPayloadModal] = useState<{
    title: string;
    kind: "requestBody" | "responseBody";
    id: number;
  } | null>(null);
  const [payloadData, setPayloadData] = useState<any>(null);
  const [payloadLoading, setPayloadLoading] = useState(false);

  const openPayload = (
    title: string,
    kind: "requestBody" | "responseBody",
    id: number,
  ) => {
    setPayloadModal({ title, kind, id });
    setPayloadData(null);
    setPayloadLoading(true);

    if (!onFetchPayload) {
      setPayloadLoading(false);
      return;
    }

    onFetchPayload(id, kind)
      .then((data) => setPayloadData(data))
      .catch(() => setPayloadData(null))
      .finally(() => setPayloadLoading(false));
  };

  return (
    <>
      <div className={TABLE_SHELL}>
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] relative">
          <table className="w-full whitespace-nowrap [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap min-w-[1200px]">
            <thead className="sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={TH}>
                    {col.label}
                  </th>
                ))}
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="text-center py-10 text-sm text-slate-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="text-center py-10 text-sm text-slate-500"
                  >
                    {emptyText}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={col.key === "id" ? TD_MONO : TD}
                      >
                        {col.render
                          ? col.render(row)
                          : renderCell(
                              row,
                              col.key,
                              formatCurrency,
                              openPayload,
                            )}
                      </td>
                    ))}

                    <td className={TD}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onView(row.id)}
                          className={ACTION_BTN}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {onRetry && row.status === "FAILED" && (
                          <button
                            onClick={() => onRetry(row.id)}
                            disabled={isRetrying}
                            className={`${ACTION_BTN} hover:text-orange-600 disabled:opacity-50`}
                            title="Retry"
                          >
                            <RotateCw
                              size={16}
                              className={isRetrying ? "animate-spin" : ""}
                            />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>

      {payloadModal && (
        <PayloadModal
          title={payloadModal.title}
          data={payloadData}
          loading={payloadLoading}
          onClose={() => setPayloadModal(null)}
        />
      )}
    </>
  );
}
