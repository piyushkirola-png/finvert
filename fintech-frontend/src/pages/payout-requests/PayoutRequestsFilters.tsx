import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { usePayoutRequestFilterOptions } from "../../api/queries/usePayoutRequests";
import DatePicker from "../../components/ui/DatePicker";
import { INPUT, LABEL } from "../../lib/styles";

export interface PayoutFilters {
  status: string;
  gatewayName: string;
  merchantId: string;
  userId: string;
  search: string;
  utr?: string;
  paymentMode: string;
  feeType: string;
  amountMin: string;
  amountMax: string;
  dateFrom: Date | null;
  dateTo: Date | null;
}

interface Props {
  filters: PayoutFilters;
  onApply: (filters: PayoutFilters) => void;
  onClear: () => void;
  isOpen: boolean;
  onClose: () => void;
  onGatewaysLoaded?: (gateways: any[]) => void;
  isAdmin?: boolean;
}

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const statusOptions = ["All", "COMPLETED", "PENDING", "FAILED"];
const paymentModeOptions = ["All", "BANK", "UPI", "NEFT", "RTGS", "IMPS"];
const feeTypeOptions = ["All", "FIXED", "PERCENTAGE"];

export default function PayoutRequestFilter({
  filters,
  onApply,
  onClear,
  isOpen,
  onClose,
  onGatewaysLoaded,
  isAdmin = true,
}: Props) {
  const [tempFilters, setTempFilters] = useState<PayoutFilters>(filters);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: filterOptions, isLoading: loadingOptions } =
    usePayoutRequestFilterOptions();

  useEffect(() => {
    if (filterOptions?.gateways && onGatewaysLoaded) {
      onGatewaysLoaded(filterOptions.gateways);
    }
  }, [filterOptions?.gateways, onGatewaysLoaded]);

  // sync the draft with applied filters every time the panel opens
  useEffect(() => {
    if (isOpen) setTempFilters(filters);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("[data-filter-toggle]")) return;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const merchants = filterOptions?.merchants || [];
  const users = filterOptions?.users || [];
  const gateways = filterOptions?.gateways || [];

  const handleApply = () => {
    onApply(tempFilters);
    onClose();
    toast.success("Filter applied");
  };

  const handleClear = () => {
    setTempFilters({
      status: "All",
      gatewayName: "All",
      merchantId: "",
      userId: "",
      search: "",
      utr: "",
      paymentMode: "All",
      feeType: "All",
      amountMin: "",
      amountMax: "",
      dateFrom: null,
      dateTo: null,
    });
    onClear();
    onClose();
    toast.success("Filters cleared");
  };

  if (!isOpen) return null;

  const set = (patch: Partial<PayoutFilters>) =>
    setTempFilters({ ...tempFilters, ...patch });

  // admin: 6-col grid (3 per row = span 2, 2 per row = span 3); user: 2-col
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

  const modeField = (
    <div className={`space-y-1 ${span3}`}>
      <label className={LABEL}>Payment Mode</label>
      <select
        value={tempFilters.paymentMode}
        onChange={(e) => set({ paymentMode: e.target.value })}
        className={INPUT}
      >
        {paymentModeOptions.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );

  const feeTypeField = (
    <div className={`space-y-1 ${span3}`}>
      <label className={LABEL}>Fee Type</label>
      <select
        value={tempFilters.feeType}
        onChange={(e) => set({ feeType: e.target.value })}
        className={INPUT}
      >
        {feeTypeOptions.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );

  const referenceField = (
    <div className={`space-y-1 ${span2}`}>
      <label className={LABEL}>Merchant Reference</label>
      <input
        placeholder="Search by reference..."
        value={tempFilters.search}
        onChange={(e) => set({ search: e.target.value })}
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
          value={tempFilters.amountMin}
          onChange={(e) => set({ amountMin: e.target.value })}
          className={INPUT}
        />
        <input
          type="number"
          placeholder="Max"
          value={tempFilters.amountMax}
          onChange={(e) => set({ amountMax: e.target.value })}
          className={INPUT}
        />
      </div>
    </div>
  );

  const dateField = (
    <div className={`space-y-1 ${span2}`}>
      <label className={LABEL}>Date Range</label>
      <div className="flex gap-2">
        <DatePicker
          value={tempFilters.dateFrom}
          placeholder="From date"
          onChange={(d) => set({ dateFrom: d ? startOfDay(d) : null })}
        />
        <DatePicker
          value={tempFilters.dateTo}
          placeholder="To date"
          align="right"
          onChange={(d) => set({ dateTo: d ? endOfDay(d) : null })}
        />
      </div>
    </div>
  );

  return (
    <div
      ref={wrapperRef}
      className="bg-white rounded-lg shadow-xl border border-slate-200"
    >
      <div className="p-4">
        {loadingOptions ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-slate-900"></div>
          </div>
        ) : isAdmin ? (
          <div className={gridCls}>
            {statusField}
            {modeField}
            {feeTypeField}

            <div className="space-y-1 col-span-2">
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
            <div className="space-y-1 col-span-2">
              <label className={LABEL}>User</label>
              <select
                value={tempFilters.userId}
                onChange={(e) => set({ userId: e.target.value })}
                className={INPUT}
              >
                <option value="">All Users</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.name || u.email}
                  </option>
                ))}
              </select>
            </div>

            {referenceField}
            <div className="space-y-1 col-span-3">
              <label className={LABEL}>UTR</label>
              <input
                placeholder="Search by UTR..."
                value={tempFilters.utr || ""}
                onChange={(e) => set({ utr: e.target.value })}
                className={INPUT}
              />
            </div>

            {amountField}
            {dateField}
          </div>
        ) : (
          <div className={gridCls}>
            {statusField}
            {modeField}
            {referenceField}
            {feeTypeField}
            {amountField}
            {dateField}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50 rounded-b-lg">
        <button
          onClick={onClose}
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
  );
}
