import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { INPUT, LABEL } from "../../lib/styles";

export interface InboundFilterValues {
  status: string;
  gateway: string;
  event: string;
  utr: string;
  amountMin: string;
  amountMax: string;
}

interface Props {
  filters: InboundFilterValues;
  setFilters: (filters: InboundFilterValues) => void;
  isFiltersVisible: boolean;
  setIsFiltersVisible: (val: boolean) => void;
  gatewayOptions: string[];
  eventOptions: string[];
}

const statusOptions = ["all", "SUCCESS", "PROCESSING", "FAILED", "ACKNOWLEDGED"];

const EMPTY: InboundFilterValues = {
  status: "all",
  gateway: "all",
  event: "all",
  utr: "",
  amountMin: "",
  amountMax: "",
};

export default function InboundWebhookFilters({
  filters,
  setFilters,
  isFiltersVisible,
  setIsFiltersVisible,
  gatewayOptions,
  eventOptions,
}: Props) {
  const [tempFilters, setTempFilters] = useState<InboundFilterValues>(filters);
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

  const set = (patch: Partial<InboundFilterValues>) =>
    setTempFilters({ ...tempFilters, ...patch });

  return (
    <div
      ref={filterRef}
      className="bg-white rounded-lg shadow-xl border border-slate-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {/* Row 1: Status | Gateway | Event */}
          <div className="space-y-1">
            <label className={LABEL}>Status</label>
            <select
              value={tempFilters.status}
              onChange={(e) => set({ status: e.target.value })}
              className={INPUT}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All Status" : s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={LABEL}>Gateway</label>
            <select
              value={tempFilters.gateway}
              onChange={(e) => set({ gateway: e.target.value })}
              className={INPUT}
            >
              <option value="all">All Gateways</option>
              {gatewayOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={LABEL}>Event</label>
            <select
              value={tempFilters.event}
              onChange={(e) => set({ event: e.target.value })}
              className={INPUT}
            >
              <option value="all">All Events</option>
              {eventOptions.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: UTR | Amount (span 2) */}
          <div className="space-y-1">
            <label className={LABEL}>UTR</label>
            <input
              placeholder="Search by UTR..."
              value={tempFilters.utr}
              onChange={(e) => set({ utr: e.target.value })}
              className={INPUT}
            />
          </div>

          <div className="space-y-1 col-span-2">
            <label className={LABEL}>Amount Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                className={INPUT}
                value={tempFilters.amountMin}
                onChange={(e) => set({ amountMin: e.target.value })}
              />
              <input
                type="number"
                placeholder="Max"
                className={INPUT}
                value={tempFilters.amountMax}
                onChange={(e) => set({ amountMax: e.target.value })}
              />
            </div>
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
