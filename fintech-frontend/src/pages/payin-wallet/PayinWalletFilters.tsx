import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { PayinWalletFiltersType } from "./PayinWalletStatement";
import { usePayinWalletFilterOptions } from "../../api/queries/usePayinWallet";
import DatePicker from "../../components/ui/DatePicker";
import { INPUT, LABEL } from "../../lib/styles";

interface Props {
  filters: PayinWalletFiltersType;
  setFilters: (filters: PayinWalletFiltersType) => void;
  isFiltersVisible: boolean;
  setIsFiltersVisible: (val: boolean) => void;
  isAdmin?: boolean;
}

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const typeOptions = ["All", "CREDIT", "DEBIT"];

const EMPTY: PayinWalletFiltersType = {
  type: "All",
  userId: "",
  merchantId: "",
  transactionId: "",
  referenceId: "",
  search: "",
  amountMin: "",
  amountMax: "",
  dateFrom: null,
  dateTo: null,
};

export default function PayinWalletFilter({
  filters,
  setFilters,
  isFiltersVisible,
  setIsFiltersVisible,
  isAdmin = true,
}: Props) {
  const [tempFilters, setTempFilters] =
    useState<PayinWalletFiltersType>(filters);
  const filterRef = useRef<HTMLDivElement>(null);
  const { data: filterOptions, isLoading: loadingOptions } =
    usePayinWalletFilterOptions();

  const merchants = filterOptions?.merchants || [];

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
  }, [isFiltersVisible]);

  const handleApply = () => {
    if (tempFilters.dateFrom && tempFilters.dateTo) {
      if (tempFilters.dateFrom > tempFilters.dateTo) {
        toast.error("From date cannot be after To date");
        return;
      }
    }
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

  const set = (patch: Partial<PayinWalletFiltersType>) =>
    setTempFilters({ ...tempFilters, ...patch });

  const adminFields = (
    <div className="grid grid-cols-2 gap-3">
      {/* Row 1: Transaction Type | Merchant */}
      <div className="space-y-1">
        <label className={LABEL}>Transaction Type</label>
        <select
          value={tempFilters.type}
          onChange={(e) => set({ type: e.target.value })}
          className={INPUT}
        >
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className={LABEL}>Merchant</label>
        <select
          value={tempFilters.merchantId}
          onChange={(e) => set({ merchantId: e.target.value })}
          className={INPUT}
        >
          <option value="">All Merchants</option>
          {merchants.map((m: any) => (
            <option key={m.id} value={m.id}>
              {m.merchantName || m.name || m.email}
            </option>
          ))}
        </select>
      </div>

      {/* Row 2: Transaction ID | Reference ID */}
      <div className="space-y-1">
        <label className={LABEL}>Transaction ID</label>
        <input
          placeholder="Enter Transaction ID"
          value={tempFilters.transactionId}
          onChange={(e) => set({ transactionId: e.target.value })}
          className={INPUT}
        />
      </div>

      <div className="space-y-1">
        <label className={LABEL}>Reference ID</label>
        <input
          placeholder="Search by Reference ID..."
          value={tempFilters.referenceId}
          onChange={(e) => set({ referenceId: e.target.value })}
          className={INPUT}
        />
      </div>

      {/* Row 3: Amount Range | Date Range */}
      <div className="space-y-1">
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

      <div className="space-y-1">
        <label className={LABEL}>Date Range</label>
        <div className="flex gap-2">
          <DatePicker
            value={tempFilters.dateFrom ?? null}
            placeholder="From date"
            onChange={(d) => set({ dateFrom: d ? startOfDay(d) : null })}
          />
          <DatePicker
            value={tempFilters.dateTo ?? null}
            placeholder="To date"
            align="right"
            onChange={(d) => set({ dateTo: d ? endOfDay(d) : null })}
          />
        </div>
      </div>
    </div>
  );

  const userFields = (
    <div className="space-y-3">
      {/* Row 1 — 3 equal columns */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className={LABEL}>Transaction Type</label>
          <select
            value={tempFilters.type}
            onChange={(e) => set({ type: e.target.value })}
            className={INPUT}
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className={LABEL}>Transaction ID</label>
          <input
            placeholder="Enter Transaction ID"
            value={tempFilters.transactionId}
            onChange={(e) => set({ transactionId: e.target.value })}
            className={INPUT}
          />
        </div>

        <div className="space-y-1">
          <label className={LABEL}>Reference ID</label>
          <input
            placeholder="Search by Reference ID..."
            value={tempFilters.referenceId}
            onChange={(e) => set({ referenceId: e.target.value })}
            className={INPUT}
          />
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
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

        <div className="space-y-1">
          <label className={LABEL}>Date Range</label>
          <div className="flex gap-2">
            <DatePicker
              value={tempFilters.dateFrom ?? null}
              placeholder="From"
              onChange={(d) => set({ dateFrom: d ? startOfDay(d) : null })}
            />
            <DatePicker
              value={tempFilters.dateTo ?? null}
              placeholder="To"
              align="right"
              onChange={(d) => set({ dateTo: d ? endOfDay(d) : null })}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={filterRef}
      className="bg-white rounded-lg shadow-xl border border-slate-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4">
        {loadingOptions ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
          </div>
        ) : isAdmin ? (
          adminFields
        ) : (
          userFields
        )}
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
