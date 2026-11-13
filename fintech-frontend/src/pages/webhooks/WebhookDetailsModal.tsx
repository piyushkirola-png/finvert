import { RotateCw } from "lucide-react";
import {
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
  BADGE,
  BADGE_COLORS,
} from "../../lib/styles";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  data: any;
  title: string;
  formatCurrency: (amount: number) => string;
  formatDate: (dateStr: string) => string;
  showRetry?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
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

const Field = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-xs font-medium text-slate-500 w-32 flex-shrink-0 pt-0.5">
      {label}
    </span>
    <span
      className={`text-sm font-medium flex-1 text-slate-900 ${mono ? "font-mono" : ""}`}
    >
      {value || "-"}
    </span>
  </div>
);

export default function WebhookDetailsModal({
  isOpen,
  onClose,
  loading,
  data,
  title,
  formatCurrency,
  formatDate,
  showRetry = false,
  onRetry,
  isRetrying = false,
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`${MODAL_SHELL} max-w-4xl max-h-[85vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL_HEADER}>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            ID: {data?.id ?? "-"}
          </p>
        </div>

        <div className={MODAL_BODY}>
          {loading || !data ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-10">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-3 mb-1">
                  Webhook Info
                </p>
                <Field label="Gateway" value={data.gatewayName} />
                <Field label="Merchant" value={data.merchantName} />
                <Field
                  label="Event Type"
                  value={
                    <span
                      className={`${BADGE} ${BADGE_COLORS[eventColors[data.eventType] || "slate"]}`}
                    >
                      {data.eventType || "-"}
                    </span>
                  }
                />
                <Field
                  label="Status"
                  value={
                    <span
                      className={`${BADGE} ${BADGE_COLORS[statusColors[data.status] || "slate"]}`}
                    >
                      {data.status || "-"}
                    </span>
                  }
                />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-3 mb-1">
                  Transaction
                </p>
                <Field
                  label="Amount"
                  value={formatCurrency(Number(data.amount || 0))}
                />
                <Field label="UTR" value={data.utr} mono />
                <Field label="Response Status" value={data.responseStatus} />
                <Field
                  label="Processed At"
                  value={formatDate(data.processedAt || "")}
                />
              </div>
            </div>
          )}
        </div>

        <div className={MODAL_FOOTER}>
          <div className="flex items-center gap-2">
            {showRetry && data?.status === "FAILED" && onRetry && (
              <button
                onClick={onRetry}
                disabled={isRetrying}
                className="h-9 px-4 rounded-md bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <RotateCw
                  size={14}
                  className={isRetrying ? "animate-spin" : ""}
                />
                {isRetrying ? "Retrying..." : "Retry Webhook"}
              </button>
            )}
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
