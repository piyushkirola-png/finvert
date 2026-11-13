import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Gateway, Merchant } from "../../types/gatewayMerchantMapping";
import { INPUT, LABEL } from "../../lib/styles";

export interface MappingFilterValues {
  merchantId: number | "all";
  gatewayId: number | "all";
  status: string;
}

interface Props {
  filters: MappingFilterValues;
  setFilters: (filters: MappingFilterValues) => void;
  isFiltersVisible: boolean;
  setIsFiltersVisible: (val: boolean) => void;
  gateways: Gateway[];
  merchants: Merchant[];
}

const EMPTY: MappingFilterValues = {
  merchantId: "all",
  gatewayId: "all",
  status: "all",
};

export default function GatewayMerchantFilters({
  filters,
  setFilters,
  isFiltersVisible,
  setIsFiltersVisible,
  gateways,
  merchants,
}: Props) {
  const [tempFilters, setTempFilters] = useState<MappingFilterValues>(filters);
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

  const set = (patch: Partial<MappingFilterValues>) =>
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
            <label className={LABEL}>Merchant</label>
            <select
              value={tempFilters.merchantId}
              onChange={(e) =>
                set({
                  merchantId:
                    e.target.value === "all" ? "all" : Number(e.target.value),
                })
              }
              className={INPUT}
            >
              <option value="all">All Merchants</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || `Merchant ${m.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={LABEL}>Gateway</label>
            <select
              value={tempFilters.gatewayId}
              onChange={(e) =>
                set({
                  gatewayId:
                    e.target.value === "all" ? "all" : Number(e.target.value),
                })
              }
              className={INPUT}
            >
              <option value="all">All Gateways</option>
              {gateways.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.gateway_name || g.name || `Gateway ${g.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={LABEL}>Status</label>
            <select
              value={tempFilters.status}
              onChange={(e) => set({ status: e.target.value })}
              className={INPUT}
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
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
