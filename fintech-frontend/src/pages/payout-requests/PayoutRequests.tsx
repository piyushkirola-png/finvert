import { useState, useEffect, useCallback, useRef } from "react";
import {
  Download,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import PayoutRequestFilter, {
  type PayoutFilters,
} from "./PayoutRequestsFilters";
import PayoutRequestsTable from "./PayoutRequestsTable";
import { useCurrency } from "../../components/context/CurrencyContext";
import { useAuth } from "../../components/context/AuthContext";
import {
  usePayoutRequests,
  usePayoutRequestStats,
  usePayoutRequestFilterOptions,
} from "../../api/queries/usePayoutRequests";
import { useExportPayoutRequests } from "../../api/mutations/payoutRequestMutations";
import type { PayoutRequest } from "../../types/payoutRequest";
import {
  PAGE_HEADER,
  STAT_CARD,
  STAT_ICON_WRAP,
  BTN_FILTER,
  BTN_EXPORT,
  BTN_REFRESH,
} from "../../lib/styles";

type DashboardStats = {
  pendingPayouts: number;
  completedPayouts: number;
  failedPayouts: number;
};

const EMPTY_FILTERS: PayoutFilters = {
  status: "All",
  gatewayName: "All",
  merchantId: "",
  userId: "",
  search: "",
  utr: "",
  paymentMode: "All",
  feeType: "All",
  amountMin: "",
  amountMax: "",
  dateFrom: null,
  dateTo: null,
};

export default function PayoutRequests() {
  const { role } = useAuth();
  useCurrency();
  const isAdmin = role === "ADMIN";

  const [filters, setFilters] = useState<PayoutFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [data, setData] = useState<PayoutRequest[]>([]);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const gatewayMapRef = useRef<{ [key: string]: number }>({});

  const {
    data: payoutData,
    isLoading: loading,
    refetch: refetchPayouts,
  } = usePayoutRequests({
    ...filters,
    offset: (page - 1) * limit,
    limit,
    sortBy: "id",
    sortOrder: "DESC",
  });

  const { data: statsData, refetch: refetchStats } = usePayoutRequestStats();
  const { data: filterOptions, refetch: refetchFilterOptions } =
    usePayoutRequestFilterOptions();
  const { mutate: exportPayouts, isPending: isExporting } =
    useExportPayoutRequests();

  useEffect(() => {
    if (payoutData) {
      setData(payoutData.data || []);
      setTotal(payoutData.total || 0);
    }
  }, [payoutData]);

  const buildGatewayMap = (gateways: any[]) => {
    const map: { [key: string]: number } = {};
    gateways.forEach((g: any) => {
      const name = g.gateway_name || g.name || g.gatewayName || g.vendorName;
      if (name) {
        const t = name.trim();
        map[t] = g.id;
        map[t.toLowerCase()] = g.id;
      }
    });
    gatewayMapRef.current = map;
  };

  useEffect(() => {
    if (filterOptions?.gateways) buildGatewayMap(filterOptions.gateways);
  }, [filterOptions?.gateways]);

  const handleGatewaysLoaded = useCallback((gateways: any[]) => {
    buildGatewayMap(gateways);
  }, []);

  const updateFilters = (newFilters: PayoutFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const handleRefresh = () => {
    refetchPayouts();
    refetchStats();
    refetchFilterOptions();
    toast.success("Refreshed");
  };

  const handleExport = useCallback(() => {
    const exportFilters: any = {};
    if (filters.status && filters.status !== "All")
      exportFilters.status = filters.status;
    if (filters.paymentMode && filters.paymentMode !== "All")
      exportFilters.paymentMode = filters.paymentMode;
    if (filters.gatewayName && filters.gatewayName !== "All") {
      const gatewayName = filters.gatewayName.trim();
      const gatewayId =
        gatewayMapRef.current[gatewayName] ||
        gatewayMapRef.current[gatewayName.toLowerCase()];
      if (gatewayId) exportFilters.gatewayId = gatewayId;
    }
    if (filters.merchantId) exportFilters.merchantId = filters.merchantId;
    if (filters.userId) exportFilters.userId = filters.userId;
    if (filters.search) exportFilters.search = filters.search;
    if (filters.utr) exportFilters.utr = filters.utr;
    if (filters.amountMin) exportFilters.amountMin = filters.amountMin;
    if (filters.amountMax) exportFilters.amountMax = filters.amountMax;
    if (filters.feeType && filters.feeType !== "All")
      exportFilters.feeType = filters.feeType;

    const hasNonDateFilters =
      (filters.status && filters.status !== "All") ||
      (filters.paymentMode && filters.paymentMode !== "All") ||
      (filters.gatewayName && filters.gatewayName !== "All") ||
      filters.merchantId ||
      filters.userId ||
      filters.search ||
      filters.utr ||
      filters.amountMin ||
      filters.amountMax ||
      (filters.feeType && filters.feeType !== "All");

    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    if (!filters.dateFrom && !filters.dateTo && !hasNonDateFilters) {
      const ds = toDateStr(new Date());
      exportFilters.startDate = ds;
      exportFilters.endDate = ds;
    } else {
      if (filters.dateFrom)
        exportFilters.startDate = toDateStr(filters.dateFrom);
      if (filters.dateTo) exportFilters.endDate = toDateStr(filters.dateTo);
    }

    exportPayouts(exportFilters);
  }, [filters, exportPayouts]);

  const stats: DashboardStats = {
    pendingPayouts: statsData?.pendingPayouts || 0,
    completedPayouts: statsData?.completedPayouts || 0,
    failedPayouts: statsData?.failedPayouts || 0,
  };

  const statCards = [
    {
      label: "Completed Payouts",
      value: stats.completedPayouts,
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
      valueClass: "text-green-600",
    },
    {
      label: "Pending Payouts",
      value: stats.pendingPayouts,
      icon: Clock,
      color: "bg-yellow-50 text-yellow-600",
      valueClass: "text-yellow-600",
    },
    {
      label: "Failed Payouts",
      value: stats.failedPayouts,
      icon: AlertCircle,
      color: "bg-red-50 text-red-600",
      valueClass: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Payout Requests
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor and manage all outgoing payment requests
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
            disabled={isExporting}
            className={BTN_EXPORT}
          >
            <Download size={16} /> {isExporting ? "Exporting..." : "Export"}
          </button>
          <button onClick={handleRefresh} className={BTN_REFRESH}>
            <RefreshCw size={16} /> Refresh
          </button>

          {isFiltersVisible && (
            <div
              className={`absolute right-0 top-full mt-2 z-50 max-w-[calc(100vw-2rem)] ${
                isAdmin ? "w-[820px]" : "w-[720px]"
              }`}
            >
              <PayoutRequestFilter
                filters={filters}
                onApply={updateFilters}
                onClear={clearFilters}
                isOpen={isFiltersVisible}
                onClose={() => setIsFiltersVisible(false)}
                onGatewaysLoaded={handleGatewaysLoaded}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={STAT_CARD}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <p
                    className={`text-xl font-semibold mt-1 ${card.valueClass}`}
                  >
                    {card.value}
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

      <PayoutRequestsTable
        data={data}
        loading={loading}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
        total={total}
        isAdmin={isAdmin}
      />
    </div>
  );
}
