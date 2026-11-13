import { useState, useEffect, useRef } from "react";
import { Filter } from "lucide-react";
import { toast } from "sonner";
import { BTN_FILTER, INPUT, LABEL } from "../../lib/styles";

export interface BulkUploadFiltersState {
  status: string;
  mode: string;
  merchantId: string;
  userId: string;
}

interface Option {
  id: number | string;
  label: string;
}

interface Props {
  filters: BulkUploadFiltersState;
  onApply: (f: BulkUploadFiltersState) => void;
  onClear: () => void;
  isAdmin: boolean;
  merchants?: Option[];
  users?: Option[];
}

const statusOptions = ["ALL", "COMPLETED", "PROCESSING", "FAILED"];
const modeOptions = ["ALL", "instant", "scheduled"];

export default function BulkUploadFilters({
  filters,
  onApply,
  onClear,
  isAdmin,
  merchants = [],
  users = [],
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [temp, setTemp] = useState<BulkUploadFiltersState>(filters);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setTemp(filters);
  }, [isOpen, filters]);

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

  const activeCount = [
    filters.status !== "ALL",
    filters.mode !== "ALL",
    isAdmin && filters.merchantId !== "ALL",
    isAdmin && filters.userId !== "ALL",
  ].filter(Boolean).length;

  const clearAll = () => {
    const empty: BulkUploadFiltersState = {
      status: "ALL",
      mode: "ALL",
      merchantId: "ALL",
      userId: "ALL",
    };
    setTemp(empty);
    onClear();
    setIsOpen(false);
    toast.success("Filters cleared");
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        data-filter-toggle
        onClick={() => setIsOpen(!isOpen)}
        className={BTN_FILTER}
      >
        <Filter size={16} /> Filter{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[480px] bg-white rounded-lg shadow-xl border border-slate-200">
          <div className="p-4 grid grid-cols-2 gap-3">
            {isAdmin && (
              <>
                <div className="space-y-1">
                  <label className={LABEL}>Merchant</label>
                  <select
                    value={temp.merchantId}
                    onChange={(e) =>
                      setTemp({
                        ...temp,
                        merchantId: e.target.value,
                        userId: "ALL",
                      })
                    }
                    className={INPUT}
                  >
                    <option value="ALL">All Merchants</option>
                    {merchants.map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={LABEL}>User</label>
                  <select
                    value={temp.userId}
                    onChange={(e) =>
                      setTemp({ ...temp, userId: e.target.value })
                    }
                    className={INPUT}
                  >
                    <option value="ALL">All Users</option>
                    {users.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className={LABEL}>Status</label>
              <select
                value={temp.status}
                onChange={(e) => setTemp({ ...temp, status: e.target.value })}
                className={INPUT}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s === "ALL" ? "All Status" : s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className={LABEL}>Mode</label>
              <select
                value={temp.mode}
                onChange={(e) => setTemp({ ...temp, mode: e.target.value })}
                className={INPUT}
              >
                {modeOptions.map((m) => (
                  <option key={m} value={m}>
                    {m === "ALL"
                      ? "All Modes"
                      : m.charAt(0).toUpperCase() + m.slice(1)}
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
              onClick={clearAll}
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
