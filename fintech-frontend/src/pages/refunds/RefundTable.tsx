import { useState } from "react";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import {
  useUpdateRefundStatus,
  useCancelRefund,
} from "../../api/mutations/refundMutations";
import { useCurrency } from "../../components/context/CurrencyContext";
import Pagination from "../../components/ui/Pagination";
import type { Refund } from "../../types/refund";
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

interface Props {
  data: Refund[];
  loading: boolean;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  total: number;
  onRefresh: () => void;
  isAdmin: boolean;
}

const statusColors: Record<string, keyof typeof BADGE_COLORS> = {
  COMPLETED: "green",
  PROCESSING: "orange",
  PENDING: "yellow",
  FAILED: "red",
  CANCELLED: "slate",
};

const typeColors: Record<string, keyof typeof BADGE_COLORS> = {
  FULL: "purple",
  PARTIAL: "blue",
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr || dateStr === "-") return "-";
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

const getLastUpdated = (r: Refund) =>
  r.status === "COMPLETED" || r.status === "FAILED" || r.status === "CANCELLED"
    ? r.updatedAt || r.completedAt || r.createdAt
    : null;

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

const ACTION_BTN =
  "h-7 px-2.5 rounded-md border border-slate-300 bg-white text-xs font-medium hover:bg-[#f5efe0] transition disabled:opacity-50";

export default function RefundTable({
  data,
  loading,
  page,
  setPage,
  limit,
  setLimit,
  total,
  onRefresh,
  isAdmin,
}: Props) {
  const { formatCurrency } = useCurrency();
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    id: number | null;
    status: string | null;
  }>({ open: false, id: null, status: null });
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);

  const { mutate: updateStatus, isPending: isUpdating } =
    useUpdateRefundStatus();
  const { mutate: cancelRefund, isPending: isCancelling } = useCancelRefund();

  const colCount = isAdmin ? 10 : 9;

  const done = () => {
    setActionLoading(null);
    onRefresh();
  };

  const confirmAction = () => {
    const { id, status } = confirmState;
    if (id && status) {
      setActionLoading(id);
      if (status === "CANCELLED") {
        cancelRefund(id, {
          onSuccess: done,
          onError: () => setActionLoading(null),
        });
      } else {
        updateStatus(
          { id, status },
          { onSuccess: done, onError: () => setActionLoading(null) },
        );
      }
    }
    setConfirmState({ open: false, id: null, status: null });
  };

  const ask = (id: number, status: string) =>
    setConfirmState({ open: true, id, status });

  const confirmMeta: Record<
    string,
    { title: string; verb: string; text: string; icon: any; iconWrap: string }
  > = {
    PROCESSING: {
      title: "Process Refund?",
      verb: "process",
      text: "This will send the refund request to the gateway. The wallet is debited only after the gateway confirms via webhook.",
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      iconWrap: "bg-green-50",
    },
    FAILED: {
      title: "Fail Refund?",
      verb: "fail",
      text: "No wallet change.",
      icon: <XCircle className="w-6 h-6 text-red-600" />,
      iconWrap: "bg-red-50",
    },
    CANCELLED: {
      title: "Cancel Refund?",
      verb: "cancel",
      text: "This will cancel the pending refund.",
      icon: <AlertCircle className="w-6 h-6 text-slate-600" />,
      iconWrap: "bg-slate-100",
    },
  } as any;
  const meta = confirmState.status ? confirmMeta[confirmState.status] : null;

  return (
    <>
      <div className={TABLE_SHELL}>
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] relative">
          <table
            className={`w-full whitespace-nowrap [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap ${
              isAdmin ? "min-w-[1300px]" : "min-w-[1000px]"
            }`}
          >
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={TH}>ID</th>
                {isAdmin && <th className={TH}>Merchant</th>}
                <th className={TH}>PayIn ID</th>
                <th className={`${TH} min-w-[140px]`}>Merchant Reference</th>
                <th className={TH}>Amount</th>
                <th className={TH}>Type</th>
                <th className={TH}>Status</th>
                <th className={TH}>Reason</th>
                <th className={TH}>Initiated</th>
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
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="text-center py-10 text-sm text-slate-500"
                  >
                    No refunds found
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const isPendingStatus = item.status === "PENDING";
                  const busy = actionLoading === item.id;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                    >
                      <td className={TD_MONO}>{item.id}</td>
                      {isAdmin && (
                        <td className={TD}>
                          {item.merchant?.name || `Merchant ${item.merchantId}`}
                        </td>
                      )}
                      <td className={TD_MONO}>{item.payInRequestId}</td>
                      <td className={`${TD_MONO} min-w-[140px]`}>
                        {item.payInRequest?.merchantReference || "-"}
                      </td>
                      <td className={`${TD} font-semibold text-slate-900`}>
                        {formatCurrency(Number(item.amount))}
                      </td>
                      <td className={TD}>
                        <span
                          className={`${BADGE} ${BADGE_COLORS[typeColors[item.refundType || "FULL"] || "slate"]}`}
                        >
                          {item.refundType || "FULL"}
                        </span>
                      </td>
                      <td className={TD}>
                        <span
                          className={`${BADGE} ${BADGE_COLORS[statusColors[item.status] || "slate"]}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td
                        className={`${TD} max-w-[160px] truncate`}
                        title={item.reason || "-"}
                      >
                        {item.reason || "-"}
                      </td>
                      <td className={TD}>{formatDate(item.initiatedAt)}</td>
                      <td className={TD}>
                        <div className="flex items-center gap-1.5">
                          {isAdmin && isPendingStatus && (
                            <>
                              <button
                                onClick={() => ask(item.id, "PROCESSING")}
                                disabled={busy || isUpdating}
                                className={`${ACTION_BTN} text-green-700`}
                              >
                                {busy ? "..." : "Process"}
                              </button>
                              <button
                                onClick={() => ask(item.id, "FAILED")}
                                disabled={busy || isUpdating}
                                className={`${ACTION_BTN} text-red-600`}
                              >
                                {busy ? "..." : "Fail"}
                              </button>
                              <button
                                onClick={() => ask(item.id, "CANCELLED")}
                                disabled={busy || isCancelling}
                                className={`${ACTION_BTN} text-slate-700`}
                              >
                                {busy ? "..." : "Cancel"}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedRefund(item)}
                            className={`${ACTION_BTN} text-slate-700`}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Confirmation modal */}
      {confirmState.open && meta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${MODAL_SHELL} max-w-sm`}>
            <div className={MODAL_BODY}>
              <div className="text-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${meta.iconWrap}`}
                >
                  {meta.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {meta.title}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Are you sure you want to{" "}
                  <span className="font-semibold text-slate-900">
                    {meta.verb}
                  </span>{" "}
                  this refund?
                </p>
                <p className="text-xs text-slate-500 mt-2">{meta.text}</p>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <button
                onClick={() =>
                  setConfirmState({ open: false, id: null, status: null })
                }
                className="h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className="h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
              >
                Yes, Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details modal */}
      {selectedRefund && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedRefund(null)}
        >
          <div
            className={`${MODAL_SHELL} max-w-4xl max-h-[85vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={MODAL_HEADER}>
              <h3 className="text-sm font-semibold text-slate-900">
                Refund Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                ID: {selectedRefund.id}
              </p>
            </div>

            <div className={MODAL_BODY}>
              {/* Two-column section headers + fields */}
              <div className="grid grid-cols-2 gap-x-10">
                {/* Left column */}
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-3 mb-1">
                    Refund Info
                  </p>
                  <Field label="Refund ID" value={selectedRefund.id} />
                  <Field
                    label="Status"
                    value={
                      <span
                        className={`${BADGE} ${BADGE_COLORS[statusColors[selectedRefund.status] || "slate"]}`}
                      >
                        {selectedRefund.status}
                      </span>
                    }
                  />
                  <Field
                    label="Refund Type"
                    value={selectedRefund.refundType || "FULL"}
                  />
                  <Field label="Reason" value={selectedRefund.reason} />
                  {selectedRefund.gatewayRefundId && (
                    <Field
                      label="Gateway Refund ID"
                      value={selectedRefund.gatewayRefundId}
                    />
                  )}
                </div>

                {/* Right column */}
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-3 mb-1">
                    PayIn &amp; Amount
                  </p>
                  <Field
                    label="PayIn ID"
                    value={selectedRefund.payInRequestId}
                  />
                  <Field
                    label="Merchant Ref"
                    value={selectedRefund.payInRequest?.merchantReference}
                  />
                  {isAdmin && (
                    <Field
                      label="Merchant"
                      value={selectedRefund.merchant?.name}
                    />
                  )}
                  <Field label="Gateway" value={selectedRefund.gateway?.name} />
                  <Field
                    label="Amount"
                    value={formatCurrency(Number(selectedRefund.amount))}
                  />
                </div>
              </div>

              {/* Timestamps — full width, same label/value styling as Fields */}
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-5 mb-2">
                Timestamps
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col py-2.5 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500">
                    Initiated At
                  </span>
                  <span className="text-sm font-medium text-slate-900 mt-0.5">
                    {formatDate(selectedRefund.initiatedAt)}
                  </span>
                </div>
                <div className="flex flex-col py-2.5 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500">
                    Updated At
                  </span>
                  <span className="text-sm font-medium text-slate-900 mt-0.5">
                    {formatDate(getLastUpdated(selectedRefund))}
                  </span>
                </div>
                <div className="flex flex-col py-2.5 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-500">
                    Completed At
                  </span>
                  <span className="text-sm font-medium text-slate-900 mt-0.5">
                    {selectedRefund.status === "COMPLETED" &&
                    selectedRefund.completedAt
                      ? formatDate(selectedRefund.completedAt)
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className={MODAL_FOOTER}>
              <button
                onClick={() => setSelectedRefund(null)}
                className="h-9 px-4 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
