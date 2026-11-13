import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useCurrency } from "../../components/context/CurrencyContext";
import { usePayoutWalletTransactionDetails } from "../../api/queries/usePayoutWallet";
import {
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
} from "../../lib/styles";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const TypeIndicator = ({ type }: { type: string }) => {
  const isCredit = type === "CREDIT";
  return (
    <div className="flex items-center gap-1.5">
      {isCredit ? (
        <ArrowUpRight size={14} className="text-green-600" strokeWidth={2.5} />
      ) : (
        <ArrowDownRight size={14} className="text-red-600" strokeWidth={2.5} />
      )}
      <span className="text-sm text-slate-900 font-medium">
        {type || "DEBIT"}
      </span>
    </div>
  );
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
      className={`text-sm font-medium flex-1 ${mono ? "font-mono" : ""} ${
        valueClass || "text-slate-900"
      }`}
    >
      {value || "-"}
    </span>
  </div>
);

export default function PayoutWalletSummary({ isOpen, onClose, data }: Props) {
  const { formatCurrency } = useCurrency();
  const { data: detailedData, isLoading: loadingDetails } =
    usePayoutWalletTransactionDetails(isOpen && data?.id ? data.id : null);

  const transactionData = detailedData || data;
  const userName =
    transactionData?.user?.fullName ||
    transactionData?.user?.name ||
    (transactionData?.userId ? `User #${transactionData.userId}` : "-");

  if (!isOpen) return null;

  const type = transactionData?.type || "DEBIT";
  const isCredit = type === "CREDIT";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`${MODAL_SHELL} max-w-4xl max-h-[85vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL_HEADER}>
          <h3 className="text-sm font-semibold text-slate-900">
            Payout Wallet Transaction Details
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            ID: {transactionData?.id || "-"}
          </p>
        </div>

        <div className={MODAL_BODY}>
          {loadingDetails ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : transactionData ? (
            <div className="grid grid-cols-2 gap-x-10">
              {/* LEFT COLUMN */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-3 mb-1">
                  Transaction Info
                </p>
                <Field label="ID" value={transactionData.id} />
                <Field
                  label="Transaction ID"
                  value={transactionData.transactionId}
                />
                <Field
                  label="Reference ID"
                  value={transactionData.referenceId}
                />
                <Field
                  label="Transaction Type"
                  value={<TypeIndicator type={type} />}
                />

                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                  Merchant Info
                </p>
                <Field label="Merchant ID" value={transactionData.merchantId} />
                <Field
                  label="Merchant Name"
                  value={
                    transactionData.merchant?.name ||
                    transactionData.merchantName
                  }
                />

                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                  User Info
                </p>
                <Field label="User ID" value={transactionData.userId} />
                <Field label="User Name" value={userName} />
              </div>

              {/* RIGHT COLUMN */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-3 mb-1">
                  Financials
                </p>
                <Field
                  label="Amount"
                  value={`${isCredit ? "+" : "-"} ${formatCurrency(
                    Math.abs(Number(transactionData.amount || 0)),
                  )}`}
                  valueClass={
                    isCredit
                      ? "text-green-600 font-semibold"
                      : "text-red-600 font-semibold"
                  }
                />
                <Field
                  label="Opening Balance"
                  value={formatCurrency(
                    Number(transactionData.openingBalance || 0),
                  )}
                />
                <Field
                  label="Closing Balance"
                  value={formatCurrency(
                    Number(transactionData.closingBalance || 0),
                  )}
                />

                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                  Timestamps
                </p>
                <Field
                  label="Transaction Date"
                  value={formatDate(transactionData.transactionDate)}
                />
                <Field
                  label="Updated At"
                  value={formatDate(transactionData.updatedAt)}
                />
              </div>

              {transactionData.description && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                    Description
                  </p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-md px-4 py-3 leading-relaxed border border-slate-100">
                    {transactionData.description}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-sm text-slate-500">
              No data available
            </div>
          )}
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
