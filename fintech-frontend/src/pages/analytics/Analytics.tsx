import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { useCurrency } from "../../components/context/CurrencyContext";
import { useAuth } from "../../components/context/AuthContext";
import AnalyticsFilters from "./AnalyticsFilters";
import TransactionVolumeChart from "./TransactionVolumeChart";
import PaymentMethodsChart from "./PaymentMethodsChart";
import HourlyVolumeChart from "./HourlyVolumeChart";
import GatewayPerformanceChart from "./GatewayPerformanceChart";
import TransactionCompositionChart from "./TransactionCompositionChart";
import MerchantPerformanceChart from "./MerchantPerformanceChart";

import {
  useTransactionVolume,
  usePaymentMethods,
  useHourlyVolume,
  useGatewayPerformance,
  useTransactionComposition,
  useMerchantPerformance,
} from "../../api/queries/useAnalytics";
import type { AnalyticsFilters as AnalyticsFiltersType } from "../../types/analytics";
import { PAGE_HEADER } from "../../lib/styles";

export type { AnalyticsFiltersType };
export type DateRange =
  "today" | "previousDay" | "week" | "month" | "last3months" | "custom";

export interface DateFilters {
  dateRange: DateRange;
  customStartDate: string;
  customEndDate: string;
}

export type AnalyticsFiltersWithDate = AnalyticsFiltersType & DateFilters;

export default function Analytics() {
  const { role } = useAuth();
  const { currency } = useCurrency();
  const [lastUpdated, setLastUpdated] = useState<string>(
    new Date().toISOString(),
  );

  const [filters, setFilters] = useState<AnalyticsFiltersWithDate>({
    dateRange: "today",
    customStartDate: "",
    customEndDate: "",
  });

  const filterRef = useRef<AnalyticsFiltersWithDate>({
    dateRange: "today",
    customStartDate: "",
    customEndDate: "",
  });
  const isInitialMount = useRef(true);

  const {
    data: transactionVolume,
    isLoading: volumeLoading,
    refetch: refetchVolume,
  } = useTransactionVolume(filters);
  const {
    data: paymentMethods = [],
    isLoading: methodsLoading,
    refetch: refetchMethods,
  } = usePaymentMethods(filters);
  const {
    data: hourlyVolume,
    isLoading: hourlyLoading,
    refetch: refetchHourly,
  } = useHourlyVolume(filters);
  const {
    data: gatewayPerformance = [],
    isLoading: gatewayLoading,
    refetch: refetchGateway,
  } = useGatewayPerformance(filters);
  const {
    data: transactionComposition,
    isLoading: compositionLoading,
    refetch: refetchComposition,
  } = useTransactionComposition(filters);
  const {
    data: merchantPerformance = [],
    isLoading: merchantLoading,
    refetch: refetchMerchant,
  } = useMerchantPerformance(filters);

  const loading =
    volumeLoading ||
    methodsLoading ||
    hourlyLoading ||
    gatewayLoading ||
    compositionLoading ||
    merchantLoading;

  useEffect(() => {
    if (transactionVolume) setLastUpdated(new Date().toISOString());
  }, [transactionVolume]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const hasFilterChanged =
      filterRef.current.merchantId !== filters.merchantId ||
      filterRef.current.gatewayId !== filters.gatewayId ||
      filterRef.current.userId !== filters.userId ||
      filterRef.current.dateRange !== filters.dateRange ||
      filterRef.current.customStartDate !== filters.customStartDate ||
      filterRef.current.customEndDate !== filters.customEndDate;

    if (hasFilterChanged) {
      filterRef.current = { ...filters };
      refetchVolume();
      refetchMethods();
      refetchHourly();
      refetchGateway();
      refetchComposition();
      refetchMerchant();
    }
  }, [
    filters.merchantId,
    filters.gatewayId,
    filters.userId,
    filters.dateRange,
    filters.customStartDate,
    filters.customEndDate,
    refetchVolume,
    refetchMethods,
    refetchHourly,
    refetchGateway,
    refetchComposition,
    refetchMerchant,
  ]);

  const handleRefresh = useCallback(() => {
    refetchVolume();
    refetchMethods();
    refetchHourly();
    refetchGateway();
    refetchComposition();
    refetchMerchant();
    toast.success("Refreshed");
  }, [
    refetchVolume,
    refetchMethods,
    refetchHourly,
    refetchGateway,
    refetchComposition,
    refetchMerchant,
  ]);

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
        setFilters((prev) => ({ ...prev, [filterKey]: value || undefined }));
      }
      toast.success("Filter applied");
    },
    [],
  );

  const clearAllFilters = useCallback(() => {
    setFilters({
      dateRange: "today",
      customStartDate: "",
      customEndDate: "",
      merchantId: undefined,
      gatewayId: undefined,
      userId: undefined,
    });
  }, []);

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return "--";
    const date = new Date(lastUpdated);
    if (isNaN(date.getTime())) return "--";
    return `${date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })} ${date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })}`;
  }, [lastUpdated]);

  if (loading && !transactionVolume) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!transactionVolume) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="text-slate-400" size={24} />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          No data available
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
    );
  }

  return (
    <div className="space-y-6">
      <div className={PAGE_HEADER}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900">Analytics</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">Live</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Updated: {formattedLastUpdated}
          </p>
        </div>

        <AnalyticsFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearAllFilters}
          onRefresh={handleRefresh}
          refreshing={loading}
          isAdmin={role === "ADMIN"}
        />
      </div>

      {/* Row 1: Transaction Volume (2 cols) + Payment Methods (1 col) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <TransactionVolumeChart
            data={transactionVolume}
            currency={currency}
          />
        </div>
        <div className="xl:col-span-1">
          <PaymentMethodsChart data={paymentMethods} currency={currency} />
        </div>
      </div>

      {/* Row 2 */}
      {role === "ADMIN" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <HourlyVolumeChart data={hourlyVolume} currency={currency} />
          <GatewayPerformanceChart
            data={gatewayPerformance}
            currency={currency}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <HourlyVolumeChart data={hourlyVolume} currency={currency} />
          <TransactionCompositionChart
            data={transactionComposition}
            currency={currency}
          />
        </div>
      )}

      {/* Row 3 — admin only */}
      {role === "ADMIN" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <TransactionCompositionChart
            data={transactionComposition}
            currency={currency}
          />
          <MerchantPerformanceChart
            data={merchantPerformance}
            currency={currency}
          />
        </div>
      )}
    </div>
  );
}
