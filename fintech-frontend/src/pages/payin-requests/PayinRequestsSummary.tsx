import { useCurrency } from "../../components/context/CurrencyContext";
import { usePayInRequestDetails } from "../../api/queries/usePayinRequests";
import { BADGE, BADGE_COLORS } from "../../lib/styles";

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
  FAILED: "red",
  DISPUTED: "orange",
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
  <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-xs font-medium text-slate-500 w-32 flex-shrink-0">
      {label}
    </span>
    <span
      className={`text-sm font-medium flex-1 ${mono ? "font-mono" : ""} ${valueClass || "text-slate-900"}`}
    >
      {value || "-"}
    </span>
  </div>
);

export default function PayinRequestsSummary({
  isOpen,
  onClose,
  data,
  isAdmin = true,
}: Props) {
  const { formatCurrency } = useCurrency();
  const { data: detailedData, isLoading: loadingDetails } =
    usePayInRequestDetails(isOpen && data?.id ? data.id : null);

  const requestData = detailedData || data;
  const userName =
    requestData?.user?.fullName ||
    requestData?.user?.name ||
    (requestData?.userId ? `User #${requestData.userId}` : "-");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              PayIn Request Details
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              ID: {requestData?.id || "-"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loadingDetails ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : requestData ? (
            <div className="grid grid-cols-2 gap-x-10">
              <div className="space-y-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-3 mb-1">
                  Transaction Info
                </p>
                <Field
                  label="Order ID"
                  value={
                    requestData.orderId ||
                    requestData.merchantReference ||
                    requestData.payInRequestId
                  }
                />
                <Field
                  label="UTR"
                  value={requestData.utr || requestData.metadata?.utr}
                />

                {isAdmin && (
                  <Field
                    label="Gateway"
                    value={requestData.gateway?.name || requestData.gatewayName}
                  />
                )}

                <Field label="Payment Mode" value={requestData.paymentMode} />
                <Field label="Currency" value={requestData.currency || "INR"} />

                {isAdmin && (
                  <>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-1">
                      Merchant Info
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
                  Customer Info
                </p>
                <Field label="Customer Name" value={requestData.customerName} />
                <Field
                  label="Customer Email"
                  value={requestData.customerEmail}
                />
                <Field
                  label="Customer Phone"
                  value={requestData.customerPhone}
                />
              </div>

              <div className="space-y-0">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-3 mb-1">
                  Financials
                </p>
                <Field
                  label="Requested"
                  value={formatCurrency(
                    Number(requestData.amountInINR || requestData.amount || 0),
                  )}
                />
                <Field
                  label="Final Amount"
                  value={formatCurrency(
                    Number(requestData.amountToCredit || 0),
                  )}
                  valueClass="text-green-600 font-semibold"
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
                      User Info
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
                  value={formatDate(requestData.requestedAt)}
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`${BADGE} ${BADGE_COLORS[statusMap[requestData.status] || "slate"]}`}
                      >
                        {requestData.status}
                      </span>
                      {(requestData.chargebackRaised ||
                        requestData.chargebackStatus === "RAISED") && (
                        <span className="text-xs text-orange-600 font-medium">
                          ⚡ Chargeback Raised
                        </span>
                      )}
                      {(requestData.chargebackRejected ||
                        requestData.chargebackStatus === "REJECTED") && (
                        <span className="text-xs text-purple-600 font-medium">
                          ✕ Chargeback Rejected
                        </span>
                      )}
                    </div>
                  }
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-sm text-slate-500">
              No data available
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
