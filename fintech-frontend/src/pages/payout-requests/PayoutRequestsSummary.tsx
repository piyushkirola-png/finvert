import { useCurrency } from "../../components/context/CurrencyContext";
import { usePayoutRequestDetails } from "../../api/queries/usePayoutRequests";
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
  data: any;
  isAdmin?: boolean;
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

const statusMap: Record<string, keyof typeof BADGE_COLORS> = {
  COMPLETED: "green",
  PENDING: "yellow",
  PROCESSING: "blue",
  FAILED: "red",
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

export default function PayoutRequestsSummary({
  isOpen,
  onClose,
  data,
  isAdmin = true,
}: Props) {
  const { formatCurrency } = useCurrency();
  const { data: detailedData, isLoading: loadingDetails } =
    usePayoutRequestDetails(isOpen && data?.id ? data.id : null);

  const requestData = detailedData || data;
  const userName =
    requestData?.user?.fullName ||
    requestData?.user?.name ||
    (requestData?.userId ? `User #${requestData.userId}` : "-");

  if (!isOpen || !requestData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`${MODAL_SHELL} max-w-4xl max-h-[85vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL_HEADER}>
          <h3 className="text-sm font-semibold text-slate-900">
            Payout Request Details
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            ID: {requestData.id || "-"}
          </p>
        </div>

        <div className={MODAL_BODY}>
          {loadingDetails ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-10">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-3 mb-1">
                  Transaction
                </p>
                <Field
                  label="Merchant Reference"
                  value={requestData.merchantReference || requestData.orderId}
                />
                <Field
                  label="UTR"
                  value={requestData.utr || requestData.metadata?.utr}
                />
                <Field
                  label="Gateway"
                  value={
                    requestData.vendor?.name ||
                    requestData.gateway?.name ||
                    requestData.vendorName
                  }
                />
                <Field label="Payment Mode" value={requestData.paymentMode} />
                <Field label="Currency" value={requestData.currency || "INR"} />

                {isAdmin && (
                  <>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                      Merchant
                    </p>
                    <Field label="Merchant ID" value={requestData.merchantId} />
                    <Field
                      label="Merchant Name"
                      value={
                        requestData.merchant?.name || requestData.merchantName
                      }
                    />
                  </>
                )}

                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                  Beneficiary
                </p>
                <Field label="Name" value={requestData.beneficiaryName} />
                <Field label="Account" value={requestData.beneficiaryAccount} />
                <Field label="IFSC" value={requestData.beneficiaryIfsc} />
                <Field label="Bank" value={requestData.beneficiaryBank} />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-3 mb-1">
                  Financials
                </p>
                <Field
                  label="Requested"
                  value={formatCurrency(Number(requestData.amount || 0))}
                />
                <Field
                  label="Final (Debited)"
                  value={formatCurrency(Number(requestData.amountToDebit || 0))}
                  valueClass="text-red-600 font-semibold"
                />
                <Field
                  label="Fee"
                  value={
                    <>
                      {formatCurrency(Number(requestData.feeAmount || 0))}
                      <span className="text-xs text-slate-500 ml-1.5">
                        ({requestData.feeType || "PERCENTAGE"})
                      </span>
                    </>
                  }
                />
                <Field
                  label="Tax (GST)"
                  value={
                    <>
                      {formatCurrency(Number(requestData.taxAmount || 0))}
                      <span className="text-xs text-slate-500 ml-1.5">
                        @{requestData.taxRate || 0}%
                      </span>
                    </>
                  }
                />

                {isAdmin && (
                  <>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                      User
                    </p>
                    <Field label="User ID" value={requestData.userId} />
                    <Field label="User Name" value={userName} />
                  </>
                )}

                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                  Timestamps
                </p>
                <Field
                  label="Requested At"
                  value={formatDate(
                    requestData.requestedAt || requestData.createdAt,
                  )}
                />
                <Field
                  label="Updated At"
                  value={formatDate(requestData.updatedAt)}
                />

                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                  Status
                </p>
                <Field
                  label="Status"
                  value={
                    <span
                      className={`${BADGE} ${BADGE_COLORS[statusMap[requestData.status] || "slate"]}`}
                    >
                      {requestData.status}
                    </span>
                  }
                />
              </div>
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
