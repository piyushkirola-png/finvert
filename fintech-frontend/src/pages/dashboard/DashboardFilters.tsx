import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type {
  Merchant,
  Gateway,
  User,
  DashboardFilters as FiltersType,
} from "../../types/dashboard";
import { PAGE_HEADER, BTN_FILTER, FILTER_PANEL } from "../../lib/styles";
import DatePicker from "../../components/ui/DatePicker";
import { formatISTDateTime } from "../../utils/dateFormatter";

export type DateRange =
  "today" | "previousDay" | "week" | "month" | "last3months" | "custom";

export interface DateFilters {
  dateRange: DateRange;
  customStartDate: string;
  customEndDate: string;
}

interface DashboardFiltersProps {
  merchants: Merchant[];
  gateways: Gateway[];
  users: User[];
  filters: FiltersType & DateFilters;
  onFilterChange: (
    type: "merchant" | "gateway" | "admin_user" | "date",
    value: string | DateFilters,
  ) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  lastUpdated: string;
  isAdmin?: boolean;
}

const dateFilterOptions: { label: string; value: DateRange }[] = [
  { label: "Today", value: "today" },
  { label: "Previous Day", value: "previousDay" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Last 3 Months", value: "last3months" },
  { label: "Custom Range", value: "custom" },
];

export default function DashboardFilters({
  merchants,
  gateways,
  users,
  filters,
  onFilterChange,
  onClearFilters,
  onRefresh,
  refreshing,
  lastUpdated,
  isAdmin = true,
}: DashboardFiltersProps) {
  // Defensive defaults — never trust props to be defined on first render
  const safeFilters: FiltersType & DateFilters = filters ?? {
    dateRange: "today",
    customStartDate: "",
    customEndDate: "",
  };

  const [openDropdown, setOpenDropdown] = useState<
    "date" | "merchant" | "gateway" | "user" | null
  >(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [localStartDate, setLocalStartDate] = useState("");
  const [localEndDate, setLocalEndDate] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
        setIsCustomMode(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (safeFilters.dateRange === "custom") {
      setLocalStartDate(safeFilters.customStartDate || "");
      setLocalEndDate(safeFilters.customEndDate || "");
      setIsCustomMode(true);
    } else {
      setIsCustomMode(false);
    }
  }, [
    safeFilters.dateRange,
    safeFilters.customStartDate,
    safeFilters.customEndDate,
  ]);

  const getMerchantName = useCallback(
    (id?: string) => {
      if (!id) return "Merchant";
      const merchant = merchants.find((m) => m.id.toString() === id);
      return merchant?.merchantName || "Unknown";
    },
    [merchants],
  );

  const getGatewayName = useCallback(
    (id?: string) => {
      if (!id) return "Gateway";
      const gateway = gateways.find((g) => g.id.toString() === id);
      return gateway?.gateway_name || `Gateway ${id}`;
    },
    [gateways],
  );

  const getUserName = useCallback(
    (id?: string) => {
      if (!id) return "User";
      const user = users.find((u) => u.id.toString() === id);
      return user?.fullName || user?.email || "Unknown";
    },
    [users],
  );

  const getFilterLabel = useCallback(() => {
    const option = dateFilterOptions.find(
      (d) => d.value === safeFilters.dateRange,
    );
    return option?.label || "Today";
  }, [safeFilters.dateRange]);

  const handleDateSelect = useCallback(
    (value: DateRange) => {
      if (value !== "custom") {
        onFilterChange("date", {
          dateRange: value,
          customStartDate: "",
          customEndDate: "",
        });
        setOpenDropdown(null);
        setIsCustomMode(false);
      } else {
        setIsCustomMode(true);
        setLocalStartDate("");
        setLocalEndDate("");
      }
    },
    [onFilterChange],
  );

  const handleApplyCustom = useCallback(() => {
    if (localStartDate && localEndDate) {
      if (localStartDate > localEndDate) {
        toast.error("Start date cannot be after end date");
        return;
      }
      onFilterChange("date", {
        dateRange: "custom",
        customStartDate: localStartDate,
        customEndDate: localEndDate,
      });
      setOpenDropdown(null);
      setIsCustomMode(false);
    } else {
      toast.error("Please select both start and end dates");
    }
  }, [localStartDate, localEndDate, onFilterChange]);

  // const formattedLastUpdated = useMemo(() => {
  //   if (!lastUpdated) return "--";
  //   const date = new Date(lastUpdated);
  //   if (isNaN(date.getTime())) return "--";
  //   return `${date.toLocaleDateString("en-IN", {
  //     day: "numeric",
  //     month: "long",
  //     year: "numeric",
  //   })} ${date.toLocaleTimeString("en-IN", {
  //     hour: "numeric",
  //     minute: "2-digit",
  //     second: "2-digit",
  //     hour12: true,
  //   })}`;
  // }, [lastUpdated]);

  const formattedLastUpdated = useMemo(
    () => formatISTDateTime(lastUpdated),
    [lastUpdated],
  );

  const hasDateFilter =
    safeFilters.dateRange && safeFilters.dateRange !== "today";
  const hasAnyFilter =
    !!safeFilters.merchantId ||
    !!safeFilters.gatewayId ||
    !!safeFilters.userId ||
    hasDateFilter;

  return (
    <div className={`${PAGE_HEADER} relative z-30`}>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs text-green-600 font-medium">Live</span>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          Updated: {formattedLastUpdated}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap" ref={wrapperRef}>
        {hasAnyFilter && (
          <button
            onClick={onClearFilters}
            className="h-9 px-3 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition"
          >
            Clear filters
          </button>
        )}

        {/* Date */}
        <div className="relative">
          <button
            onClick={() => {
              setOpenDropdown(openDropdown === "date" ? null : "date");
              if (openDropdown !== "date") setIsCustomMode(false);
            }}
            className={`${BTN_FILTER} ${
              hasDateFilter || safeFilters.dateRange === "custom"
                ? "!bg-slate-900 !text-white !border-slate-900"
                : ""
            }`}
          >
            {getFilterLabel()}
            <ChevronDown
              size={14}
              className={`transition-transform ${openDropdown === "date" ? "rotate-180" : ""}`}
            />
          </button>
          {openDropdown === "date" && (
            <div className={`${FILTER_PANEL} !overflow-visible`}>
              <div className="py-1 overflow-visible">
                {dateFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleDateSelect(option.value)}
                    className={`w-full px-4 py-2 text-sm text-left hover:bg-slate-50 transition ${
                      safeFilters.dateRange === option.value
                        ? "text-slate-900 font-medium bg-slate-100"
                        : "text-slate-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                {isCustomMode && (
                  <div className="border-t border-slate-200 mt-1 pt-3 px-4 pb-2 space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 font-medium block mb-1">
                        Start Date
                      </label>
                      <DatePicker
                        value={localStartDate ? new Date(localStartDate) : null}
                        placeholder="From date"
                        onChange={(d) =>
                          setLocalStartDate(
                            d
                              ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                              : "",
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-medium block mb-1">
                        End Date
                      </label>
                      <DatePicker
                        value={localEndDate ? new Date(localEndDate) : null}
                        placeholder="To date"
                        align="right"
                        onChange={(d) =>
                          setLocalEndDate(
                            d
                              ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                              : "",
                          )
                        }
                      />
                    </div>
                    <button
                      onClick={handleApplyCustom}
                      className="w-full h-8 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Merchant */}
        {isAdmin && (
          <div className="relative">
            <button
              onClick={() =>
                setOpenDropdown(openDropdown === "merchant" ? null : "merchant")
              }
              className={`${BTN_FILTER} ${
                safeFilters.merchantId
                  ? "!bg-slate-900 !text-white !border-slate-900"
                  : ""
              }`}
            >
              {getMerchantName(safeFilters.merchantId)}
              <ChevronDown
                size={14}
                className={`transition-transform ${openDropdown === "merchant" ? "rotate-180" : ""}`}
              />
            </button>
            {openDropdown === "merchant" && (
              <div className={FILTER_PANEL}>
                <div className="py-1 max-h-[280px] overflow-y-auto">
                  {merchants.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500 text-center">
                      No merchants found
                    </div>
                  ) : (
                    merchants.map((merchant) => (
                      <button
                        key={merchant.id}
                        onClick={() => {
                          onFilterChange("merchant", merchant.id.toString());
                          setOpenDropdown(null);
                        }}
                        className={`w-full px-4 py-2 text-sm text-left hover:bg-slate-50 transition ${
                          safeFilters.merchantId === merchant.id.toString()
                            ? "text-slate-900 font-medium bg-slate-100"
                            : "text-slate-700"
                        }`}
                      >
                        {merchant.merchantName || `Merchant ${merchant.id}`}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gateway */}
        {isAdmin && (
          <div className="relative">
            <button
              onClick={() =>
                setOpenDropdown(openDropdown === "gateway" ? null : "gateway")
              }
              className={`${BTN_FILTER} ${
                safeFilters.gatewayId
                  ? "!bg-slate-900 !text-white !border-slate-900"
                  : ""
              }`}
            >
              {getGatewayName(safeFilters.gatewayId)}
              <ChevronDown
                size={14}
                className={`transition-transform ${openDropdown === "gateway" ? "rotate-180" : ""}`}
              />
            </button>
            {openDropdown === "gateway" && (
              <div className={FILTER_PANEL}>
                <div className="py-1 max-h-[280px] overflow-y-auto">
                  {gateways.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500 text-center">
                      No gateways available
                    </div>
                  ) : (
                    gateways.map((gateway) => (
                      <button
                        key={gateway.id}
                        onClick={() => {
                          onFilterChange("gateway", gateway.id.toString());
                          setOpenDropdown(null);
                        }}
                        className={`w-full px-4 py-2 text-sm text-left hover:bg-slate-50 transition ${
                          safeFilters.gatewayId === gateway.id.toString()
                            ? "text-slate-900 font-medium bg-slate-100"
                            : "text-slate-700"
                        }`}
                      >
                        {gateway.gateway_name || `Gateway ${gateway.id}`}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User */}
        {isAdmin && (
          <div className="relative">
            <button
              onClick={() =>
                setOpenDropdown(openDropdown === "user" ? null : "user")
              }
              className={`${BTN_FILTER} ${
                safeFilters.userId
                  ? "!bg-slate-900 !text-white !border-slate-900"
                  : ""
              }`}
            >
              {getUserName(safeFilters.userId)}
              <ChevronDown
                size={14}
                className={`transition-transform ${openDropdown === "user" ? "rotate-180" : ""}`}
              />
            </button>
            {openDropdown === "user" && (
              <div className={FILTER_PANEL}>
                <div className="py-1 max-h-[280px] overflow-y-auto">
                  {users.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500 text-center">
                      No users found
                    </div>
                  ) : (
                    users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          onFilterChange("admin_user", user.id.toString());
                          setOpenDropdown(null);
                        }}
                        className={`w-full px-4 py-2 text-sm text-left hover:bg-slate-50 transition ${
                          safeFilters.userId === user.id.toString()
                            ? "text-slate-900 font-medium bg-slate-100"
                            : "text-slate-700"
                        }`}
                      >
                        {user.fullName || user.email}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>
  );
}
