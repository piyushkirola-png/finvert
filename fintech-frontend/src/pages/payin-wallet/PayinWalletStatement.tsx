import { useState, useEffect, useRef } from "react";
import {
  Wallet,
  ArrowDownToLine,
  TrendingUp,
  Activity,
  Receipt,
  RefreshCw,
  Filter,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import PayinWalletFilter from "./PayinWalletFilters";
import PayinWalletTable from "./PayinWalletTable";
import { useCurrency } from "../../components/context/CurrencyContext";
import { useAuth } from "../../components/context/AuthContext";
import {
  usePayinWalletTransactions,
  usePayinWalletSummary,
  usePayinRequestStats,
} from "../../api/queries/usePayinWallet";
import {
  useRefreshPayinWallet,
  useExportPayinWallet,
} from "../../api/mutations/payinWalletMutations";
import type {
  PayinWalletFilters,
  PayinWalletTransaction,
} from "../../types/payinWallet";
import {
  PAGE_HEADER,
  STAT_CARD,
  STAT_ICON_WRAP,
  BTN_FILTER,
  BTN_EXPORT,
  BTN_REFRESH,
} from "../../lib/styles";

export type PayinWalletFiltersType = PayinWalletFilters;

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function PayinWalletStatement() {
  const { formatCurrency } = useCurrency();
  const { role, user } = useAuth();
  const isAdmin = role === "ADMIN";

  const [filters, setFilters] = useState<PayinWalletFilters>({
    type: "All",
    userId: "",
    merchantId: "",
    transactionId: "",
    referenceId: "",
    search: "",
    amountMin: "",
    amountMax: "",
    dateFrom: null,
    dateTo: null,
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [data, setData] = useState<PayinWalletTransaction[]>([]);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [globalSearch] = useState("");
  const [filteredData, setFilteredData] = useState<PayinWalletTransaction[]>(
    [],
  );

  const {
    data: transactionsData,
    isLoading: loading,
    refetch: refetchTransactions,
  } = usePayinWalletTransactions({
    ...filters,
    offset: (page - 1) * limit,
    limit,
  });

  const { data: summaryData, refetch: refetchSummary } =
    usePayinWalletSummary();
  const { data: statsData, refetch: refetchStats } = usePayinRequestStats();

  const { mutate: refreshWallet, isPending: isRefreshing } =
    useRefreshPayinWallet();
  const { mutate: exportWallet, isPending: isExporting } =
    useExportPayinWallet();

  useEffect(() => {
    if (transactionsData) {
      setData(transactionsData.data || []);
      setTotal(transactionsData.total || 0);

      if (globalSearch) {
        const searchTerm = globalSearch.toLowerCase();
        const filtered = (transactionsData.data || []).filter(
          (item: PayinWalletTransaction) =>
            Object.values(item).some((value: unknown) => {
              if (value === null || value === undefined) return false;
              return String(value).toLowerCase().includes(searchTerm);
            }),
        );
        setFilteredData(filtered);
      } else {
        setFilteredData(transactionsData.data || []);
      }
    }
  }, [transactionsData, globalSearch]);

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // useEffect(() => {
  //   refetchTransactions();
  // }, [filters, page, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilters = (newFilters: PayinWalletFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const calculateSuccessRate = () => {
    const t =
      (statsData?.approved || 0) +
      (statsData?.rejected || 0) +
      (statsData?.pending || 0);
    const rate = t === 0 ? 0 : ((statsData?.approved || 0) / t) * 100;
    return `${rate.toFixed(1)}%`;
  };

  const handleRefresh = () => {
    let merchantId: number | null = null;
    let userId: number | null = null;

    if (role === "USER" && user) {
      merchantId = (user as any).merchantId ?? (user as any).id ?? null;
      userId = (user as any).id ?? null;
    }

    refreshWallet(
      { merchantId, userId },
      {
        onSuccess: () => {
          refetchTransactions();
          refetchSummary();
          refetchStats();
          toast.success("Refreshed");
        },
      },
    );
  };

  const handleExport = () => {
    const f = filtersRef.current;
    const exportFilters: any = {};

    if (f.type && f.type !== "All") exportFilters.type = f.type;
    if (f.userId) exportFilters.userId = f.userId;
    if (f.merchantId) exportFilters.merchantId = f.merchantId;
    if (f.transactionId) exportFilters.transactionId = f.transactionId;
    if (f.referenceId) exportFilters.referenceId = f.referenceId;
    if (f.search) exportFilters.search = f.search;
    if (f.amountMin) exportFilters.amountMin = f.amountMin;
    if (f.amountMax) exportFilters.amountMax = f.amountMax;
    if (f.dateFrom) exportFilters.startDate = toDateStr(f.dateFrom);
    if (f.dateTo) exportFilters.endDate = toDateStr(f.dateTo);

    exportWallet(exportFilters);
  };

  const totalTransactions =
    (statsData?.approved || 0) +
    (statsData?.rejected || 0) +
    (statsData?.pending || 0);

  const STAT_CARDS_CONFIG = [
    {
      label: "Current Balance",
      value: formatCurrency(Number(summaryData?.closingBalance || 0)),
      caption: "Wallet balance",
      icon: Wallet,
      color: "bg-blue-50 text-blue-600",
      valueClass: "text-slate-800",
    },
    {
      label: "Today's PayIns",
      value: formatCurrency(Number(summaryData?.totalInToday || 0)),
      caption: "Today's earnings",
      icon: ArrowDownToLine,
      color: "bg-green-50 text-green-600",
      valueClass: "text-green-600",
    },
    {
      label: "Net Charges",
      value: formatCurrency(Number(summaryData?.netChargesToday || 0)),
      caption: "Today's fees",
      icon: Receipt,
      color: "bg-rose-50 text-rose-600",
      valueClass: "text-rose-600",
    },
    {
      label: "Success Rate",
      value: calculateSuccessRate(),
      caption: "Today's Success Rate",
      icon: TrendingUp,
      color: "bg-purple-50 text-purple-600",
      valueClass: "text-purple-600",
    },
    {
      label: "Total Transactions",
      value: totalTransactions,
      caption: "Today's PayIn requests",
      icon: Activity,
      color: "bg-orange-50 text-orange-600",
      valueClass: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Payin Wallet</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor wallet balance and transactions
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
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={BTN_REFRESH}
          >
            <RefreshCw
              size={16}
              className={isRefreshing ? "animate-spin" : ""}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>

          {isFiltersVisible && (
            <div className="absolute right-0 top-full mt-2 z-50 max-w-[calc(100vw-2rem)] w-[720px]">
              <PayinWalletFilter
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

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {STAT_CARDS_CONFIG.map((card) => {
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
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {card.caption}
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

      <PayinWalletTable
        data={globalSearch ? filteredData : data}
        loading={loading}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
        total={globalSearch ? filteredData.length : total}
      />
    </div>
  );
}
