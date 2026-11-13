import { useState, useEffect, useRef } from "react";
import { Filter } from "lucide-react";
import { toast } from "sonner";
import { BTN_FILTER, INPUT, LABEL } from "../../lib/styles";

export interface MerchantFiltersState {
  status: string;
  plan: string;
}

interface Props {
  filters: MerchantFiltersState;
  onApply: (f: MerchantFiltersState) => void;
  onClear: () => void;
}

const statusOptions = ["All", "ACTIVE", "INACTIVE", "PENDING", "REJECTED"];
const planOptions = ["All", "BASIC", "PREMIUM"];

export default function MerchantFilters({ filters, onApply, onClear }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [temp, setTemp] = useState<MerchantFiltersState>(filters);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-filter-toggle]")) return;
      if (wrapperRef.current && !wrapperRef.current.contains(target))
        setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const activeCount = [filters.status !== "All", filters.plan !== "All"].filter(
    Boolean,
  ).length;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        data-filter-toggle
        onClick={() => {
          setTemp(filters);
          setIsOpen(!isOpen);
        }}
        className={BTN_FILTER}
      >
        <Filter size={16} /> Filter{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[420px] bg-white rounded-lg shadow-xl border border-slate-200">
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={LABEL}>Status</label>
              <select
                value={temp.status}
                onChange={(e) => setTemp({ ...temp, status: e.target.value })}
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
              <label className={LABEL}>Plan</label>
              <select
                value={temp.plan}
                onChange={(e) => setTemp({ ...temp, plan: e.target.value })}
                className={INPUT}
              >
                {planOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
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
              onClick={() => {
                setTemp({ status: "All", plan: "All" });
                onClear();
                setIsOpen(false);
                toast.success("Filters cleared");
              }}
              className="h-9 px-3 rounded-md border border-slate-300 bg-white text-red-600 text-xs font-medium hover:bg-red-50 transition"
            >
              Clear All
            </button>
            <button
              onClick={() => {
                onApply(temp);
                setIsOpen(false);
                toast.success("Filter applied");
              }}
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
