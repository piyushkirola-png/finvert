import { useState, useEffect, useRef } from "react";
import {
  Wallet,
  ArrowUpFromLine,
  TrendingUp,
  Activity,
  Receipt,
  RefreshCw,
  Filter,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import PayoutWalletFilter from "./PayoutWalletFilters";
import PayoutWalletTable from "./PayoutWalletTable";
import { useCurrency } from "../../components/context/CurrencyContext";
import { useAuth } from "../../components/context/AuthContext";
import {
  usePayoutWalletTransactions,
  usePayoutWalletSummary,
  usePayoutRequestStats,
} from "../../api/queries/usePayoutWallet";
import {
  useRefreshPayoutWallet,
  useExportPayoutWallet,
} from "../../api/mutations/payoutWalletMutations";
import type {
  PayoutWalletFilters,
  PayoutWalletTransaction,
} from "../../types/payoutWallet";
import {
  PAGE_HEADER,
  STAT_CARD,
  STAT_ICON_WRAP,
  BTN_FILTER,
  BTN_EXPORT,
  BTN_REFRESH,
} from "../../lib/styles";

export type PayoutWalletFiltersType = PayoutWalletFilters;

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function PayoutWalletStatement() {
  const { formatCurrency } = useCurrency();
  const { role, user } = useAuth();
  const isAdmin = role === "ADMIN";

  const [filters, setFilters] = useState<PayoutWalletFilters>({
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
  const [data, setData] = useState<PayoutWalletTransaction[]>([]);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [globalSearch] = useState("");
  const [filteredData, setFilteredData] = useState<PayoutWalletTransaction[]>(
    [],
  );

  const {
    data: transactionsData,
    isLoading: loading,
    refetch: refetchTransactions,
  } = usePayoutWalletTransactions({
    ...filters,
    offset: (page - 1) * limit,
    limit,
  });

  const { data: summaryData, refetch: refetchSummary } =
    usePayoutWalletSummary();
  const { data: statsData, refetch: refetchStats } = usePayoutRequestStats();

  const { mutate: refreshWallet, isPending: isRefreshing } =
    useRefreshPayoutWallet();
  const { mutate: exportWallet, isPending: isExporting } =
    useExportPayoutWallet();

  useEffect(() => {
    if (transactionsData) {
      setData(transactionsData.data || []);
      setTotal(transactionsData.total || 0);

      if (globalSearch) {
        const searchTerm = globalSearch.toLowerCase();
        const filtered = (transactionsData.data || []).filter(
          (item: PayoutWalletTransaction) =>
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

  const updateFilters = (newFilters: PayoutWalletFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const calculateSuccessRate = () => {
    const completed = statsData?.completed || 0;
    const failed = statsData?.failed || 0;
    const pending = statsData?.pending || 0;
    const t = completed + failed + pending;
    if (t === 0) return "0%";
    return `${((completed / t) * 100).toFixed(1)}%`;
  };

  const handleRefresh = () => {
    let merchantId: number | null = null;
    if (role === "USER" && user) {
      merchantId = (user as any).merchantId ?? (user as any).id ?? null;
    }

    refreshWallet(
      { merchantId },
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
    (statsData?.completed || 0) +
    (statsData?.failed || 0) +
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
      label: "Today's Payouts",
      value: formatCurrency(Number(summaryData?.totalOutToday || 0)),
      caption: "Today's outgoing",
      icon: ArrowUpFromLine,
      color: "bg-orange-50 text-orange-600",
      valueClass: "text-orange-600",
    },
    {
      label: "Net Charges",
      value: formatCurrency(Number(summaryData?.totalChargesToday || 0)),
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
      caption: "Today's PayOut requests",
      icon: Activity,
      color: "bg-indigo-50 text-indigo-600",
      valueClass: "text-indigo-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Payout Wallet
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor wallet balance and payout transactions
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
              <PayoutWalletFilter
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

      <PayoutWalletTable
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
