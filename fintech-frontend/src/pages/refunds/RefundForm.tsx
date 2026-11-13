import { useState, useEffect } from "react";
import { CheckCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  usePayInRequest,
  useRefundsByPayInRequest,
} from "../../api/queries/useRefunds";
import { useCreateRefund } from "../../api/mutations/refundMutations";
import { useCurrency } from "../../components/context/CurrencyContext";
import {
  MODAL_SHELL,
  MODAL_HEADER,
  MODAL_BODY,
  MODAL_FOOTER,
  INPUT,
  LABEL,
  BTN_PRIMARY,
  BADGE,
  BADGE_COLORS,
} from "../../lib/styles";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Step1Data {
  payInRequestId: string;
  refundType: "FULL" | "PARTIAL";
}

interface RefundReviewData {
  payInRequestId: number;
  merchantName: string;
  merchantId: number;
  amount: number;
  remainingAmount?: number;
  currency: string;
  refundType: "FULL" | "PARTIAL";
  gatewayName?: string;
  payInStatus: string;
  merchantReference: string;
}

const CANCEL_BTN =
  "h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] transition disabled:opacity-50";

export default function CreateRefundModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const { formatCurrency, currency, rates = {}, getSymbol } = useCurrency();
  const [step, setStep] = useState<1 | 2>(1);

  const [step1Data, setStep1Data] = useState<Step1Data>({
    payInRequestId: "",
    refundType: "FULL",
  });

  const [reviewData, setReviewData] = useState<RefundReviewData | null>(null);
  const [editableReason, setEditableReason] = useState("");
  const [editableNotes, setEditableNotes] = useState("");
  const [editableAmount, setEditableAmount] = useState("");

  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdRefundId, setCreatedRefundId] = useState<number | null>(null);

  const payInId = parseInt(step1Data.payInRequestId) || 0;
  const { data: payInData, isLoading: isLoadingPayIn } =
    usePayInRequest(payInId);
  const { data: existingRefunds = [] } = useRefundsByPayInRequest(payInId);
  const { mutate: createRefund, isPending: isCreating } = useCreateRefund();

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setStep1Data({ payInRequestId: "", refundType: "FULL" });
      setReviewData(null);
      setEditableReason("");
      setEditableNotes("");
      setEditableAmount("");
      setError("");
      setShowSuccess(false);
      setCreatedRefundId(null);
      setFetching(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!fetching) return;

    if (!payInData) {
      if (!isLoadingPayIn) {
        toast.error("Pay-in request not found. Please check the ID.");
        setError("");
        setFetching(false);
      }
      return;
    }

    const payIn = payInData;
    let totalRefunded = 0;
    if (Array.isArray(existingRefunds)) {
      existingRefunds.forEach((ref: any) => {
        if (ref.status === "COMPLETED" || ref.status === "PENDING") {
          totalRefunded += Number(ref.amount);
        }
      });
    }
    const remainingAmount = Number(payIn.amount) - totalRefunded;

    if (payIn.status !== "COMPLETED") {
      toast.error(
        `Only completed pay-in requests can be refunded. Current status: ${payIn.status}`,
      );
      setError("");
      setFetching(false);
      return;
    }

    if (remainingAmount <= 0) {
      toast.error(
        `This pay-in request is already fully refunded. Total refunded: ${formatCurrency(totalRefunded)}`,
      );
      setError("");
      setFetching(false);
      return;
    }

    if (totalRefunded > 0) {
      toast.info(
        `Already refunded ${formatCurrency(totalRefunded)}. Remaining: ${formatCurrency(remainingAmount)}`,
      );
    }

    setReviewData({
      payInRequestId: payIn.id,
      merchantName:
        payIn.merchant?.name ||
        payIn.merchantName ||
        `Merchant ${payIn.merchantId}`,
      merchantId: payIn.merchantId,
      amount: parseFloat(payIn.amount),
      remainingAmount,
      currency: payIn.currency || "INR",
      refundType: step1Data.refundType,
      gatewayName: payIn.gateway?.name || payIn.gatewayName || "-",
      payInStatus: payIn.status,
      merchantReference: payIn.merchantReference || "-",
    });

    const maxRefundAmount =
      step1Data.refundType === "PARTIAL"
        ? Math.min(parseFloat(payIn.amount), remainingAmount)
        : parseFloat(payIn.amount);

    setEditableReason("Customer requested refund");
    setEditableNotes("");
    setEditableAmount(maxRefundAmount.toString());
    setStep(2);
    setFetching(false);
  }, [
    fetching,
    payInData,
    isLoadingPayIn,
    existingRefunds,
    step1Data.refundType,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFetchPayIn = () => {
    const idNum = parseInt(step1Data.payInRequestId);
    if (!step1Data.payInRequestId) {
      toast.error("Please enter PayIn Request ID");
      return;
    }
    if (isNaN(idNum) || idNum <= 0) {
      toast.error("Please enter a valid PayIn Request ID");
      setError("");
      return;
    }
    setError("");
    setFetching(true);
  };

  const handleSubmit = () => {
    if (!reviewData) return;

    if (!editableReason || editableReason.trim().length < 3) {
      toast.error("Please provide a reason for the refund (min 3 characters)");
      return;
    }

    let amountInINR = reviewData.amount;

    if (step1Data.refundType === "PARTIAL") {
      const userAmount = parseFloat(editableAmount);
      if (!userAmount || userAmount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }
      const rate = rates[currency] || 1;
      amountInINR = currency === "INR" ? userAmount : userAmount * rate;

      if (amountInINR > reviewData.amount) {
        toast.error(
          `Refund amount cannot exceed original amount (${formatCurrency(reviewData.amount)})`,
        );
        return;
      }
    }

    setError("");

    createRefund(
      {
        payInRequestId: reviewData.payInRequestId,
        amount:
          step1Data.refundType === "FULL" ? reviewData.amount : amountInINR,
        reason: editableReason,
        notes: editableNotes || undefined,
      },
      {
        onSuccess: (data) => {
          setCreatedRefundId(data.id);
          setShowSuccess(true);
          onSuccess();
        },
        onError: (err: any) => {
          toast.error(
            err.response?.data?.error ||
              err.response?.data?.message ||
              "Failed to create refund",
          );
          setError("");
        },
      },
    );
  };

  const handleBack = () => {
    setStep(1);
    setReviewData(null);
    setError("");
  };

  if (!isOpen) return null;

  /* ---------- SUCCESS ---------- */
  if (showSuccess) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className={`${MODAL_SHELL} max-w-md`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`${MODAL_BODY} text-center`}>
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={26} className="text-green-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Refund Initiated
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Refund has been created with status: PENDING
            </p>

            <div className="grid grid-cols-2 gap-3 text-left mt-4 p-3 bg-slate-50 rounded-md border border-slate-200 text-sm">
              <div>
                <p className="text-xs text-slate-500">Refund ID</p>
                <p className="font-semibold text-slate-900">
                  {createdRefundId}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p className="font-semibold text-yellow-600">PENDING</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Type</p>
                <p className="font-semibold text-slate-900">
                  {step1Data.refundType}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Original Amount</p>
                <p className="font-semibold text-slate-900">
                  {formatCurrency(reviewData?.amount || 0)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              The refund is pending. Admin must process it from the refunds
              table.
            </p>
          </div>
          <div className={MODAL_FOOTER}>
            <button onClick={onClose} className={BTN_PRIMARY}>
              OK, Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- FORM ---------- */
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={step === 1 ? onClose : undefined}
    >
      <div
        className={`${MODAL_SHELL} max-w-xl max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL_HEADER}>
          <h2 className="text-sm font-semibold text-slate-900">
            {step === 1 ? "Raise Refund" : "Review Refund"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {step === 1
              ? "Enter pay-in details to start refund"
              : "Review details before creating refund"}
          </p>
        </div>

        <div className={MODAL_BODY}>
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className={LABEL}>
                  PayIn Request ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Enter PayIn Request ID"
                  value={step1Data.payInRequestId}
                  onChange={(e) =>
                    setStep1Data({
                      ...step1Data,
                      payInRequestId: e.target.value,
                    })
                  }
                  className={`${INPUT} mt-1`}
                  disabled={fetching}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Only completed pay-in requests can be refunded
                </p>
              </div>

              <div>
                <label className={LABEL}>
                  Refund Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {(["FULL", "PARTIAL"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setStep1Data({ ...step1Data, refundType: t })
                      }
                      className={`h-10 rounded-md border text-sm font-medium transition ${
                        step1Data.refundType === t
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-[#f5efe0]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {step1Data.refundType === "FULL"
                    ? "Refund the entire amount"
                    : "Refund a custom amount (less than original)"}
                </p>
              </div>
            </div>
          )}

          {step === 2 && reviewData && (
            <>
              <div className="p-3 bg-slate-50 rounded-md border border-slate-200 mb-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Pay-In Details (Read Only)
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">PayIn ID</p>
                    <p className="font-semibold text-slate-900">
                      {reviewData.payInRequestId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Merchant</p>
                    <p className="font-semibold text-slate-900">
                      {reviewData.merchantName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Merchant Ref</p>
                    <p className="font-semibold text-slate-900 font-mono">
                      {reviewData.merchantReference}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Gateway</p>
                    <p className="font-semibold text-slate-900">
                      {reviewData.gatewayName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Original Amount</p>
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(reviewData.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Refund Type</p>
                    <span
                      className={`${BADGE} ${
                        BADGE_COLORS[
                          reviewData.refundType === "FULL" ? "purple" : "blue"
                        ]
                      }`}
                    >
                      {reviewData.refundType}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {step1Data.refundType === "PARTIAL" && (
                  <div>
                    <label className={LABEL}>
                      Refund Amount ({currency}){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        {getSymbol(currency)}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editableAmount}
                        onChange={(e) => setEditableAmount(e.target.value)}
                        className={`${INPUT} !pl-8`}
                        placeholder={`Enter amount in ${currency}`}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Max: {formatCurrency(reviewData.amount)}
                    </p>
                  </div>
                )}

                <div>
                  <label className={LABEL}>
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Why is this refund being initiated?"
                    value={editableReason}
                    onChange={(e) => setEditableReason(e.target.value)}
                    className={`${INPUT} mt-1`}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Required: at least 3 characters
                  </p>
                </div>

                <div>
                  <label className={LABEL}>Internal Notes</label>
                  <textarea
                    placeholder="Any internal notes for this refund..."
                    value={editableNotes}
                    onChange={(e) => setEditableNotes(e.target.value)}
                    rows={2}
                    maxLength={1000}
                    className={`${INPUT} mt-1`}
                    style={{
                      height: "auto",
                      minHeight: "60px",
                      paddingTop: "8px",
                      paddingBottom: "8px",
                    }}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {editableNotes.length}/1000 characters
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {step === 1 && (
          <div className={MODAL_FOOTER}>
            <button onClick={onClose} className={CANCEL_BTN}>
              Cancel
            </button>
            <button
              onClick={handleFetchPayIn}
              disabled={fetching || !step1Data.payInRequestId}
              className={`${BTN_PRIMARY} disabled:opacity-50`}
            >
              {fetching ? (
                "Fetching..."
              ) : (
                <>
                  Next <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        )}

        {step === 2 && reviewData && (
          <div className={`${MODAL_FOOTER} !justify-between`}>
            <button onClick={handleBack} className={CANCEL_BTN}>
              Back
            </button>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className={CANCEL_BTN}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isCreating}
                className={`${BTN_PRIMARY} disabled:opacity-50`}
              >
                {isCreating ? "Processing..." : "Process Refund"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
