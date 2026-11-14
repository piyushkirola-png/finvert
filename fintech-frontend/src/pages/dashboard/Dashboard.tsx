import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { useCurrency } from "../../components/context/CurrencyContext";
import { useAuth } from "../../components/context/AuthContext";
import DashboardFilters from "./DashboardFilters";
import StatsCards from "./StatsCards";
import RecentTransactions from "./RecentTransactions";
import {
  useDashboardStats,
  useRecentTransactions,
  useDashboardMerchants,
  useDashboardGateways,
  useDashboardUsers,
} from "../../api/queries/useDashboard";
import type {
  DashboardFilters as DashboardFiltersType,
  Merchant,
  Gateway,
  User,
} from "../../types/dashboard";
import type { DateFilters } from "./DashboardFilters";

export type DashboardFiltersWithDate = DashboardFiltersType & DateFilters;

export default function Dashboard() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";
  const { formatCurrency } = useCurrency();

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<DashboardFiltersWithDate>({
    dateRange: "today",
    customStartDate: "",
    customEndDate: "",
  });
  const [lastUpdated, setLastUpdated] = useState<string>(
    new Date().toISOString(),
  );

  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
    isError: statsError,
    refetch: refetchStats,
  } = useDashboardStats(filters);
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useRecentTransactions({
    merchantId: filters.merchantId,
    gatewayId: filters.gatewayId,
    userId: filters.userId,
  });
  const { data: merchantsData = [] } = useDashboardMerchants(isAdmin);
  const { data: gatewaysData = [] } = useDashboardGateways(isAdmin);
  const { data: usersData = [] } = useDashboardUsers(isAdmin);

  useEffect(() => {
    if (merchantsData.length > 0) setMerchants(merchantsData);
  }, [merchantsData]);
  useEffect(() => {
    if (gatewaysData.length > 0) setGateways(gatewaysData);
  }, [gatewaysData]);
  useEffect(() => {
    if (usersData.length > 0) setUsers(usersData);
  }, [usersData]);
  useEffect(() => {
    if (stats) setLastUpdated(new Date().toISOString());
  }, [stats]);

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchTransactions();
    toast.success("Refreshed");
  }, [refetchStats, refetchTransactions]);

  const handleFilterChange = useCallback(
    (
      type: "merchant" | "gateway" | "admin_user" | "date",
      value: string | DateFilters,
    ) => {
      if (type === "date") {
        const dateValue = value as DateFilters;
        setFilters((prev) => ({
          ...prev,
          dateRange: dateValue.dateRange,
          customStartDate: dateValue.customStartDate || "",
          customEndDate: dateValue.customEndDate || "",
        }));
      } else {
        const filterKey =
          type === "merchant"
            ? "merchantId"
            : type === "gateway"
              ? "gatewayId"
              : "userId";
        setFilters((prev) => ({
          ...prev,
          [filterKey]: value as string,
          ...(type === "merchant" ? { userId: undefined } : {}),
          dateRange: prev.dateRange || "today",
          customStartDate: prev.customStartDate || "",
          customEndDate: prev.customEndDate || "",
        }));
      }
      toast.success("Filter applied");
    },
    [],
  );

  const clearAllFilters = useCallback(() => {
    setFilters({ dateRange: "today", customStartDate: "", customEndDate: "" });
  }, []);

  return (
    <div className="space-y-6">
      <DashboardFilters
        merchants={merchants}
        gateways={gateways}
        users={
          filters.merchantId
            ? users.filter(
              (u) => u.merchantId?.toString() === filters.merchantId,
            )
            : users
        }
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearAllFilters}
        onRefresh={handleRefresh}
        refreshing={statsFetching}
        lastUpdated={lastUpdated}
        isAdmin={isAdmin}
      />

      {stats ? (
        <div
          className={`transition-opacity ${statsFetching ? "opacity-60" : ""}`}
        >
          <StatsCards stats={stats} formatCurrency={formatCurrency} />
        </div>
      ) : statsLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="text-slate-400" size={24} />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {statsError ? "Could not load data" : "No data available"}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Try adjusting your filters or refresh
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 h-9 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
          >
            Refresh
          </button>
        </div>
      )}

      <RecentTransactions
        transactions={transactions}
        loading={transactionsLoading}
      />
    </div>
  );
}
