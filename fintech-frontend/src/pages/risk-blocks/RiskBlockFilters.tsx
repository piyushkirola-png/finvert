import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { INPUT, LABEL } from "../../lib/styles";

export interface RiskBlockFilterValues {
  type: string;
  value: string;
  isActive: string;
}

interface Props {
  filters: RiskBlockFilterValues;
  setFilters: (filters: RiskBlockFilterValues) => void;
  isFiltersVisible: boolean;
  setIsFiltersVisible: (val: boolean) => void;
}

const typeOptions = [
  { value: "All", label: "All Types" },
  { value: "USER_ID", label: "User ID" },
  { value: "MERCHANT_ID", label: "Merchant ID" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE_NUMBER", label: "Phone Number" },
  { value: "CARD_BIN", label: "Card BIN" },
  { value: "CARD_LAST4", label: "Card Last 4" },
  { value: "VPA", label: "VPA (UPI ID)" },
  { value: "IP_ADDRESS", label: "IP Address" },
  { value: "DEVICE_ID", label: "Device ID" },
];

const statusOptions = [
  { value: "All", label: "All Status" },
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "INACTIVE", label: "INACTIVE" },
];

const EMPTY: RiskBlockFilterValues = {
  type: "All",
  value: "",
  isActive: "All",
};

export default function RiskBlockFilters({
  filters,
  setFilters,
  isFiltersVisible,
  setIsFiltersVisible,
}: Props) {
  const [tempFilters, setTempFilters] =
    useState<RiskBlockFilterValues>(filters);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("[data-filter-toggle]")) return;
      if (filterRef.current && !filterRef.current.contains(target)) {
        setIsFiltersVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsFiltersVisible]);

  useEffect(() => {
    if (isFiltersVisible) setTempFilters(filters);
  }, [isFiltersVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => {
    setFilters(tempFilters);
    setIsFiltersVisible(false);
    toast.success("Filter applied");
  };

  const handleClear = () => {
    setTempFilters(EMPTY);
    setFilters(EMPTY);
    setIsFiltersVisible(false);
    toast.success("Filters cleared");
  };

  if (!isFiltersVisible) return null;

  const set = (patch: Partial<RiskBlockFilterValues>) =>
    setTempFilters({ ...tempFilters, ...patch });

  return (
    <div
      ref={filterRef}
      className="bg-white rounded-lg shadow-xl border border-slate-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className={LABEL}>Type</label>
            <select
              value={tempFilters.type}
              onChange={(e) => set({ type: e.target.value })}
              className={INPUT}
            >
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={LABEL}>Value</label>
            <input
              type="text"
              placeholder="Enter blocked value"
              value={tempFilters.value}
              onChange={(e) => set({ value: e.target.value })}
              className={INPUT}
            />
          </div>

          <div className="space-y-1">
            <label className={LABEL}>Status</label>
            <select
              value={tempFilters.isActive}
              onChange={(e) => set({ isActive: e.target.value })}
              className={INPUT}
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50 rounded-b-lg">
        <button
          onClick={() => setIsFiltersVisible(false)}
          className="h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-100 transition shadow-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleClear}
          className="h-9 px-3 rounded-md border border-slate-300 bg-white text-red-600 text-xs font-medium hover:bg-red-50 transition shadow-sm"
        >
          Clear All
        </button>
        <button
          onClick={handleApply}
          className="h-9 px-4 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition shadow-sm"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
