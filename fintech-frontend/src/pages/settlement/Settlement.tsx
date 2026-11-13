import { useState, useEffect } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import SettlementDetails from "./SettlementDetails";
import SettlementForm from "./SettlementForm";
import SettlementFilters, {
  type SettlementFiltersState,
} from "./SettlementFilters";
import { useCurrency } from "../../components/context/CurrencyContext";
import { useAuth } from "../../components/context/AuthContext";
import {
  useSettlements,
  useSettlement,
} from "../../api/queries/useSettlements";
import { useExportSettlements } from "../../api/mutations/settlementMutations";
import type { Settlement } from "../../types/settlement";
import Pagination from "../../components/ui/Pagination";
import {
  PAGE_HEADER,
  TABLE_SHELL,
  TH,
  TD,
  TD_MONO,
  BADGE,
  BADGE_COLORS,
  BTN_EXPORT,
  BTN_REFRESH,
  BTN_PRIMARY,
} from "../../lib/styles";

const STATUS_MAP: Record<string, keyof typeof BADGE_COLORS> = {
  COMPLETED: "green",
  PENDING: "yellow",
  PROCESSING: "blue",
  FAILED: "red",
  CANCELED: "gray",
};

const getMethodFromNotes = (notes?: string): string => {
  if (notes?.includes("CREDIT_PAYOUT")) return "Credit Payout";
  if (notes?.includes("DEBIT_PAYIN")) return "Debit PayIn";
  return "Wallet Settlement";
};

export default function Settlement() {
  const { formatCurrency } = useCurrency();
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";

  const [selectedSettlement, setSelectedSettlement] =
    useState<Settlement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const [filters, setFilters] = useState<SettlementFiltersState>({
    status: "All",
    merchantId: "",
    amountMin: "",
    amountMax: "",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  const {
    data,
    refetch,
    isLoading: loading,
  } = useSettlements({
    page: pagination.page,
    limit: pagination.limit,
    status: filters.status !== "All" ? filters.status.toUpperCase() : undefined,
  });

  const { data: settlementDetails } = useSettlement(
    selectedSettlement?.id || 0,
  );
  const { mutate: exportSettlements, isPending: isExporting } =
    useExportSettlements();

  const handleRefresh = () => {
    refetch();
    toast.success("Refreshed");
  };

  const handleExport = () => exportSettlements();

  const settlements = data?.data || [];

  useEffect(() => {
    if (data?.pagination) {
      setPagination((prev) => ({ ...prev, total: data.pagination.total || 0 }));
    }
  }, [data?.pagination]);

  useEffect(() => {
    refetch();
  }, [pagination.page, filters.status]);

  const handleViewClick = (s: Settlement) => {
    setSelectedSettlement(s);
    setIsModalOpen(true);
  };

  const filteredData = settlements.filter((item) => {
    const matchStatus =
      filters.status === "All" ||
      item.status?.toUpperCase() === filters.status.toUpperCase();
    const matchMerchant =
      !filters.merchantId || String(item.merchantId) === filters.merchantId;
    const amt = Number(item.amount);
    const matchMin = !filters.amountMin || amt >= Number(filters.amountMin);
    const matchMax = !filters.amountMax || amt <= Number(filters.amountMax);
    return matchStatus && matchMerchant && matchMin && matchMax;
  });

  const applyFilters = (f: SettlementFiltersState) => {
    setFilters(f);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ status: "All", merchantId: "", amountMin: "", amountMax: "" });
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const activeCount = [
    filters.status !== "All",
    !!filters.merchantId,
    !!filters.amountMin,
    !!filters.amountMax,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {isAdmin ? "Settlement" : "Settlement History"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? "Manage merchant settlements"
              : "Track all your settlement requests and history"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SettlementFilters
            filters={filters}
            onApply={applyFilters}
            onClear={clearFilters}
          />

          <button
            onClick={handleExport}
            disabled={isExporting}
            className={BTN_EXPORT}
          >
            <Download size={16} /> {isExporting ? "Exporting..." : "Export"}
          </button>

          <button onClick={handleRefresh} className={BTN_REFRESH}>
            <RefreshCw size={16} /> Refresh
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsPopupOpen(true)}
              className={BTN_PRIMARY}
            >
              Initiate Settlement
            </button>
          )}
        </div>
      </div>

      {activeCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">Active:</span>
          {filters.status !== "All" && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs border border-slate-200">
              Status: {filters.status}
              <button
                onClick={() => applyFilters({ ...filters, status: "All" })}
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.merchantId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs border border-slate-200">
              Merchant: {filters.merchantId}
              <button
                onClick={() => applyFilters({ ...filters, merchantId: "" })}
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.amountMin && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs border border-slate-200">
              Min: {filters.amountMin}
              <button
                onClick={() => applyFilters({ ...filters, amountMin: "" })}
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.amountMax && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs border border-slate-200">
              Max: {filters.amountMax}
              <button
                onClick={() => applyFilters({ ...filters, amountMax: "" })}
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}

      <div className={TABLE_SHELL}>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-16 text-sm text-slate-500">
              No settlements found
            </div>
          ) : (
            <table className="w-full min-w-[1000px] whitespace-nowrap">
              <thead>
                <tr>
                  <th className={TH}>ID</th>
                  {isAdmin && <th className={TH}>Merchant ID</th>}
                  <th className={TH}>Amount</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Method</th>
                  <th className={TH}>Requested At</th>
                  <th className={TH}>Completed At</th>
                  <th className={TH}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 border-t border-slate-100 transition"
                  >
                    <td className={TD_MONO}>{item.id}</td>
                    {isAdmin && <td className={TD}>{item.merchantId}</td>}
                    <td className={`${TD} font-semibold text-slate-900`}>
                      {formatCurrency(Number(item.amount))}
                    </td>
                    <td className={TD}>
                      <span
                        className={`${BADGE} ${BADGE_COLORS[STATUS_MAP[item.status?.toUpperCase()] || "slate"]}`}
                      >
                        {item.status || "PENDING"}
                      </span>
                    </td>
                    <td className={TD}>{getMethodFromNotes(item.notes)}</td>
                    <td className={TD}>
                      {new Date(
                        item.requestedAt || item.createdAt,
                      ).toLocaleString()}
                    </td>
                    <td className={TD}>
                      {item.completedAt
                        ? new Date(item.completedAt).toLocaleString()
                        : "-"}
                    </td>
                    <td className={TD}>
                      <button
                        onClick={() => handleViewClick(item)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-[#f5efe0] transition"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Pagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
          onLimitChange={(l) =>
            setPagination((prev) => ({ ...prev, limit: l, page: 1 }))
          }
        />
      </div>

      <SettlementDetails
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        settlement={settlementDetails || selectedSettlement}
      />

      {isAdmin && (
        <SettlementForm
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
