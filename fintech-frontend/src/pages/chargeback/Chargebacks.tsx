import { useState, useEffect, useRef } from "react";
import {
  Download,
  RefreshCw,
  Filter,
  CheckCircle,
  XCircle,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  useChargebacks,
  useChargebackStats,
} from "../../api/queries/useChargebacks";
import { useExportChargebacks } from "../../api/mutations/chargebackMutations";
import type {
  ChargebackFilters,
  ChargebackStats,
} from "../../types/chargeback";
import { useCurrency } from "../../components/context/CurrencyContext";
import { useAuth } from "../../components/context/AuthContext";
import ChargebackFiltersComponent from "./ChargebackFilters";
import ChargebackTable from "./ChargebackTable";
import {
  PAGE_HEADER,
  STAT_CARD,
  STAT_ICON_WRAP,
  BTN_FILTER,
  BTN_EXPORT,
  BTN_REFRESH,
} from "../../lib/styles";

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function Chargebacks() {
  const { role } = useAuth();
  useCurrency();
  const isAdmin = role === "ADMIN";

  const [filters, setFilters] = useState<ChargebackFilters>({
    status: "All",
    merchantId: "",
    gatewayName: "All",
    payInRequestId: "",
    reason: "All",
    amountMin: "",
    amountMax: "",
    dateFrom: null,
    dateTo: null,
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const gatewayMapRef = useRef<{ [key: string]: number }>({});

  const getGatewayId = (f: ChargebackFilters) => {
    if (!f.gatewayName || f.gatewayName === "All") return undefined;
    const name = f.gatewayName.trim();
    return (
      gatewayMapRef.current[name] || gatewayMapRef.current[name.toLowerCase()]
    );
  };

  const buildApiFilters = () => {
    const params: any = {
      offset: (page - 1) * limit,
      limit,
      sorts: JSON.stringify({ createdAt: "desc" }),
    };
    if (filters.status && filters.status !== "All")
      params.status = filters.status;
    if (filters.merchantId) params.merchantId = filters.merchantId;
    const gid = getGatewayId(filters);
    if (gid) params.gatewayId = gid;
    if (filters.payInRequestId) params.payInRequestId = filters.payInRequestId;
    if (filters.reason && filters.reason !== "All")
      params.reason = filters.reason;
    if (filters.amountMin) params.amountMin = filters.amountMin;
    if (filters.amountMax) params.amountMax = filters.amountMax;
    if (filters.dateFrom) params.startDate = toDateStr(filters.dateFrom);
    if (filters.dateTo) params.endDate = toDateStr(filters.dateTo);
    return params;
  };

  const {
    data,
    refetch,
    isLoading: loading,
  } = useChargebacks(buildApiFilters());
  const { data: statsData, refetch: refetchStats } = useChargebackStats();
  const { mutate: exportChargebacks, isPending: exporting } =
    useExportChargebacks();

  const chargebacks = data?.data || [];
  const total = data?.total || 0;
  const stats: any = statsData || {
    approved: 0,
    rejected: 0,
    disputed: 0,
    reversed: 0,
    totalAmount: 0,
  };

  const handleGatewaysLoaded = (gateways: any[]) => {
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
  };

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    refetch();
  }, [filters, page, limit]);

  const updateFilters = (newFilters: ChargebackFilters) => {
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
    const gid = getGatewayId(f);
    if (gid) exportFilters.gatewayId = gid;
    if (f.payInRequestId) exportFilters.payInRequestId = f.payInRequestId;
    if (f.reason && f.reason !== "All") exportFilters.reason = f.reason;
    if (f.amountMin) exportFilters.amountMin = f.amountMin;
    if (f.amountMax) exportFilters.amountMax = f.amountMax;
    if (f.dateFrom) exportFilters.startDate = toDateStr(f.dateFrom);
    if (f.dateTo) exportFilters.endDate = toDateStr(f.dateTo);
    exportChargebacks(exportFilters);
  };

  const STATUS_CARDS = [
    {
      key: "approved",
      label: "Approved",
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
      valueClass: "text-green-600",
    },
    {
      key: "disputed",
      label: "Disputed",
      icon: isAdmin ? RotateCcw : ShieldAlert,
      color: "bg-orange-50 text-orange-600",
      valueClass: "text-orange-600",
    },
    {
      key: "rejected",
      label: "Rejected",
      icon: XCircle,
      color: "bg-red-50 text-red-600",
      valueClass: "text-red-600",
    },
    {
      key: "reversed",
      label: "Reversed",
      icon: RotateCcw,
      color: "bg-purple-50 text-purple-600",
      valueClass: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Chargebacks</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor and manage chargeback disputes
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

          {isFiltersVisible && (
            <div
              className={`absolute right-0 top-full mt-2 z-50 max-w-[calc(100vw-2rem)] ${
                isAdmin ? "w-[820px]" : "w-[720px]"
              }`}
            >
              <ChargebackFiltersComponent
                filters={filters}
                setFilters={updateFilters}
                isFiltersVisible={isFiltersVisible}
                setIsFiltersVisible={setIsFiltersVisible}
                onGatewaysLoaded={handleGatewaysLoaded}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    {stats[card.key as keyof ChargebackStats] || 0}
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

      <ChargebackTable
        data={chargebacks}
        loading={loading}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
        total={total}
        onRefresh={handleRefresh}
        isAdmin={isAdmin}
      />
    </div>
  );
}
