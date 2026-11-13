import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { EXPORT_TYPE_LABELS } from "../../types/csvExport";
import { INPUT, LABEL } from "../../lib/styles";
import { Filter } from "lucide-react";

type CSVExportFiltersProps = {
  filterType: string;
  setFilterType: (type: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
};

const statusOptions = ["All", "COMPLETED", "FAILED"];

export default function CSVExportFilters({
  filterType,
  setFilterType,
  statusFilter,
  setStatusFilter,
}: CSVExportFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempType, setTempType] = useState(filterType);
  const [tempStatus, setTempStatus] = useState(statusFilter);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const typeOptions = ["All", ...Object.keys(EXPORT_TYPE_LABELS)];

  const handleOpen = () => {
    setTempType(filterType);
    setTempStatus(statusFilter);
    setIsOpen(!isOpen);
  };

  const handleApply = () => {
    setFilterType(tempType);
    setStatusFilter(tempStatus);
    setIsOpen(false);
    toast.success("Filter applied");
  };

  const handleClear = () => {
    setTempType("All");
    setTempStatus("All");
    setFilterType("All");
    setStatusFilter("All");
    setIsOpen(false);
    toast.success("Filters cleared");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-[#f5efe0] hover:shadow-sm transition"
      >
        <Filter size={16} />
        Filter
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[420px] bg-white rounded-lg shadow-xl border border-slate-200">
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={LABEL}>Status</label>
              <select
                value={tempStatus}
                onChange={(e) => setTempStatus(e.target.value)}
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
              <label className={LABEL}>Type</label>
              <select
                value={tempType}
                onChange={(e) => setTempType(e.target.value)}
                className={INPUT}
              >
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t === "All" ? "All Types" : EXPORT_TYPE_LABELS[t] || t}
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
