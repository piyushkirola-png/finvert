import { useState } from "react";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useUpdateChargebackStatus } from "../../api/mutations/chargebackMutations";
import { useCurrency } from "../../components/context/CurrencyContext";
import Pagination from "../../components/ui/Pagination";
import api from "../../lib/api-client";
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
  INPUT,
  LABEL,
  BTN_PRIMARY,
} from "../../lib/styles";

interface Props {
  data: any[];
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
  APPROVED: "green",
  REJECTED: "red",
  DISPUTED: "orange",
  REVERSED: "purple",
};

const formatDate = (dateStr?: string | null) => {
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
const CANCEL_BTN =
  "h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50";

const confirmMeta: Record<
  string,
  { title: string; icon: React.ReactNode; wrap: string }
> = {
  APPROVED: {
    title: "Approve Chargeback?",
    icon: <CheckCircle className="w-6 h-6 text-green-600" />,
    wrap: "bg-green-50",
  },
  REJECTED: {
    title: "Reject Chargeback?",
    icon: <XCircle className="w-6 h-6 text-red-600" />,
    wrap: "bg-red-50",
  },
  REVERSED: {
    title: "Reverse Chargeback?",
    icon: <RotateCcw className="w-6 h-6 text-purple-600" />,
    wrap: "bg-purple-50",
  },
};

export default function ChargebackTable({
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
  const [selected, setSelected] = useState<any>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    id: number | null;
    status: string | null;
  }>({ open: false, id: null, status: null });
  const [respondModal, setRespondModal] = useState<{
    open: boolean;
    id: number | null;
  }>({
    open: false,
    id: null,
  });
  const [respondText, setRespondText] = useState("");

  const { mutate: updateStatus, isPending: isUpdating } =
    useUpdateChargebackStatus();

  const colCount = isAdmin ? 9 : 7;

  const confirmAction = () => {
    const { id, status } = confirmState;
    if (id && status) {
      setActionLoading(id);
      updateStatus(
        { id, status },
        {
          onSuccess: () => {
            setActionLoading(null);
            onRefresh();
          },
          onError: () => setActionLoading(null),
        },
      );
    }
    setConfirmState({ open: false, id: null, status: null });
  };

  const ask = (id: number, status: string) =>
    setConfirmState({ open: true, id, status });

  const handleRespond = async () => {
    if (!respondModal.id) return;
    if (!respondText.trim()) {
      toast.error("Response is required");
      return;
    }
    setActionLoading(respondModal.id);
    try {
      await api.post(`/chargebacks/${respondModal.id}/respond`, {
        response: respondText,
      });
      toast.success("Response submitted successfully");
      setRespondModal({ open: false, id: null });
      setRespondText("");
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to submit response");
    } finally {
      setActionLoading(null);
    }
  };

  const meta = confirmState.status ? confirmMeta[confirmState.status] : null;

  return (
    <>
      <div className={TABLE_SHELL}>
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] relative">
          <table
            className={`w-full whitespace-nowrap [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap ${
              isAdmin ? "min-w-[1300px]" : "min-w-[900px]"
            }`}
          >
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={TH}>ID</th>
                {isAdmin && <th className={TH}>Merchant</th>}
                <th className={TH}>PayIn ID</th>
                {isAdmin && <th className={TH}>Gateway</th>}
                <th className={TH}>Amount</th>
                <th className={TH}>Reason</th>
                <th className={TH}>Status</th>
                <th className={TH}>Initiated At</th>
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
                    No chargebacks found
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const busy = actionLoading === item.id;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                    >
                      <td className={TD_MONO}>{item.id}</td>
                      {isAdmin && (
                        <td className={TD}>{item.merchant?.name || "-"}</td>
                      )}
                      <td className={TD_MONO}>{item.payInRequestId}</td>
                      {isAdmin && (
                        <td className={TD}>{item.gateway?.name || "-"}</td>
                      )}
                      <td className={`${TD} font-semibold text-slate-900`}>
                        {formatCurrency(Number(item.amount))}
                      </td>
                      <td
                        className={`${TD} max-w-[160px] truncate`}
                        title={item.reason || item.reasonDescription || "-"}
                      >
                        {item.reason || item.reasonDescription || "-"}
                      </td>
                      <td className={TD}>
                        <span
                          className={`${BADGE} ${BADGE_COLORS[statusColors[item.status] || "slate"]}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className={TD}>{formatDate(item.initiatedAt)}</td>
                      <td className={TD}>
                        <div className="flex items-center gap-1.5">
                          {isAdmin && item.status === "DISPUTED" && (
                            <>
                              <button
                                onClick={() => ask(item.id, "APPROVED")}
                                disabled={busy || isUpdating}
                                className={`${ACTION_BTN} text-green-700`}
                              >
                                {busy ? "..." : "Approve"}
                              </button>
                              <button
                                onClick={() => ask(item.id, "REJECTED")}
                                disabled={busy || isUpdating}
                                className={`${ACTION_BTN} text-red-600`}
                              >
                                {busy ? "..." : "Reject"}
                              </button>
                            </>
                          )}
                          {isAdmin &&
                            (item.status === "APPROVED" ||
                              item.status === "REJECTED") && (
                              <button
                                onClick={() => ask(item.id, "REVERSED")}
                                disabled={busy || isUpdating}
                                className={`${ACTION_BTN} text-purple-700`}
                              >
                                {busy ? "..." : "Reverse"}
                              </button>
                            )}
                          {!isAdmin && item.status === "DISPUTED" && (
                            <button
                              onClick={() => {
                                setRespondModal({ open: true, id: item.id });
                                setRespondText("");
                              }}
                              className={`${ACTION_BTN} text-orange-700`}
                            >
                              Respond
                            </button>
                          )}
                          <button
                            onClick={() => setSelected(item)}
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

      {/* Admin confirm modal */}
      {confirmState.open && meta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${MODAL_SHELL} max-w-sm`}>
            <div className={MODAL_BODY}>
              <div className="text-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${meta.wrap}`}
                >
                  {meta.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {meta.title}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Are you sure you want to{" "}
                  <span className="font-semibold text-slate-900">
                    {confirmState.status?.toLowerCase()}
                  </span>{" "}
                  this chargeback?
                </p>
              </div>
            </div>
            <div className={MODAL_FOOTER}>
              <button
                onClick={() =>
                  setConfirmState({ open: false, id: null, status: null })
                }
                className={CANCEL_BTN}
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={isUpdating}
                className="h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
              >
                {isUpdating ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User respond modal */}
      {respondModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${MODAL_SHELL} max-w-lg`}>
            <div className={MODAL_HEADER}>
              <h3 className="text-sm font-semibold text-slate-900">
                Respond to Dispute
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit your explanation for chargeback #{respondModal.id}
              </p>
            </div>
            <div className={MODAL_BODY}>
              <label className={LABEL}>
                Your Response <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Explain why this chargeback should be rejected..."
                value={respondText}
                onChange={(e) => setRespondText(e.target.value)}
                rows={5}
                maxLength={2000}
                className={`${INPUT} mt-1`}
                style={{
                  height: "auto",
                  minHeight: "110px",
                  paddingTop: "8px",
                  paddingBottom: "8px",
                }}
              />
              <p className="text-xs text-slate-500 mt-1">
                {respondText.length}/2000 characters
              </p>
            </div>
            <div className={MODAL_FOOTER}>
              <button
                onClick={() => setRespondModal({ open: false, id: null })}
                className={CANCEL_BTN}
              >
                Cancel
              </button>
              <button
                onClick={handleRespond}
                disabled={
                  actionLoading === respondModal.id || !respondText.trim()
                }
                className={`${BTN_PRIMARY} disabled:opacity-50`}
              >
                {actionLoading === respondModal.id
                  ? "Submitting..."
                  : "Submit Response"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className={`${MODAL_SHELL} max-w-4xl max-h-[85vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={MODAL_HEADER}>
              <h3 className="text-sm font-semibold text-slate-900">
                Chargeback Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                ID: {selected.id}
              </p>
            </div>

            <div className={MODAL_BODY}>
              <div className="grid grid-cols-2 gap-x-10">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-3 mb-1">
                    Chargeback Info
                  </p>
                  <Field label="Chargeback ID" value={selected.id} />
                  <Field
                    label="Status"
                    value={
                      <span
                        className={`${BADGE} ${BADGE_COLORS[statusColors[selected.status] || "slate"]}`}
                      >
                        {selected.status}
                      </span>
                    }
                  />
                  <Field label="Reason" value={selected.reason} />
                  <Field
                    label="Initiated At"
                    value={formatDate(selected.initiatedAt)}
                  />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-3 mb-1">
                    PayIn & Amount
                  </p>
                  <Field label="PayIn ID" value={selected.payInRequestId} />
                  {isAdmin && (
                    <Field label="Merchant" value={selected.merchant?.name} />
                  )}
                  {isAdmin && (
                    <Field label="Gateway" value={selected.gateway?.name} />
                  )}
                  <Field
                    label="Amount"
                    value={formatCurrency(Number(selected.amount))}
                  />
                </div>
              </div>

              {selected.reasonDescription && (
                <>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                    Description
                  </p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-md px-4 py-3 leading-relaxed border border-slate-100">
                    {selected.reasonDescription}
                  </p>
                </>
              )}
              {selected.notes && (
                <>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-md px-4 py-3 leading-relaxed border border-slate-100">
                    {selected.notes}
                  </p>
                </>
              )}
            </div>

            <div className={MODAL_FOOTER}>
              <button onClick={() => setSelected(null)} className={CANCEL_BTN}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
