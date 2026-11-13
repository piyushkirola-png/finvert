import { useState, useEffect, useRef } from "react";
import {
  Download,
  RefreshCw,
  Plus,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useRefunds, useRefundStats } from "../../api/queries/useRefunds";
import { useExportRefunds } from "../../api/mutations/refundMutations";
import type { RefundFilters, RefundStats } from "../../types/refund";
import { useCurrency } from "../../components/context/CurrencyContext";
import { useAuth } from "../../components/context/AuthContext";
import RefundFiltersComponent from "./RefundFilters";
import RefundTable from "./RefundTable";
import CreateRefundModal from "./RefundForm";
import {
  PAGE_HEADER,
  STAT_CARD,
  STAT_ICON_WRAP,
  BTN_FILTER,
  BTN_EXPORT,
  BTN_REFRESH,
  BTN_PRIMARY,
} from "../../lib/styles";

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const STATUS_CARDS = [
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle,
    color: "bg-green-50 text-green-600",
    valueClass: "text-green-600",
  },
  {
    key: "processing",
    label: "Processing",
    icon: Clock,
    color: "bg-orange-50 text-orange-600",
    valueClass: "text-orange-600",
  },
  {
    key: "pending",
    label: "Pending",
    icon: Clock,
    color: "bg-yellow-50 text-yellow-600",
    valueClass: "text-yellow-600",
  },
  {
    key: "failed",
    label: "Failed",
    icon: XCircle,
    color: "bg-red-50 text-red-600",
    valueClass: "text-red-600",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    icon: AlertCircle,
    color: "bg-slate-100 text-slate-600",
    valueClass: "text-slate-600",
  },
];

export default function Refunds() {
  const { role } = useAuth();
  useCurrency();
  const isAdmin = role === "ADMIN";

  const [filters, setFilters] = useState<RefundFilters>({
    status: "All",
    merchantId: "",
    merchantReference: "",
    payInRequestId: "",
    refundType: "All",
    amountMin: "",
    amountMax: "",
    dateFrom: null,
    dateTo: null,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const buildApiFilters = () => {
    const params: any = {
      offset: (page - 1) * limit,
      limit,
      sorts: JSON.stringify({ createdAt: "desc" }),
    };
    if (filters.status && filters.status !== "All")
      params.status = filters.status;
    if (filters.merchantId) params.merchantId = filters.merchantId;
    if (filters.merchantReference)
      params.merchantReference = filters.merchantReference;
    if (filters.payInRequestId) params.payInRequestId = filters.payInRequestId;
    if (filters.refundType && filters.refundType !== "All")
      params.refundType = filters.refundType;
    if (filters.amountMin) params.amountMin = filters.amountMin;
    if (filters.amountMax) params.amountMax = filters.amountMax;
    if (filters.dateFrom) params.startDate = toDateStr(filters.dateFrom);
    if (filters.dateTo) params.endDate = toDateStr(filters.dateTo);
    return params;
  };

  const { data, refetch, isLoading: loading } = useRefunds(buildApiFilters());
  const { data: statsData, refetch: refetchStats } = useRefundStats();
  const { mutate: exportRefunds, isPending: exporting } = useExportRefunds();

  const refunds = data?.data || [];
  const total = data?.total || 0;
  const stats: any = statsData || {
    completed: 0,
    processing: 0,
    pending: 0,
    failed: 0,
    cancelled: 0,
    totalAmount: 0,
  };

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    refetch();
  }, [filters, page, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilters = (newFilters: RefundFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleRefresh = () => {
    refetch();
    refetchStats();
    toast.success("Refreshed");
  };

  const handleExport = () => {
    const f = filtersRef.current;
    const exportFilters: any = {};
    if (f.status && f.status !== "All") exportFilters.status = f.status;
    if (f.merchantId) exportFilters.merchantId = f.merchantId;
    if (f.merchantReference)
      exportFilters.merchantReference = f.merchantReference;
    if (f.payInRequestId) exportFilters.payInRequestId = f.payInRequestId;
    if (f.refundType && f.refundType !== "All")
      exportFilters.refundType = f.refundType;
    if (f.amountMin) exportFilters.amountMin = f.amountMin;
    if (f.amountMax) exportFilters.amountMax = f.amountMax;
    if (f.dateFrom) exportFilters.startDate = toDateStr(f.dateFrom);
    if (f.dateTo) exportFilters.endDate = toDateStr(f.dateTo);
    exportRefunds(exportFilters);
  };

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Refunds</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor and manage all refunds
          </p>
        </div>

        <div className="relative flex items-center gap-2">
          <button
            data-filter-toggle
            onClick={() => setIsFiltersVisible(!isFiltersVisible)}
            className={BTN_FILTER}
          >
            <Filter size={16} /> Filter
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className={BTN_EXPORT}
          >
            <Download size={16} /> {exporting ? "Exporting..." : "Export"}
          </button>
          <button onClick={handleRefresh} className={BTN_REFRESH}>
            <RefreshCw size={16} /> Refresh
          </button>
          {isAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className={BTN_PRIMARY}
            >
              <Plus size={16} /> Raise Refund
            </button>
          )}

          {isFiltersVisible && (
            <div
              className={`absolute right-0 top-full mt-2 z-50 max-w-[calc(100vw-2rem)] ${
                isAdmin ? "w-[820px]" : "w-[720px]"
              }`}
            >
              <RefundFiltersComponent
                filters={filters}
                setFilters={updateFilters}
                isFiltersVisible={isFiltersVisible}
                setIsFiltersVisible={setIsFiltersVisible}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {STATUS_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className={STAT_CARD}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <p
                    className={`text-xl font-semibold mt-1 ${card.valueClass}`}
                  >
                    {stats[card.key as keyof RefundStats] || 0}
                  </p>
                </div>
                <div className={`${STAT_ICON_WRAP} ${card.color}`}>
                  <Icon size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <RefundTable
        data={refunds}
        loading={loading}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
        total={total}
        onRefresh={handleRefresh}
        isAdmin={isAdmin}
      />

      {isAdmin && (
        <CreateRefundModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            refetch();
            refetchStats();
          }}
        />
      )}
    </div>
  );
}
