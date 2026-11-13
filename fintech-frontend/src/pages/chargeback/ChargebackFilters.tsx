import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  useMerchantsForFilters,
  useGatewaysForFilters,
} from "../../api/queries/useChargebacks";
import DatePicker from "../../components/ui/DatePicker";
import type { ChargebackFilters } from "../../types/chargeback";
import { INPUT, LABEL } from "../../lib/styles";

interface Props {
  filters: ChargebackFilters;
  setFilters: (filters: ChargebackFilters) => void;
  isFiltersVisible: boolean;
  setIsFiltersVisible: (val: boolean) => void;
  onGatewaysLoaded?: (gateways: any[]) => void;
  isAdmin?: boolean;
}

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const statusOptions = ["All", "APPROVED", "REJECTED", "DISPUTED", "REVERSED"];
const reasonOptions = [
  "All",
  "FRAUDULENT",
  "DUPLICATE",
  "PRODUCT_NOT_RECEIVED",
  "SERVICE_NOT_PROVIDED",
  "UNAUTHORIZED",
  "TECHNICAL_ISSUE",
  "CUSTOMER_DISPUTE",
  "CANCELLED",
  "OTHER",
];

const EMPTY: ChargebackFilters = {
  status: "All",
  merchantId: "",
  gatewayName: "All",
  payInRequestId: "",
  reason: "All",
  amountMin: "",
  amountMax: "",
  dateFrom: null,
  dateTo: null,
};

export default function ChargebackFiltersPanel({
  filters,
  setFilters,
  isFiltersVisible,
  setIsFiltersVisible,
  onGatewaysLoaded,
  isAdmin = true,
}: Props) {
  const [tempFilters, setTempFilters] = useState<ChargebackFilters>(filters);
  const filterRef = useRef<HTMLDivElement>(null);
  const { data: merchants = [] } = useMerchantsForFilters();
  const { data: gateways = [] } = useGatewaysForFilters();

  useEffect(() => {
    if (gateways.length > 0 && onGatewaysLoaded) onGatewaysLoaded(gateways);
  }, [gateways]);

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

  const set = (patch: Partial<ChargebackFilters>) =>
    setTempFilters({ ...tempFilters, ...patch });

  const gridCls = isAdmin ? "grid grid-cols-6 gap-3" : "grid grid-cols-2 gap-3";
  const span3 = isAdmin ? "col-span-2" : "";
  const span2 = isAdmin ? "col-span-3" : "";

  const statusField = (
    <div className={`space-y-1 ${span3}`}>
      <label className={LABEL}>Status</label>
      <select
        value={tempFilters.status}
        onChange={(e) => set({ status: e.target.value })}
        className={INPUT}
      >
        {statusOptions.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );

  const reasonField = (
    <div className={`space-y-1 ${span3}`}>
      <label className={LABEL}>Reason</label>
      <select
        value={tempFilters.reason}
        onChange={(e) => set({ reason: e.target.value })}
        className={INPUT}
      >
        {reasonOptions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );

  const payInField = (
    <div className={`space-y-1 ${span2}`}>
      <label className={LABEL}>PayIn Request ID</label>
      <input
        type="number"
        placeholder="Enter PayIn ID"
        value={tempFilters.payInRequestId}
        onChange={(e) => set({ payInRequestId: e.target.value })}
        className={INPUT}
      />
    </div>
  );

  const amountField = (
    <div className={`space-y-1 ${span2}`}>
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
  );

  const dateField = (
    <div className={`space-y-1 ${span2}`}>
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
  );

  return (
    <div
      ref={filterRef}
      className="bg-white rounded-lg shadow-xl border border-slate-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4">
        {isAdmin ? (
          <div className={gridCls}>
            {/* Row 1 */}
            {statusField}
            {reasonField}
            <div className="space-y-1 col-span-2">
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

            {/* Row 2 */}
            <div className="space-y-1 col-span-3">
              <label className={LABEL}>Gateway</label>
              <select
                value={tempFilters.gatewayName}
                onChange={(e) => set({ gatewayName: e.target.value })}
                className={INPUT}
              >
                <option value="All">All Gateways</option>
                {gateways.map((g: any) => {
                  const name =
                    g.gateway_name ||
                    g.name ||
                    g.gatewayName ||
                    `Gateway ${g.id}`;
                  return (
                    <option key={g.id} value={name}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>
            {payInField}

            {/* Row 3 */}
            {amountField}
            {dateField}
          </div>
        ) : (
          <div className={gridCls}>
            {statusField}
            {reasonField}
            {payInField}
            {amountField}
            <div className="col-span-2 space-y-1">
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
