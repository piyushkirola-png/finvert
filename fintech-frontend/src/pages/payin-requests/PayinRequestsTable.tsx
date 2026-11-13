import { useState, useRef } from "react";
import { Eye, Zap } from "lucide-react";
import { createPortal } from "react-dom";
import PayinRequestsSummary from "./PayinRequestsSummary";
import { useCurrency } from "../../components/context/CurrencyContext";
import Pagination from "../../components/ui/Pagination";
import {
  TABLE_SHELL,
  TH,
  TD,
  TD_MONO,
  BADGE,
  BADGE_COLORS,
} from "../../lib/styles";

interface Props {
  data: any[];
  loading: boolean;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  total: number;
  isAdmin?: boolean;
}

const statusColors: Record<string, keyof typeof BADGE_COLORS> = {
  COMPLETED: "green",
  PENDING: "yellow",
  FAILED: "red",
  DISPUTED: "orange",
  CHARGEBACK: "orange",
};

const paymentModeColors: Record<string, keyof typeof BADGE_COLORS> = {
  UPI: "red",
  UPI_QR: "red",
  UPI_INTENT: "red",
  CARD: "purple",
};

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

const getDisplayStatus = (item: any) => {
  if (item.chargebackStatus === "REJECTED" || item.chargebackRejected)
    return "DISPUTED";
  if (item.chargebackStatus === "RAISED" || item.chargebackRaised)
    return "CHARGEBACK";
  return item.status;
};

const getUTR = (request: any) => {
  if (request.utr && request.utr !== "-") return request.utr;
  if (request.metadata?.utr) return request.metadata.utr;
  if (request.metadata?.responseLog?.data?.payment?.utr)
    return request.metadata.responseLog.data.payment.utr;
  return "-";
};

const getUserId = (request: any) =>
  request.userId || request.createdBy || request.user?.id || "-";

export default function PayinRequestsTable({
  data,
  loading,
  page,
  setPage,
  limit,
  setLimit,
  total,
  isAdmin = true,
}: Props) {
  const { formatCurrency } = useCurrency();
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [tooltipCoords, setTooltipCoords] = useState<{
    x: number;
    y: number;
    placement: "top" | "bottom";
  } | null>(null);
  const rowRefs = useRef<{ [key: number]: HTMLTableRowElement | null }>({});

  const colCount = isAdmin ? 14 : 10;

  const handleViewDetails = (item: any) => {
    setSelectedRecord(item);
    setIsSummaryOpen(true);
  };

  const handleIconMouseEnter = (index: number, e: React.MouseEvent) => {
    const iconRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const spaceBelow = window.innerHeight - iconRect.bottom;
    const placement = spaceBelow >= 160 ? "bottom" : "top";
    setTooltipCoords({
      x: iconRect.left + iconRect.width / 2,
      y: placement === "bottom" ? iconRect.bottom + 8 : iconRect.top - 8,
      placement,
    });
    setHoveredRow(index);
  };

  const handleIconMouseLeave = () => {
    setHoveredRow(null);
    setTooltipCoords(null);
  };

  return (
    <>
      <div className={TABLE_SHELL}>
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] relative">
          <table
            className={`w-full whitespace-nowrap [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap ${
              isAdmin ? "min-w-[1550px]" : "min-w-[700px]"
            }`}
          >
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={TH}>ID</th>
                {isAdmin && <th className={TH}>User ID</th>}
                <th className={`${TH} min-w-[140px]`}>Merchant Reference</th>
                {isAdmin && <th className={TH}>Gateway</th>}
                <th className={TH}>Requested</th>
                <th className={TH}>Final</th>
                <th className={TH}>Fees</th>
                {isAdmin && <th className={TH}>Fee Type</th>}
                <th className={TH}>Mode</th>
                {isAdmin && <th className={TH}>UTR</th>}
                <th className={TH}>Status</th>
                <th className={TH}>Requested At</th>
                <th className={TH}>Updated At</th>
                <th className={TH}>Action</th>
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
                    No transactions found
                  </td>
                </tr>
              ) : (
                data.map((item, i) => {
                  const displayStatus = getDisplayStatus(item);
                  const feeTotal =
                    Number(item.feeAmount || 0) + Number(item.taxAmount || 0);
                  return (
                    <tr
                      key={item.id ?? i}
                      ref={(el) => {
                        rowRefs.current[i] = el;
                      }}
                      className="hover:bg-slate-50 border-t border-slate-100 transition-colors relative"
                    >
                      <td className={TD_MONO}>{item.id || "-"}</td>

                      {isAdmin && (
                        <td
                          className={`${TD_MONO} font-semibold text-slate-800`}
                        >
                          {getUserId(item)}
                        </td>
                      )}

                      <td className={`${TD_MONO} min-w-[140px]`}>
                        {item.orderId || item.merchantReference || "-"}
                      </td>

                      {isAdmin && (
                        <td className={TD}>
                          {item.gateway?.name || item.gatewayName || "-"}
                        </td>
                      )}

                      <td className={`${TD} font-semibold text-slate-900`}>
                        {formatCurrency(
                          Number(
                            item.amountInINR ||
                              item.requestedAmount ||
                              item.amount ||
                              0,
                          ),
                        )}
                      </td>
                      <td className={`${TD} font-semibold !text-green-600`}>
                        {formatCurrency(
                          Number(
                            item.amountToCredit ||
                              item.finalAmount ||
                              item.amount ||
                              0,
                          ),
                        )}
                      </td>

                      <td className={`${TD} font-semibold`}>
                        <div className="flex items-center gap-1">
                          <span>{formatCurrency(feeTotal)}</span>
                          <div
                            className="relative inline-flex"
                            onMouseEnter={(e) => handleIconMouseEnter(i, e)}
                            onMouseLeave={handleIconMouseLeave}
                          >
                            <svg
                              className="w-3 h-3 text-slate-400 cursor-help hover:text-slate-600 transition-colors"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {hoveredRow === i &&
                              tooltipCoords &&
                              createPortal(
                                <div
                                  className="fixed w-60 rounded-md shadow-md z-[9999] text-[11px] bg-[#FFFCF5] border border-[#F0E8D2] text-slate-800"
                                  style={{
                                    left: tooltipCoords.x,
                                    top: tooltipCoords.y,
                                    transform: `translate(-50%, ${tooltipCoords.placement === "bottom" ? "0" : "-100%"})`,
                                    minWidth: "220px",
                                    pointerEvents: "none",
                                  }}
                                >
                                  <div className="px-3 py-2 border-b border-[#F0E8D2] font-semibold text-slate-900 text-xs">
                                    Merchant Fee Breakdown
                                  </div>
                                  <div className="px-3 py-2 space-y-1.5">
                                    <div className="flex justify-between gap-6">
                                      <span className="text-slate-500">
                                        Base
                                      </span>
                                      <span className="font-medium">
                                        {formatCurrency(
                                          Number(item.amount || 0),
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-6">
                                      <span className="text-slate-500">
                                        Fee Type
                                      </span>
                                      <span className="font-medium">
                                        {item.feeType || "PERCENTAGE"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-6">
                                      <span className="text-slate-500">
                                        Fee
                                      </span>
                                      <span className="font-medium">
                                        {formatCurrency(
                                          Number(item.feeAmount || 0),
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-6">
                                      <span className="text-slate-500">
                                        GST ({Number(item.taxRate || 0)}%)
                                      </span>
                                      <span className="font-medium">
                                        {formatCurrency(
                                          Number(item.taxAmount || 0),
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-6 border-t border-[#F0E8D2] pt-1.5">
                                      <span className="font-semibold">
                                        Total
                                      </span>
                                      <span className="font-semibold">
                                        {formatCurrency(feeTotal)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-6">
                                      <span className="font-semibold text-green-700">
                                        Final
                                      </span>
                                      <span className="font-semibold text-green-700">
                                        {formatCurrency(
                                          Number(
                                            item.amountToCredit ||
                                              item.finalAmount ||
                                              0,
                                          ),
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>,
                                document.body,
                              )}
                          </div>
                        </div>
                      </td>

                      {isAdmin && (
                        <td className={TD}>
                          <span
                            className={`${BADGE} ${item.feeType === "FIXED" ? BADGE_COLORS.blue : BADGE_COLORS.purple}`}
                          >
                            {item.feeType || "PERCENTAGE"}
                          </span>
                        </td>
                      )}

                      <td className={TD}>
                        <span
                          className={`${BADGE} ${BADGE_COLORS[paymentModeColors[item.paymentMode?.toUpperCase()] || "slate"]}`}
                        >
                          {item.paymentMode || "-"}
                        </span>
                      </td>

                      {isAdmin && (
                        <td
                          className={`${TD_MONO} max-w-[100px] truncate`}
                          title={getUTR(item)}
                        >
                          {getUTR(item)}
                        </td>
                      )}

                      <td className={TD}>
                        <div className="flex items-center gap-1">
                          <span
                            className={`${BADGE} ${BADGE_COLORS[statusColors[displayStatus] || "slate"]}`}
                          >
                            {displayStatus}
                          </span>
                          {(item.chargebackRaised ||
                            item.chargebackStatus === "RAISED") && (
                            <Zap
                              size={12}
                              className="text-orange-600"
                              aria-label="Chargeback raised"
                            />
                          )}
                        </div>
                      </td>

                      <td className={TD}>{formatDate(item.requestedAt)}</td>
                      <td className={TD}>{formatDate(item.updatedAt)}</td>
                      <td className={TD}>
                        <button
                          onClick={() => handleViewDetails(item)}
                          className="p-1.5 rounded-md hover:bg-slate-100 transition text-slate-600"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
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

      <PayinRequestsSummary
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        data={selectedRecord}
        isAdmin={isAdmin}
      />
    </>
  );
}
