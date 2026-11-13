import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type {
  AnalyticsFiltersWithDate,
  DateFilters,
  DateRange,
} from "./Analytics";
import { BTN_FILTER, FILTER_PANEL } from "../../lib/styles";
import DatePicker from "../../components/ui/DatePicker";

interface AnalyticsFiltersProps {
  filters: AnalyticsFiltersWithDate;
  onFilterChange: (
    type: "merchant" | "gateway" | "admin_user" | "date",
    value: string | DateFilters,
  ) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  refreshing: boolean;
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

export default function AnalyticsFilters({
  filters,
  onFilterChange,
  onClearFilters,
  onRefresh,
  refreshing,
}: AnalyticsFiltersProps) {
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [localStartDate, setLocalStartDate] = useState("");
  const [localEndDate, setLocalEndDate] = useState("");
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDateDropdownOpen(false);
        setIsCustomMode(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (filters.dateRange === "custom") {
      setLocalStartDate(filters.customStartDate || "");
      setLocalEndDate(filters.customEndDate || "");
      setIsCustomMode(true);
    } else {
      setIsCustomMode(false);
    }
  }, [filters.dateRange, filters.customStartDate, filters.customEndDate]);

  const getDateLabel = useCallback(() => {
    const option = dateFilterOptions.find((d) => d.value === filters.dateRange);
    return option?.label || "Today";
  }, [filters.dateRange]);

  const handleDateSelect = useCallback(
    (value: DateRange) => {
      if (value !== "custom") {
        onFilterChange("date", {
          dateRange: value,
          customStartDate: "",
          customEndDate: "",
        });
        setIsDateDropdownOpen(false);
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
      setIsDateDropdownOpen(false);
      setIsCustomMode(false);
    } else {
      toast.error("Please select both start and end dates");
    }
  }, [localStartDate, localEndDate, onFilterChange]);

  const hasDateFilter = filters.dateRange && filters.dateRange !== "today";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative" ref={dateDropdownRef}>
        <button
          onClick={() => {
            setIsDateDropdownOpen(!isDateDropdownOpen);
            if (!isDateDropdownOpen && isCustomMode) setIsCustomMode(false);
          }}
          className={`${BTN_FILTER} ${
            hasDateFilter || filters.dateRange === "custom"
              ? "!bg-slate-900 !text-white !border-slate-900"
              : ""
          }`}
        >
          {getDateLabel()}
          <ChevronDown
            size={14}
            className={`transition-transform ${isDateDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isDateDropdownOpen && (
          <div className={`${FILTER_PANEL} !overflow-visible`}>
            <div className="py-1">
              {dateFilterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleDateSelect(option.value)}
                  className={`w-full px-4 py-2 text-sm text-left hover:bg-slate-50 transition ${
                    filters.dateRange === option.value
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

      {hasDateFilter && (
        <button
          onClick={onClearFilters}
          className="h-9 px-3 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition"
        >
          Clear filter
        </button>
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
  );
}
