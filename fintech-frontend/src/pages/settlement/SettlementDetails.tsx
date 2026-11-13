import { useCurrency } from "../../components/context/CurrencyContext";
import type { Settlement } from "../../types/settlement";
import {
  BADGE,
  BADGE_COLORS,
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
} from "../../lib/styles";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settlement: Settlement | null;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const statusColors: Record<string, keyof typeof BADGE_COLORS> = {
  COMPLETED: "green",
  PENDING: "yellow",
  FAILED: "red",
};

const approvalColors: Record<string, keyof typeof BADGE_COLORS> = {
  APPROVED: "green",
  PENDING: "yellow",
  REJECTED: "red",
};

const getMethodFromNotes = (notes?: string): string => {
  if (notes?.includes("CREDIT_PAYOUT")) return "Credit Payout";
  if (notes?.includes("DEBIT_PAYIN")) return "Debit PayIn";
  return "Wallet Settlement";
};

const Field = ({
  label,
  value,
  mono = false,
  valueClass = "",
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  valueClass?: string;
}) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-xs font-medium text-slate-500 w-32 flex-shrink-0 pt-0.5">
      {label}
    </span>
    <span
      className={`text-sm font-medium flex-1 ${mono ? "font-mono" : ""} ${valueClass || "text-slate-900"}`}
    >
      {value || "-"}
    </span>
  </div>
);

export default function SettlementDetails({
  isOpen,
  onClose,
  settlement,
}: Props) {
  const { formatCurrency } = useCurrency();
  if (!isOpen || !settlement) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`${MODAL_SHELL} max-w-4xl max-h-[85vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL_HEADER}>
          <h3 className="text-sm font-semibold text-slate-900">
            Settlement Details
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            ID: {settlement.id}
          </p>
        </div>

        <div className={MODAL_BODY}>
          <div className="grid grid-cols-2 gap-x-10">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-3 mb-1">
                Settlement Info
              </p>
              <Field label="ID" value={settlement.id} mono />
              <Field label="Merchant ID" value={settlement.merchantId} mono />
              <Field
                label="Method"
                value={getMethodFromNotes(settlement.notes)}
              />

              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                Status
              </p>
              <Field
                label="Status"
                value={
                  <span
                    className={`${BADGE} ${BADGE_COLORS[statusColors[settlement.status?.toUpperCase()] || "slate"]}`}
                  >
                    {settlement.status || "PENDING"}
                  </span>
                }
              />
              {settlement.approvalStatus && (
                <Field
                  label="Approval"
                  value={
                    <span
                      className={`${BADGE} ${BADGE_COLORS[approvalColors[settlement.approvalStatus?.toUpperCase()] || "slate"]}`}
                    >
                      {settlement.approvalStatus}
                    </span>
                  }
                />
              )}

              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                Merchant
              </p>
              <Field
                label="Name"
                value={
                  settlement.merchant?.name ||
                  `Merchant ${settlement.merchantId}`
                }
              />
              <Field label="Email" value={settlement.merchant?.email} />
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-3 mb-1">
                Financials
              </p>
              <Field
                label="Amount"
                value={formatCurrency(Number(settlement.amount))}
                valueClass="text-green-600 font-semibold"
              />

              {(settlement.sourceWalletBalanceBefore !== undefined ||
                settlement.destinationWalletBalanceBefore !== undefined) && (
                <>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                    Balance Changes
                  </p>
                  {settlement.sourceWalletBalanceBefore !== undefined && (
                    <Field
                      label="Source Wallet"
                      value={
                        <>
                          {formatCurrency(settlement.sourceWalletBalanceBefore)}
                          <span className="text-slate-400 mx-2">→</span>
                          {formatCurrency(
                            settlement.sourceWalletBalanceAfter || 0,
                          )}
                        </>
                      }
                      mono
                    />
                  )}
                  {settlement.destinationWalletBalanceBefore !== undefined && (
                    <Field
                      label="Dest. Wallet"
                      value={
                        <>
                          {formatCurrency(
                            settlement.destinationWalletBalanceBefore,
                          )}
                          <span className="text-slate-400 mx-2">→</span>
                          {formatCurrency(
                            settlement.destinationWalletBalanceAfter || 0,
                          )}
                        </>
                      }
                      mono
                    />
                  )}
                </>
              )}

              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                Timestamps
              </p>
              <Field
                label="Requested At"
                value={formatDate(
                  settlement.requestedAt || settlement.createdAt,
                )}
              />
              <Field
                label="Completed At"
                value={
                  settlement.completedAt
                    ? formatDate(settlement.completedAt)
                    : "-"
                }
              />

              {settlement.notes && (
                <>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-md px-4 py-3 leading-relaxed border border-slate-100">
                    {settlement.notes}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className={MODAL_FOOTER}>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
