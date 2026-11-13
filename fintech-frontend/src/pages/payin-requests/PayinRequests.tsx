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
import PayInRequestFilter from "./PayinRequestsFilters";
import PayInRequestsTable from "./PayinRequestsTable";
import { useCurrency } from "../../components/context/CurrencyContext";
import { useAuth } from "../../components/context/AuthContext";
import {
  usePayInRequests,
  usePayInRequestStats,
  usePayInRequestFilterOptions,
} from "../../api/queries/usePayinRequests";
import { useExportPayInRequests } from "../../api/mutations/payinRequestMutations";
import type {
  PayInRequestFilters,
  PayInRequest,
} from "../../types/payinRequest";
import {
  PAGE_HEADER,
  STAT_CARD,
  STAT_ICON_WRAP,
  BTN_FILTER,
  BTN_EXPORT,
  BTN_REFRESH,
} from "../../lib/styles";

export type PayInFilters = PayInRequestFilters;

type DashboardStats = {
  pendingPayIns: number;
  completedPayIns: number;
  failedPayIns: number;
};

export default function PayInRequests() {
  const { role } = useAuth();
  useCurrency();

  const [filters, setFilters] = useState<PayInFilters>({
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
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [data, setData] = useState<PayInRequest[]>([]);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [globalSearch] = useState("");
  const gatewayMapRef = useRef<{ [key: string]: number }>({});
  const [filteredData, setFilteredData] = useState<PayInRequest[]>([]);

  const {
    data: payInData,
    isLoading: loading,
    refetch: refetchPayIns,
  } = usePayInRequests({
    ...filters,
    offset: (page - 1) * limit,
    limit,
    sortBy: "id",
    sortOrder: "DESC",
  });

  const { data: statsData, refetch: refetchStats } = usePayInRequestStats();
  const { data: filterOptions, refetch: refetchFilterOptions } =
    usePayInRequestFilterOptions();
  const { mutate: exportPayIns, isPending: isExporting } =
    useExportPayInRequests();

  useEffect(() => {
    if (payInData) {
      setData(payInData.data || []);
      setTotal(payInData.total || 0);
      if (globalSearch) {
        const searchTerm = globalSearch.toLowerCase();
        setFilteredData(
          (payInData.data || []).filter((item: PayInRequest) =>
            Object.values(item).some((v: unknown) =>
              v === null || v === undefined
                ? false
                : String(v).toLowerCase().includes(searchTerm),
            ),
          ),
        );
      } else {
        setFilteredData(payInData.data || []);
      }
    }
  }, [payInData, globalSearch]);

  useEffect(() => {
    if (filterOptions?.gateways) {
      const map: { [key: string]: number } = {};
      filterOptions.gateways.forEach((g: any) => {
        const name = g.gateway_name || g.name || g.gatewayName;
        if (name) {
          const t = name.trim();
          map[t] = g.id;
          map[t.toLowerCase()] = g.id;
        }
      });
      gatewayMapRef.current = map;
    }
  }, [filterOptions?.gateways]);

  const handleGatewaysLoaded = useCallback((gateways: any[]) => {
    const map: { [key: string]: number } = {};
    gateways.forEach((g: any) => {
      const name = g.gateway_name || g.name || g.gatewayName;
      if (name) {
        const t = name.trim();
        map[t] = g.id;
        map[t.toLowerCase()] = g.id;
      }
    });
    gatewayMapRef.current = map;
  }, []);

  const updateFilters = (newFilters: PayInFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleRefresh = () => {
    refetchPayIns();
    refetchStats();
    refetchFilterOptions();
    toast.success("Refreshed");
  };

  const handleExport = useCallback(async () => {
    const exportFilters: any = {};
    if (filters.status && filters.status !== "All")
      exportFilters.status = filters.status;
    if (filters.paymentMode && filters.paymentMode !== "All")
      exportFilters.paymentMode = filters.paymentMode;
    if (filters.gatewayName && filters.gatewayName !== "All") {
      const gatewayName = filters.gatewayName.trim();
      let gatewayId = gatewayMapRef.current[gatewayName];
      if (!gatewayId)
        gatewayId = gatewayMapRef.current[gatewayName.toLowerCase()];
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
      const dateStr = toDateStr(new Date());
      exportFilters.startDate = dateStr;
      exportFilters.endDate = dateStr;
    } else {
      if (filters.dateFrom)
        exportFilters.startDate = toDateStr(filters.dateFrom);
      if (filters.dateTo) exportFilters.endDate = toDateStr(filters.dateTo);
    }

    exportPayIns(exportFilters);
  }, [filters, exportPayIns]);

  const stats: DashboardStats = {
    pendingPayIns: statsData?.pendingPayIns || 0,
    completedPayIns: statsData?.completedPayIns || 0,
    failedPayIns: statsData?.failedPayIns || 0,
  };

  const statCards = [
    {
      label: "Completed PayIns",
      value: stats.completedPayIns,
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
      valueClass: "text-green-600",
    },
    {
      label: "Pending PayIns",
      value: stats.pendingPayIns,
      icon: Clock,
      color: "bg-yellow-50 text-yellow-600",
      valueClass: "text-yellow-600",
    },
    {
      label: "Failed PayIns",
      value: stats.failedPayIns,
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
            PayIn Requests
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor and manage all incoming payment requests
          </p>
        </div>

        {/* relative: the filter panel is positioned against this group */}
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
                role === "ADMIN" ? "w-[820px]" : "w-[720px]"
              }`}
            >
              <PayInRequestFilter
                filters={filters}
                setFilters={updateFilters}
                isFiltersVisible={isFiltersVisible}
                setIsFiltersVisible={setIsFiltersVisible}
                onRefresh={handleRefresh}
                onGatewaysLoaded={handleGatewaysLoaded}
                isAdmin={role === "ADMIN"}
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

      <PayInRequestsTable
        data={globalSearch ? filteredData : data}
        loading={loading}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
        total={globalSearch ? filteredData.length : total}
        isAdmin={role === "ADMIN"}
      />
    </div>
  );
}
