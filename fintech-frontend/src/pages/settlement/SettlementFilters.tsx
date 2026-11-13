import { useState, useEffect, useRef } from "react";
import { Filter } from "lucide-react";
import { toast } from "sonner";
import { BTN_FILTER, INPUT, LABEL } from "../../lib/styles";

export interface SettlementFiltersState {
  status: string;
  merchantId: string;
  amountMin: string;
  amountMax: string;
}

interface Props {
  filters: SettlementFiltersState;
  onApply: (filters: SettlementFiltersState) => void;
  onClear: () => void;
}

const statusOptions = ["All", "COMPLETED", "PENDING", "FAILED"];

export default function SettlementFilters({
  filters,
  onApply,
  onClear,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFilters, setTempFilters] =
    useState<SettlementFiltersState>(filters);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("[data-filter-toggle]")) return;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleOpen = () => {
    setTempFilters(filters);
    setIsOpen(!isOpen);
  };

  const handleApply = () => {
    onApply(tempFilters);
    setIsOpen(false);
    toast.success("Filter applied");
  };

  const handleClear = () => {
    const empty: SettlementFiltersState = {
      status: "All",
      merchantId: "",
      amountMin: "",
      amountMax: "",
    };
    setTempFilters(empty);
    onClear();
    setIsOpen(false);
    toast.success("Filters cleared");
  };

  const activeCount = [
    filters.status !== "All",
    !!filters.merchantId,
    !!filters.amountMin,
    !!filters.amountMax,
  ].filter(Boolean).length;

  return (
    <div className="relative" ref={wrapperRef}>
      <button data-filter-toggle onClick={handleOpen} className={BTN_FILTER}>
        <Filter size={16} />
        Filter{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[520px] bg-white rounded-lg shadow-xl border border-slate-200">
          <div className="p-4 grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className={LABEL}>Status</label>
              <select
                value={tempFilters.status}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, status: e.target.value })
                }
                className={INPUT}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className={LABEL}>Amount Min</label>
              <input
                type="number"
                placeholder="0"
                value={tempFilters.amountMin}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, amountMin: e.target.value })
                }
                className={INPUT}
              />
            </div>

            <div className="space-y-1">
              <label className={LABEL}>Amount Max</label>
              <input
                type="number"
                placeholder="0"
                value={tempFilters.amountMax}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, amountMax: e.target.value })
                }
                className={INPUT}
              />
            </div>
          </div>

          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50 rounded-b-lg">
            <button
              onClick={() => setIsOpen(false)}
              className="h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleClear}
              className="h-9 px-3 rounded-md border border-slate-300 bg-white text-red-600 text-xs font-medium hover:bg-red-50 transition"
            >
              Clear All
            </button>
            <button
              onClick={handleApply}
              className="h-9 px-4 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
