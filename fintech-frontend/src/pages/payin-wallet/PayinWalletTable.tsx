import { useState } from "react";
import { Eye, ArrowUpRight, ArrowDownRight } from "lucide-react";
import PayinWalletSummary from "./PayinWalletSummary";
import { useCurrency } from "../../components/context/CurrencyContext";
import Pagination from "../../components/ui/Pagination";
import { TABLE_SHELL, TH, TD, TD_MONO } from "../../lib/styles";

interface Props {
  data: any[];
  loading: boolean;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  total: number;
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

/** Type cell: arrow indicator + plain-colored text */
const TypeCell = ({ type }: { type: string }) => {
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

export default function PayinWalletTable({
  data,
  loading,
  page,
  setPage,
  limit,
  setLimit,
  total,
}: Props) {
  const { formatCurrency } = useCurrency();
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const colCount = 12;

  const handleViewDetails = (item: any) => {
    setSelectedRecord(item);
    setIsSummaryOpen(true);
  };

  return (
    <>
      <div className={TABLE_SHELL}>
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] relative">
          <table className="w-full whitespace-nowrap [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap min-w-[1250px]">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={TH}>ID</th>
                <th className={TH}>Merchant ID</th>
                <th className={TH}>Type</th>
                <th className={TH}>Amount</th>
                <th className={TH}>Transaction ID</th>
                <th className={TH}>Reference ID</th>
                <th className={TH}>Transaction Date</th>
                <th className={TH}>Opening Balance</th>
                <th className={TH}>Closing Balance</th>
                <th className={TH}>Description</th>
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
                data.map((item, i) => (
                  <tr
                    key={item.id ?? i}
                    className="hover:bg-[#FFFDF7] border-t border-slate-100 transition-colors"
                  >
                    <td className={TD_MONO}>{item.id || "-"}</td>
                    <td className={`${TD_MONO} font-semibold text-slate-800`}>
                      {item.merchantId || "-"}
                    </td>
                    <td className={TD}>
                      <TypeCell type={item.type || "DEBIT"} />
                    </td>
                    <td className={`${TD} font-semibold text-slate-900`}>
                      {formatCurrency(Math.abs(Number(item.amount || 0)))}
                    </td>
                    <td className={TD_MONO}>{item.transactionId || "-"}</td>
                    <td className={TD_MONO}>{item.referenceId || "-"}</td>
                    <td className={TD}>{formatDate(item.transactionDate)}</td>
                    <td className={TD}>
                      {formatCurrency(Number(item.openingBalance || 0))}
                    </td>
                    <td className={`${TD} font-semibold text-slate-900`}>
                      {formatCurrency(Number(item.closingBalance || 0))}
                    </td>
                    <td
                      className={`${TD} max-w-[200px] truncate`}
                      title={item.description || "-"}
                    >
                      {item.description || "-"}
                    </td>
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
                ))
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

      <PayinWalletSummary
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        data={selectedRecord}
      />
    </>
  );
}
