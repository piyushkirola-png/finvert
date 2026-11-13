import { useState } from "react";
import { ChevronDown, Clock, Search } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "../../components/context/CurrencyContext";
import type { Transaction } from "../../types/dashboard";
import { formatISTDate, formatISTDateTime } from "../../utils/dateFormatter";
import {
  TABLE_SHELL,
  TH,
  TD,
  FILTER_PANEL,
  BADGE,
  BADGE_COLORS,
} from "../../lib/styles";

interface RecentTransactionsProps {
  transactions: Transaction[];
  loading: boolean;
}

const typeOptions = [
  { value: "all", label: "All Transactions" },
  { value: "PAYIN", label: "PayIn" },
  { value: "PAYOUT", label: "Payout" },
  { value: "REFUND", label: "Refund" },
  { value: "CHARGEBACK", label: "Chargeback" },
];

const statusColors: Record<string, keyof typeof BADGE_COLORS> = {
  COMPLETED: "green",
  APPROVED: "green",
  FAILED: "red",
  REJECTED: "red",
  PENDING: "yellow",
  PROCESSING: "blue",
  DISPUTED: "orange",
  REVERSED: "orange",
  CANCELLED: "slate",
  EXPIRED: "slate",
};

const typeColorMap: Record<string, keyof typeof BADGE_COLORS> = {
  PAYIN: "blue",
  PAYOUT: "purple",
  REFUND: "orange",
  CHARGEBACK: "red",
};

export default function RecentTransactions({
  transactions = [],
  loading,
}: RecentTransactionsProps) {
  const { formatCurrency } = useCurrency();
  const [filterType, setFilterType] = useState<string>("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getFilterLabel = () => {
    const option = typeOptions.find((t) => t.value === filterType);
    return option?.label || "All Transactions";
  };

  const filteredTransactions = (transactions || [])
    .filter((tx) => filterType === "all" || tx.type === filterType)
    .slice(0, 10);

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return formatISTDate(date);
  };

  const handleFilterSelect = (value: string) => {
    setFilterType(value);
    setIsDropdownOpen(false);
    toast.success("Filter applied");
  };

  return (
    <div className={TABLE_SHELL}>
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-slate-500" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Recent Transactions
            </h3>
            <p className="text-xs text-slate-500">Latest 10 transactions</p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
          >
            {getFilterLabel()}
            <ChevronDown
              size={13}
              className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className={`${FILTER_PANEL} min-w-[180px]`}>
                <div className="py-1">
                  {typeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterSelect(option.value)}
                      className={`w-full px-4 py-2 text-sm text-left hover:bg-slate-50 transition ${
                        filterType === option.value
                          ? "text-slate-900 font-medium bg-slate-100"
                          : "text-slate-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-900 border-t-transparent"></div>
            <p className="mt-2 text-xs text-slate-500">
              Loading transactions...
            </p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-700">No transactions found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try changing the filter
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className={TH}>Transaction ID</th>
                <th className={TH}>Type</th>
                <th className={TH}>Merchant</th>
                <th className={TH}>Gateway</th>
                <th className={TH}>Amount</th>
                <th className={TH}>Status</th>
                <th className={TH}>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx, index) => (
                <tr
                  key={tx.id || index}
                  className="border-t border-slate-100 hover:bg-slate-50 transition"
                >
                  <td className={`${TD} font-mono text-xs`}>
                    {tx.transactionId || tx.id?.slice(0, 8) || "N/A"}
                  </td>
                  <td className={TD}>
                    <span
                      className={`${BADGE} ${BADGE_COLORS[typeColorMap[tx.type] || "slate"]}`}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className={`${TD} font-medium`}>
                    {tx.merchantName || "N/A"}
                  </td>
                  <td className={TD}>{tx.gatewayName || "N/A"}</td>
                  <td className={`${TD} font-semibold text-slate-900`}>
                    {formatCurrency(tx.amount || 0)}
                  </td>
                  <td className={TD}>
                    <span
                      className={`${BADGE} ${BADGE_COLORS[statusColors[tx.status] || "slate"]}`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td
                    className={`${TD} text-xs text-slate-500 whitespace-nowrap`}
                    title={formatISTDateTime(tx.createdAt)}
                  >
                    {formatTime(tx.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
        <span className="text-xs text-slate-500">
          Showing {filteredTransactions.length} of {(transactions || []).length}{" "}
          transactions
        </span>
      </div>
    </div>
  );
}
